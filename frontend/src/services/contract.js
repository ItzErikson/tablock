import { ethers } from "ethers";

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

const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export async function getSignerAndContract() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const tablock = new ethers.Contract(import.meta.env.VITE_CONTRACT_ADDRESS, TABLOCK_ABI, signer);
  const usdc = new ethers.Contract(import.meta.env.VITE_USDC_ADDRESS, USDC_ABI, signer);
  return { signer, provider, tablock, usdc };
}

export function getBufferAmount(foodEstimateRaw) {
  return Math.floor(foodEstimateRaw * 0.4);
}

export function getTotalLocked(foodEstimateRaw) {
  return Math.floor(foodEstimateRaw * 1.4);
}

export function toRawUsdc(dollars) {
  return Math.floor(parseFloat(dollars) * 1e6);
}

export function fromRawUsdc(raw) {
  return (Number(raw) / 1e6).toFixed(2);
}
