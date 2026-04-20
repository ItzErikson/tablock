const { ethers } = require("ethers");
const Tab = require("../models/Tab");

const TABLOCK_ABI = [
  "function createTab(string name, string organizerName, uint256 foodEstimateRaw) returns (uint256)",
  "function joinTab(uint256 tabId, string displayName, uint256 foodEstimateRaw) external",
  "function removeMember(uint256 tabId, address memberAddress) external",
  "function leaveTab(uint256 tabId) external",
  "function settleBill(uint256 tabId, uint256 actualBillRaw) external",
  "function cancelTab(uint256 tabId) external",
  "function getTab(uint256 tabId) external view returns (uint256 id, string name, address organizer, uint8 status, uint256 actualBillTotal, uint256 createdAt, uint256 settledAt, address payerAddress, uint256 totalFoodEstimate, uint256 totalLocked, address[] members)",
  "function getMemberInfo(uint256 tabId, address member) external view returns (string name, uint256 foodEstimate, uint256 locked, uint256 finalShare, uint256 returned, bool active)",
  "function getTabMembers(uint256 tabId) external view returns (address[])",
  "function getUserTabs(address user) external view returns (uint256[])",
  "event TabCreated(uint256 indexed tabId, address indexed organizer, string name, uint256 foodEstimate, uint256 locked)",
  "event MemberJoined(uint256 indexed tabId, address indexed member, string displayName, uint256 foodEstimate, uint256 locked)",
  "event MemberRemoved(uint256 indexed tabId, address indexed member, uint256 refunded)",
  "event MemberLeft(uint256 indexed tabId, address indexed member, uint256 refunded)",
  "event BillSettled(uint256 indexed tabId, address indexed payer, uint256 actualBill, uint256 settledAt)",
  "event TabCancelled(uint256 indexed tabId, address indexed organizer, uint256 cancelledAt)",
];

let _provider = null;

function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(process.env.ARC_RPC || "https://rpc.testnet.arc.network");
  }
  return _provider;
}

function getContract(withSigner = false) {
  const provider = getProvider();
  const address = process.env.TABLOCK_CONTRACT_ADDRESS;
  if (!address || address === "your_deployed_contract_address") {
    throw new Error("TABLOCK_CONTRACT_ADDRESS not configured in .env");
  }
  return new ethers.Contract(address, TABLOCK_ABI, provider);
}

const STATUS_MAP = ["OPEN", "SETTLED", "CANCELLED"];

async function syncTabFromChain(onChainTabId) {
  const contract = getContract();

  const tabData = await contract.getTab(onChainTabId);
  const members = tabData.members;

  const memberDocs = [];
  for (const memberAddress of members) {
    const info = await contract.getMemberInfo(onChainTabId, memberAddress);
    memberDocs.push({
      address: memberAddress.toLowerCase(),
      displayName: info.name,
      foodEstimate: Number(info.foodEstimate),
      locked: Number(info.locked),
      finalShare: Number(info.finalShare),
      returned: Number(info.returned),
      active: info.active,
    });
  }

  const status = STATUS_MAP[Number(tabData.status)] || "OPEN";
  const settledAtTs = Number(tabData.settledAt);

  const update = {
    onChainTabId,
    name: tabData.name,
    organizerAddress: tabData.organizer.toLowerCase(),
    status,
    actualBillTotal: Number(tabData.actualBillTotal),
    payerAddress: tabData.payerAddress !== ethers.ZeroAddress ? tabData.payerAddress.toLowerCase() : null,
    members: memberDocs,
    totalFoodEstimate: Number(tabData.totalFoodEstimate),
    totalLocked: Number(tabData.totalLocked),
    createdAt: new Date(Number(tabData.createdAt) * 1000),
    settledAt: settledAtTs > 0 ? new Date(settledAtTs * 1000) : null,
  };

  const existing = await Tab.findOne({ onChainTabId });
  if (existing) {
    Object.assign(existing, update);
    await existing.save();
    return existing;
  }

  const doc = new Tab(update);
  await doc.save();
  return doc;
}

module.exports = { getProvider, getContract, syncTabFromChain };
