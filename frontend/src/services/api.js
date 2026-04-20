import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

export const createTab = (txHash, organizerAddress, sessionId) =>
  api.post("/api/tabs", { txHash, organizerAddress, sessionId }).then((r) => r.data);

export const getTabById = (tabId) =>
  api.get(`/api/tabs/${tabId}`).then((r) => r.data);

export const getTabByCode = (shareCode) =>
  api.get(`/api/tabs/code/${shareCode}`).then((r) => r.data);

export const joinTab = (tabId, txHash, memberAddress, sessionId) =>
  api.post(`/api/tabs/${tabId}/join`, { txHash, memberAddress, sessionId }).then((r) => r.data);

export const leaveTab = (tabId, txHash, memberAddress) =>
  api.post(`/api/tabs/${tabId}/leave`, { txHash, memberAddress }).then((r) => r.data);

export const removeMember = (tabId, txHash, organizerAddress, removedAddress) =>
  api.post(`/api/tabs/${tabId}/remove`, { txHash, organizerAddress, removedAddress }).then((r) => r.data);

export const settleBill = (tabId, txHash, payerAddress, actualBillRaw) =>
  api.post(`/api/tabs/${tabId}/settle`, { txHash, payerAddress, actualBillRaw }).then((r) => r.data);

export const cancelTab = (tabId, txHash, organizerAddress) =>
  api.post(`/api/tabs/${tabId}/cancel`, { txHash, organizerAddress }).then((r) => r.data);

export const getUserTabs = (address) =>
  api.get(`/api/tabs/user/${address}`).then((r) => r.data);

export const createSession = (sessionId, walletAddress, displayName) =>
  api.post("/api/sessions", { sessionId, walletAddress, displayName }).then((r) => r.data);

export const getSession = (sessionId) =>
  api.get(`/api/sessions/${sessionId}`).then((r) => r.data);
