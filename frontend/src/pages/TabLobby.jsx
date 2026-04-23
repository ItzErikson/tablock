import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.jsx";
import { getSignerAndContract, toRawUsdc, getTotalLocked, fromRawUsdc } from "../services/contract.js";
import * as api from "../services/api.js";
import MemberCard from "../components/MemberCard.jsx";
import BufferPreview from "../components/BufferPreview.jsx";
import SettleModal from "../components/SettleModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import QRDisplay from "../components/QRDisplay.jsx";

const EXPLORER = "https://testnet.arcscan.app";

function StatusBadge({ status }) {
  if (status === "OPEN") return <span className="status-open">Open</span>;
  if (status === "SETTLED") return <span className="status-settled">Settled</span>;
  return <span className="status-cancelled">Cancelled</span>;
}

export default function TabLobby() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { address, isCorrectNetwork, connect, switchToArc } = useWallet();

  const [tab, setTab] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Join form
  const [joinName, setJoinName] = useState("");
  const [joinEstimate, setJoinEstimate] = useState("");
  const [joinStatus, setJoinStatus] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);

  // Modals
  const [settleModal, setSettleModal] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState(null);

  const [cancelModal, setCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [removeModal, setRemoveModal] = useState(null); // member object
  const [removeLoading, setRemoveLoading] = useState(false);

  const [leaveModal, setLeaveModal] = useState(null); // member object
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [txMsg, setTxMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchTab = useCallback(async () => {
    try {
      const data = await api.getTabByCode(shareCode.toUpperCase());
      setTab(data);
      setNotFound(false);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setLoadError(err.message);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchTab();
    const interval = setInterval(fetchTab, 10000);
    return () => clearInterval(interval);
  }, [fetchTab]);

  const pageUrl = window.location.href;

  function copyLink() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isOrganizerWallet = tab && address && tab.organizerAddress.toLowerCase() === address.toLowerCase();
  const activeMembersCount = tab ? tab.members.filter((m) => m.active).length : 0;
  const isMember = tab && address && tab.members.some((m) => m.active && m.address.toLowerCase() === address.toLowerCase());
  const isActiveMember = isMember;

  // --- JOIN ---
  async function handleJoin(e) {
    e.preventDefault();
    setJoinError(null);
    if (!joinName.trim()) return setJoinError("Display name is required.");
    if (!joinEstimate || parseFloat(joinEstimate) < 1) return setJoinError("Food estimate must be at least $1.00.");

    setJoinLoading(true);
    try {
      const rawEstimate = toRawUsdc(joinEstimate);
      const totalLocked = getTotalLocked(rawEstimate);

      const { tablock, usdc, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

      const allowance = await usdc.allowance(signerAddress, contractAddress);
      if (BigInt(allowance) < BigInt(totalLocked)) {
        setJoinStatus("Approving USDC…");
        const approveTx = await usdc.approve(contractAddress, totalLocked);
        await approveTx.wait();
      }

      setJoinStatus("Joining tab…");
      const tx = await tablock.joinTab(tab.onChainTabId, joinName.trim(), rawEstimate);
      const receipt = await tx.wait();

      setJoinStatus("Saving…");
      await api.joinTab(tab.onChainTabId, receipt.hash, signerAddress.toLowerCase(), null);
      await fetchTab();
      setJoinName("");
      setJoinEstimate("");
    } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setJoinError("Transaction cancelled.");
      } else {
        setJoinError(err.message || "Something went wrong.");
      }
    } finally {
      setJoinLoading(false);
      setJoinStatus(null);
    }
  }

  // --- SETTLE ---
  async function handleSettle(actualBillRaw) {
    setSettleError(null);
    setSettleLoading(true);
    try {
      const { tablock, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const tx = await tablock.settleBill(tab.onChainTabId, actualBillRaw);
      const receipt = await tx.wait();
      await api.settleBill(tab.onChainTabId, receipt.hash, signerAddress.toLowerCase(), actualBillRaw);
      await fetchTab();
      setSettleModal(false);
    } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setSettleError("Transaction cancelled.");
      } else {
        setSettleError(err.message || "Settlement failed.");
      }
    } finally {
      setSettleLoading(false);
    }
  }

  // --- CANCEL ---
  async function handleCancel() {
    setCancelLoading(true);
    try {
      const { tablock, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const tx = await tablock.cancelTab(tab.onChainTabId);
      const receipt = await tx.wait();
      await api.cancelTab(tab.onChainTabId, receipt.hash, signerAddress.toLowerCase());
      await fetchTab();
      setCancelModal(false);
    } catch (err) {
      if (err.code !== 4001 && err.code !== "ACTION_REJECTED") {
        setTxMsg({ type: "error", text: err.message || "Cancel failed." });
      }
    } finally {
      setCancelLoading(false);
    }
  }

  // --- REMOVE MEMBER ---
  async function handleRemove() {
    setRemoveLoading(true);
    try {
      const { tablock, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const tx = await tablock.removeMember(tab.onChainTabId, removeModal.address);
      const receipt = await tx.wait();
      await api.removeMember(tab.onChainTabId, receipt.hash, signerAddress.toLowerCase(), removeModal.address);
      await fetchTab();
      setRemoveModal(null);
    } catch (err) {
      if (err.code !== 4001 && err.code !== "ACTION_REJECTED") {
        setTxMsg({ type: "error", text: err.message || "Remove failed." });
      }
      setRemoveModal(null);
    } finally {
      setRemoveLoading(false);
    }
  }

  // --- LEAVE TAB ---
  async function handleLeave() {
    setLeaveLoading(true);
    try {
      const { tablock, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const tx = await tablock.leaveTab(tab.onChainTabId);
      const receipt = await tx.wait();
      await api.leaveTab(tab.onChainTabId, receipt.hash, signerAddress.toLowerCase());
      setLeaveModal(null);
      navigate("/");
    } catch (err) {
      if (err.code !== 4001 && err.code !== "ACTION_REJECTED") {
        setTxMsg({ type: "error", text: err.message || "Leave failed." });
      }
      setLeaveModal(null);
    } finally {
      setLeaveLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-2">Tab not found</h1>
        <p className="text-gray-400">Check your share code and try again.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-gray-500">Loading tab…</div>
      </div>
    );
  }

  const activeMembers = tab.members.filter((m) => m.active);
  const payerMember = tab.payerAddress
    ? tab.members.find((m) => m.address.toLowerCase() === tab.payerAddress.toLowerCase())
    : null;
  const settleTx = tab.txHashes?.[tab.txHashes.length - 1];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{tab.name}</h1>
            <StatusBadge status={tab.status} />
          </div>
          <QRDisplay url={pageUrl} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-gray-400 text-sm">Share code:</span>
            <span className="text-white font-mono font-semibold">{tab.shareCode}</span>
          </div>
          <button
            onClick={copyLink}
            className="bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      {txMsg && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${txMsg.type === "error" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-green-500/10 border border-green-500/30 text-green-400"}`}>
          {txMsg.text}
          <button onClick={() => setTxMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Members */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Members ({activeMembers.length})
        </h2>
        <div className="space-y-3">
          {tab.members.map((m) => (
            <MemberCard
              key={m.address}
              member={m}
              isOrganizer={isOrganizerWallet}
              currentAddress={address}
              tabOrganizer={tab.organizerAddress}
              tabStatus={tab.status}
              onRemove={(member) => setRemoveModal(member)}
              onLeave={(member) => setLeaveModal(member)}
            />
          ))}
        </div>
      </section>

      {/* Totals */}
      <section className="card mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Totals</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total food estimates</span>
            <span className="text-white">${fromRawUsdc(tab.totalFoodEstimate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total locked in escrow</span>
            <span className="text-green-400 font-semibold">${fromRawUsdc(tab.totalLocked)}</span>
          </div>
        </div>
      </section>

      {/* Settlement summary */}
      {tab.status === "SETTLED" && (
        <section className="card border-blue-500/30 bg-blue-500/5 mb-8">
          <h2 className="text-lg font-bold text-white mb-1">Bill settled! 🎉</h2>
          <div className="text-sm space-y-1.5 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Payer</span>
              <span className="text-white">{payerMember?.displayName || tab.payerAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Actual bill total</span>
              <span className="text-white">${fromRawUsdc(tab.actualBillTotal)}</span>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4 space-y-2">
            {activeMembers.map((m) => (
              <div key={m.address} className="flex justify-between text-sm">
                <span className="text-gray-300">{m.displayName}</span>
                <span className="text-gray-400">
                  paid <span className="text-white">${fromRawUsdc(m.finalShare)}</span>{" "}
                  · got back <span className="text-blue-400">${fromRawUsdc(m.locked - m.finalShare)}</span>
                </span>
              </div>
            ))}
          </div>
          {settleTx && (
            <a
              href={`${EXPLORER}/tx/${settleTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-xs text-green-400 hover:text-green-300 underline"
            >
              View settlement on Arc Explorer →
            </a>
          )}
        </section>
      )}

      {tab.status === "CANCELLED" && (
        <section className="card border-red-500/30 bg-red-500/5 mb-8">
          <h2 className="text-lg font-bold text-white mb-1">Tab cancelled</h2>
          <p className="text-gray-400 text-sm">All locked funds have been returned to each member.</p>
        </section>
      )}

      {/* Join section */}
      {tab.status === "OPEN" && !isActiveMember && (
        <section className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Join this tab</h2>

          {!address ? (
            <div>
              <p className="text-gray-400 text-sm mb-3">Connect your wallet to join and lock your share.</p>
              <button onClick={connect} className="btn-primary">Connect Wallet</button>
            </div>
          ) : !isCorrectNetwork ? (
            <div>
              <p className="text-gray-400 text-sm mb-3">Switch to Arc Testnet to join.</p>
              <button onClick={switchToArc} className="btn-primary">Switch to Arc</button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Your display name</label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Bob"
                  maxLength={30}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Your food estimate (dollars)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={joinEstimate}
                    onChange={(e) => setJoinEstimate(e.target.value)}
                    placeholder="20.00"
                    className="input-field pl-8"
                  />
                </div>
              </div>
              <BufferPreview foodDollars={joinEstimate} />
              {joinError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                  {joinError}
                </div>
              )}
              {joinStatus && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <span className="animate-spin">⟳</span> {joinStatus}
                </div>
              )}
              <button type="submit" disabled={joinLoading} className="btn-primary w-full">
                {joinLoading ? joinStatus || "Processing…" : "Join and Lock Funds"}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Member actions */}
      {tab.status === "OPEN" && isActiveMember && (
        <section className="flex flex-wrap gap-3">
          <button
            onClick={() => setSettleModal(true)}
            disabled={activeMembersCount < 2}
            className="btn-primary"
            title={activeMembersCount < 2 ? "Need at least 2 members to settle" : ""}
          >
            I Paid the Bill
          </button>
          {isOrganizerWallet && (
            <button onClick={() => setCancelModal(true)} className="btn-danger">
              Cancel Tab
            </button>
          )}
        </section>
      )}

      {/* Modals */}
      {settleModal && (
        <SettleModal
          tab={tab}
          onConfirm={handleSettle}
          onCancel={() => setSettleModal(false)}
          loading={settleLoading}
        />
      )}
      {settleError && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 rounded-lg px-4 py-3 text-sm max-w-sm z-50">
          {settleError}
          <button onClick={() => setSettleError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {cancelModal && (
        <ConfirmModal
          title="Cancel Tab"
          message="Are you sure? This will return all locked USDC to everyone immediately."
          confirmLabel="Cancel Tab"
          confirmClass="btn-danger"
          onConfirm={handleCancel}
          onCancel={() => setCancelModal(false)}
          loading={cancelLoading}
        />
      )}
      {removeModal && (
        <ConfirmModal
          title={`Remove ${removeModal.displayName}`}
          message={`Remove ${removeModal.displayName} from this tab? Their $${fromRawUsdc(removeModal.locked)} will be returned to them immediately.`}
          confirmLabel="Remove Member"
          confirmClass="btn-danger"
          onConfirm={handleRemove}
          onCancel={() => setRemoveModal(null)}
          loading={removeLoading}
        />
      )}
      {leaveModal && (
        <ConfirmModal
          title="Leave Tab"
          message={`Leave this tab? Your $${fromRawUsdc(leaveModal.locked)} will be returned to you immediately.`}
          confirmLabel="Leave Tab"
          confirmClass="btn-danger"
          onConfirm={handleLeave}
          onCancel={() => setLeaveModal(null)}
          loading={leaveLoading}
        />
      )}
    </div>
  );
}
