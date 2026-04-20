import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.jsx";

export default function Navbar() {
  const { address, usdcBalance, isCorrectNetwork, loading, connect, switchToArc } = useWallet();

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-white font-bold text-lg tracking-tight">
            Tab<span className="text-green-400">Lock</span>
          </Link>
          <Link to="/create" className="text-gray-400 hover:text-white text-sm transition-colors">
            Create Tab
          </Link>
          {address && (
            <Link to="/my-tabs" className="text-gray-400 hover:text-white text-sm transition-colors">
              My Tabs
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!address ? (
            <button
              onClick={connect}
              disabled={loading}
              className="btn-primary text-sm px-4 py-2"
            >
              {loading ? "Connecting…" : "Connect Wallet"}
            </button>
          ) : !isCorrectNetwork ? (
            <button
              onClick={switchToArc}
              className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-500/30 transition-colors"
            >
              Switch to Arc
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">
                <span className="text-green-400 font-semibold">${usdcBalance}</span>{" "}
                <span className="text-gray-500">USDC</span>
              </span>
              <span className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg text-sm text-gray-300 font-mono">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
