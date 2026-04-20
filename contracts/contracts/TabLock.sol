// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
 * TabLock — Group bill commitment contract
 *
 * Calculation examples:
 *
 * Example 1 — Normal case:
 *   Alice commits $30 food → locks $42 (30 × 1.4)
 *   Bob commits $20 food → locks $28 (20 × 1.4)
 *   Carol commits $25 food → locks $35 (25 × 1.4)
 *   Total food: $75, Total locked: $105
 *   Actual bill: $82
 *   Alice share: (30/75) × 82 = $32.80 → returned: $9.20
 *   Bob share:   (20/75) × 82 = $21.87 → returned: $6.13
 *   Carol share: (25/75) × 82 = $27.33 → returned: $7.67
 *   Bob paid the physical bill out of his own pocket:
 *     receives Alice's $32.80 + Carol's $27.33 from contract
 *     receives his own full $28 locked back from contract
 *     total from contract: $88.13. Paid restaurant: $82. Locked: $28.
 *     net cost to Bob: $82 + $28 - $88.13 = $21.87 (his fair share)
 *
 * Example 2 — Someone leaves before settlement:
 *   Carol leaves → gets $35 back. New totals: food $50, locked $70.
 *   Actual bill: $55
 *   Alice: (30/50) × 55 = $33 → returned $9
 *   Bob:   (20/50) × 55 = $22 → returned $6
 *
 * Example 3 — Bill much larger than expected (edge case):
 *   Alice $10 food → locks $14; Bob $10 food → locks $14
 *   Actual bill: $40
 *   Alice share: $20 → capped at $14, returned $0
 *   Bob share:   $20 → capped at $14, returned $0
 *   Payer absorbs any shortfall. Rare with 40% buffer.
 */

contract TabLock is ReentrancyGuard {
    IERC20 public immutable usdc;
    uint256 public nextTabId;

    uint256 public constant BUFFER_PERCENT = 40;
    uint256 public constant MIN_MEMBERS_TO_SETTLE = 2;

    enum TabStatus { OPEN, SETTLED, CANCELLED }

    struct Tab {
        uint256 tabId;
        string name;
        address organizer;
        TabStatus status;
        uint256 actualBillTotal;
        uint256 createdAt;
        uint256 settledAt;
        address payerAddress;
        address[] members;
        uint256 totalFoodEstimate;
        uint256 totalLocked;
    }

    mapping(uint256 => Tab) private tabs;
    mapping(uint256 => mapping(address => string)) private memberNames;
    mapping(uint256 => mapping(address => uint256)) private memberFoodEstimate;
    mapping(uint256 => mapping(address => uint256)) private memberLocked;
    mapping(uint256 => mapping(address => uint256)) private memberFinalShare;
    mapping(uint256 => mapping(address => uint256)) private memberReturned;
    mapping(uint256 => mapping(address => bool)) private memberActive;
    mapping(address => uint256[]) private userTabs;

    event TabCreated(uint256 indexed tabId, address indexed organizer, string name, uint256 foodEstimate, uint256 locked);
    event MemberJoined(uint256 indexed tabId, address indexed member, string displayName, uint256 foodEstimate, uint256 locked);
    event MemberRemoved(uint256 indexed tabId, address indexed member, uint256 refunded);
    event MemberLeft(uint256 indexed tabId, address indexed member, uint256 refunded);
    event BillSettled(uint256 indexed tabId, address indexed payer, uint256 actualBill, uint256 settledAt);
    event TabCancelled(uint256 indexed tabId, address indexed organizer, uint256 cancelledAt);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function createTab(
        string memory name,
        string memory organizerName,
        uint256 foodEstimateRaw
    ) external nonReentrant returns (uint256 tabId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(organizerName).length > 0, "Organizer name required");
        require(foodEstimateRaw > 0, "Food estimate must be > 0");

        uint256 lockedAmount = foodEstimateRaw + (foodEstimateRaw * BUFFER_PERCENT / 100);

        require(usdc.transferFrom(msg.sender, address(this), lockedAmount), "USDC transfer failed");

        tabId = nextTabId++;
        Tab storage tab = tabs[tabId];
        tab.tabId = tabId;
        tab.name = name;
        tab.organizer = msg.sender;
        tab.status = TabStatus.OPEN;
        tab.createdAt = block.timestamp;
        tab.members.push(msg.sender);
        tab.totalFoodEstimate = foodEstimateRaw;
        tab.totalLocked = lockedAmount;

        memberNames[tabId][msg.sender] = organizerName;
        memberFoodEstimate[tabId][msg.sender] = foodEstimateRaw;
        memberLocked[tabId][msg.sender] = lockedAmount;
        memberActive[tabId][msg.sender] = true;

        userTabs[msg.sender].push(tabId);

        emit TabCreated(tabId, msg.sender, name, foodEstimateRaw, lockedAmount);
    }

    function joinTab(
        uint256 tabId,
        string memory displayName,
        uint256 foodEstimateRaw
    ) external nonReentrant {
        Tab storage tab = tabs[tabId];
        require(tab.createdAt > 0, "Tab does not exist");
        require(tab.status == TabStatus.OPEN, "Tab is not open");
        require(bytes(displayName).length > 0, "Display name required");
        require(foodEstimateRaw > 0, "Food estimate must be > 0");
        require(!memberActive[tabId][msg.sender], "Already a member");
        require(msg.sender != tab.organizer || !memberActive[tabId][msg.sender], "Organizer already joined");

        // Check if this address was previously removed (in members array but inactive)
        bool alreadyInArray = false;
        for (uint256 i = 0; i < tab.members.length; i++) {
            if (tab.members[i] == msg.sender) {
                alreadyInArray = true;
                break;
            }
        }
        require(!alreadyInArray, "Address already used in this tab");

        uint256 lockedAmount = foodEstimateRaw + (foodEstimateRaw * BUFFER_PERCENT / 100);

        require(usdc.transferFrom(msg.sender, address(this), lockedAmount), "USDC transfer failed");

        tab.members.push(msg.sender);
        tab.totalFoodEstimate += foodEstimateRaw;
        tab.totalLocked += lockedAmount;

        memberNames[tabId][msg.sender] = displayName;
        memberFoodEstimate[tabId][msg.sender] = foodEstimateRaw;
        memberLocked[tabId][msg.sender] = lockedAmount;
        memberActive[tabId][msg.sender] = true;

        userTabs[msg.sender].push(tabId);

        emit MemberJoined(tabId, msg.sender, displayName, foodEstimateRaw, lockedAmount);
    }

    function removeMember(uint256 tabId, address memberAddress) external nonReentrant {
        Tab storage tab = tabs[tabId];
        require(msg.sender == tab.organizer, "Only organizer");
        require(tab.status == TabStatus.OPEN, "Tab is not open");
        require(memberActive[tabId][memberAddress], "Not an active member");
        require(memberAddress != tab.organizer, "Cannot remove organizer - cancel tab instead");

        uint256 refundAmount = memberLocked[tabId][memberAddress];

        tab.totalFoodEstimate -= memberFoodEstimate[tabId][memberAddress];
        tab.totalLocked -= refundAmount;
        memberActive[tabId][memberAddress] = false;

        require(usdc.transfer(memberAddress, refundAmount), "Refund failed");

        emit MemberRemoved(tabId, memberAddress, refundAmount);
    }

    function leaveTab(uint256 tabId) external nonReentrant {
        Tab storage tab = tabs[tabId];
        require(tab.status == TabStatus.OPEN, "Tab is not open");
        require(memberActive[tabId][msg.sender], "Not an active member");
        require(msg.sender != tab.organizer, "Organizer cannot leave - cancel tab instead");

        uint256 refundAmount = memberLocked[tabId][msg.sender];

        tab.totalFoodEstimate -= memberFoodEstimate[tabId][msg.sender];
        tab.totalLocked -= refundAmount;
        memberActive[tabId][msg.sender] = false;

        require(usdc.transfer(msg.sender, refundAmount), "Refund failed");

        emit MemberLeft(tabId, msg.sender, refundAmount);
    }

    function settleBill(uint256 tabId, uint256 actualBillRaw) external nonReentrant {
        Tab storage tab = tabs[tabId];
        require(tab.status == TabStatus.OPEN, "Tab is not open");
        require(memberActive[tabId][msg.sender], "Not an active member");
        require(actualBillRaw > 0, "Actual bill must be > 0");

        // Count active members
        uint256 activeCount = 0;
        for (uint256 i = 0; i < tab.members.length; i++) {
            if (memberActive[tabId][tab.members[i]]) {
                activeCount++;
            }
        }
        require(activeCount >= MIN_MEMBERS_TO_SETTLE, "Need at least 2 active members");

        address payer = msg.sender;
        uint256 totalFood = tab.totalFoodEstimate;

        tab.status = TabStatus.SETTLED;
        tab.actualBillTotal = actualBillRaw;
        tab.settledAt = block.timestamp;
        tab.payerAddress = payer;

        for (uint256 i = 0; i < tab.members.length; i++) {
            address member = tab.members[i];
            if (!memberActive[tabId][member]) continue;

            uint256 share = (memberFoodEstimate[tabId][member] * actualBillRaw) / totalFood;
            uint256 locked = memberLocked[tabId][member];

            // Cap share at locked amount — payer absorbs any shortfall
            if (share > locked) {
                share = locked;
            }

            memberFinalShare[tabId][member] = share;

            if (member != payer) {
                // Non-payer: their share goes to the payer, their buffer comes back to them
                uint256 returned = locked - share;
                memberReturned[tabId][member] = returned;

                if (share > 0) {
                    require(usdc.transfer(payer, share), "Share transfer failed");
                }
                if (returned > 0) {
                    require(usdc.transfer(member, returned), "Buffer return failed");
                }
            } else {
                // Payer: return their entire locked amount.
                // They already paid the restaurant out-of-pocket; the contract owes
                // them back every USDC they deposited. Their bill share is implicit.
                memberReturned[tabId][member] = locked;

                if (locked > 0) {
                    require(usdc.transfer(payer, locked), "Payer locked return failed");
                }
            }
        }

        emit BillSettled(tabId, payer, actualBillRaw, block.timestamp);
    }

    function cancelTab(uint256 tabId) external nonReentrant {
        Tab storage tab = tabs[tabId];
        require(msg.sender == tab.organizer, "Only organizer");
        require(tab.status == TabStatus.OPEN, "Tab is not open");

        tab.status = TabStatus.CANCELLED;

        for (uint256 i = 0; i < tab.members.length; i++) {
            address member = tab.members[i];
            if (!memberActive[tabId][member]) continue;

            uint256 refund = memberLocked[tabId][member];
            memberActive[tabId][member] = false;

            if (refund > 0) {
                require(usdc.transfer(member, refund), "Cancel refund failed");
            }
        }

        emit TabCancelled(tabId, msg.sender, block.timestamp);
    }

    function getTab(uint256 tabId) external view returns (
        uint256 id,
        string memory name,
        address organizer,
        uint8 status,
        uint256 actualBillTotal,
        uint256 createdAt,
        uint256 settledAt,
        address payerAddress,
        uint256 totalFoodEstimate,
        uint256 totalLocked,
        address[] memory members
    ) {
        Tab storage tab = tabs[tabId];
        require(tab.createdAt > 0, "Tab does not exist");
        return (
            tab.tabId,
            tab.name,
            tab.organizer,
            uint8(tab.status),
            tab.actualBillTotal,
            tab.createdAt,
            tab.settledAt,
            tab.payerAddress,
            tab.totalFoodEstimate,
            tab.totalLocked,
            tab.members
        );
    }

    function getMemberInfo(uint256 tabId, address member) external view returns (
        string memory name,
        uint256 foodEstimate,
        uint256 locked,
        uint256 finalShare,
        uint256 returned,
        bool active
    ) {
        return (
            memberNames[tabId][member],
            memberFoodEstimate[tabId][member],
            memberLocked[tabId][member],
            memberFinalShare[tabId][member],
            memberReturned[tabId][member],
            memberActive[tabId][member]
        );
    }

    function getTabMembers(uint256 tabId) external view returns (address[] memory) {
        require(tabs[tabId].createdAt > 0, "Tab does not exist");
        return tabs[tabId].members;
    }

    function getUserTabs(address user) external view returns (uint256[] memory) {
        return userTabs[user];
    }
}
