import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.jsx";
import { getSignerAndContract, toRawUsdc, getTotalLocked } from "../services/contract.js";
import * as api from "../services/api.js";
import BufferPreview from "../components/BufferPreview.jsx";

export default function CreateTab() {
  const navigate = useNavigate();
  const { address, isCorrectNetwork, connect, switchToArc } = useWallet();

  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [foodEstimate, setFoodEstimate] = useState("");
  const [status, setStatus] = useState(null); // null | string
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Tab name is required.");
    if (!organizerName.trim()) return setError("Your display name is required.");
    if (!foodEstimate || parseFloat(foodEstimate) < 1) return setError("Food estimate must be at least $1.00.");

    setLoading(true);
    try {
      const rawEstimate = toRawUsdc(foodEstimate);
      const totalLocked = getTotalLocked(rawEstimate);

      const { tablock, usdc, signer } = await getSignerAndContract();
      const signerAddress = await signer.getAddress();
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

      // Check and approve USDC
      const allowance = await usdc.allowance(signerAddress, contractAddress);
      if (BigInt(allowance) < BigInt(totalLocked)) {
        setStatus("Approving USDC…");
        const approveTx = await usdc.approve(contractAddress, totalLocked);
        await approveTx.wait();
      }

      setStatus("Creating tab…");
      const tx = await tablock.createTab(name.trim(), organizerName.trim(), rawEstimate);
      const receipt = await tx.wait();

      setStatus("Saving to server…");
      const tabDoc = await api.createTab(receipt.hash, signerAddress.toLowerCase(), null);

      navigate(`/tab/${tabDoc.shareCode}`);
    } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setError("Transaction cancelled.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  if (!address) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Create a Tab</h1>
        <p className="text-gray-400 mb-6">Connect your wallet to create a new tab.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Wrong Network</h1>
        <p className="text-gray-400 mb-6">Please switch to Arc Testnet to continue.</p>
        <button onClick={switchToArc} className="btn-primary">Switch to Arc Testnet</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Create a Tab</h1>
      <p className="text-gray-400 mb-8">Set up a group bill commitment. Share the code so others can lock their share.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Tab name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dinner at Tony's"
            maxLength={50}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Your display name</label>
          <input
            type="text"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="e.g. Alice"
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
              value={foodEstimate}
              onChange={(e) => setFoodEstimate(e.target.value)}
              placeholder="30.00"
              className="input-field pl-8"
            />
          </div>
        </div>

        <BufferPreview foodDollars={foodEstimate} />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {status && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <span className="animate-spin">⟳</span> {status}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? status || "Processing…" : "Create Tab and Lock Funds"}
        </button>
      </form>
    </div>
  );
}
