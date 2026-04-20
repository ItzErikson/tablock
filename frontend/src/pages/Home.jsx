import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [shareCode, setShareCode] = useState("");

  function handleJoin(e) {
    e.preventDefault();
    const code = shareCode.trim().toUpperCase();
    if (code) navigate(`/tab/${code}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Tab<span className="text-green-400">Lock</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mx-auto">
          Lock your share before the bill arrives. Settle instantly.
        </p>
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-5 mb-16">
        <button
          onClick={() => navigate("/create")}
          className="card hover:border-green-500/50 transition-all text-left group cursor-pointer"
        >
          <div className="text-3xl mb-3">🍽️</div>
          <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-green-400 transition-colors">
            Create a Tab
          </h2>
          <p className="text-gray-500 text-sm">
            Start a new group bill and invite your friends via share code.
          </p>
        </button>

        <div className="card">
          <div className="text-3xl mb-3">🔗</div>
          <h2 className="text-lg font-semibold text-white mb-3">Join a Tab</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              placeholder="e.g. SUNNY-TABLE-7"
              className="input-field text-sm flex-1"
            />
            <button type="submit" className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
              Go
            </button>
          </form>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6 text-center">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              step: "1",
              title: "Everyone commits",
              desc: "Each person locks their food estimate as USDC. A 40% buffer covers tax and tip.",
            },
            {
              step: "2",
              title: "Someone pays",
              desc: "One person covers the physical bill. They declare the actual total in the app.",
            },
            {
              step: "3",
              title: "Contract settles",
              desc: "Each person's exact proportional share is sent to the payer. Unused buffer returns to everyone.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="card text-center">
              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {step}
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Arc */}
      <div className="mt-12 card bg-green-500/5 border-green-500/20 text-center">
        <p className="text-gray-400 text-sm">
          Built on <span className="text-green-400 font-semibold">Arc Testnet</span> — USDC is the native gas token,
          so there's no ETH needed. Sub-second finality means settlement is instant.
        </p>
      </div>
    </div>
  );
}
