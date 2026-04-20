import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.jsx";
import * as api from "../services/api.js";
import { fromRawUsdc } from "../services/contract.js";

function TabCard({ tab, onClick }) {
  const activeCount = tab.members.filter((m) => m.active).length;
  return (
    <button
      onClick={onClick}
      className="card text-left w-full hover:border-gray-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="font-semibold text-white group-hover:text-green-400 transition-colors truncate">
          {tab.name}
        </span>
        <span className={
          tab.status === "OPEN" ? "status-open shrink-0" :
          tab.status === "SETTLED" ? "status-settled shrink-0" :
          "status-cancelled shrink-0"
        }>
          {tab.status.toLowerCase()}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-gray-500">{activeCount} member{activeCount !== 1 ? "s" : ""}</span>
        <span className="text-gray-500">Locked: <span className="text-green-400">${fromRawUsdc(tab.totalLocked)}</span></span>
        <span className="text-gray-500">{new Date(tab.createdAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

export default function MyTabs() {
  const navigate = useNavigate();
  const { address, connect } = useWallet();
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api.getUserTabs(address)
      .then(setTabs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">My Tabs</h1>
        <p className="text-gray-400 mb-6">Connect your wallet to see your tabs.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  const myTabs = tabs.filter((t) => t.organizerAddress.toLowerCase() === address.toLowerCase());
  const joinedTabs = tabs.filter((t) => t.organizerAddress.toLowerCase() !== address.toLowerCase());

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">My Tabs</h1>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && tabs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No tabs yet.</p>
          <button onClick={() => navigate("/create")} className="btn-primary">Create one</button>
        </div>
      )}

      {myTabs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Tabs I Organized
          </h2>
          <div className="space-y-3">
            {myTabs.map((t) => (
              <TabCard key={t._id} tab={t} onClick={() => navigate(`/tab/${t.shareCode}`)} />
            ))}
          </div>
        </section>
      )}

      {joinedTabs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Tabs I Joined
          </h2>
          <div className="space-y-3">
            {joinedTabs.map((t) => (
              <TabCard key={t._id} tab={t} onClick={() => navigate(`/tab/${t.shareCode}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
