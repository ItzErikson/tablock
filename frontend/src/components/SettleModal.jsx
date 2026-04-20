import React, { useState } from "react";
import { fromRawUsdc, toRawUsdc } from "../services/contract.js";

export default function SettleModal({ tab, onConfirm, onCancel, loading }) {
  const [actualBill, setActualBill] = useState("");

  const actualRaw = toRawUsdc(actualBill || 0);
  const activeMembers = tab.members.filter((m) => m.active);
  const totalFood = activeMembers.reduce((s, m) => s + m.foodEstimate, 0);

  function estimatedShare(member) {
    if (!actualBill || !totalFood || isNaN(parseFloat(actualBill))) return "—";
    const share = (member.foodEstimate * actualRaw) / totalFood;
    const capped = Math.min(share, member.locked);
    return `$${fromRawUsdc(Math.floor(capped))}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-1">Settle the Bill</h3>
        <p className="text-gray-400 text-sm mb-5">
          Enter the actual total you paid (food + tax + tip). The contract will calculate each person's exact share and release funds automatically.
        </p>

        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-1.5">Actual bill total (dollars)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={actualBill}
              onChange={(e) => setActualBill(e.target.value)}
              placeholder="0.00"
              className="input-field pl-8"
            />
          </div>
        </div>

        {actualBill && parseFloat(actualBill) > 0 && (
          <div className="mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">Estimated shares</p>
            <div className="space-y-2">
              {activeMembers.map((m) => (
                <div key={m.address} className="flex justify-between text-sm">
                  <span className="text-gray-300">{m.displayName}</span>
                  <span className="text-white">{estimatedShare(m)}</span>
                </div>
              ))}
            </div>
            {parseFloat(actualBill) > tab.totalFoodEstimate / 1e6 * 1.4 && (
              <p className="text-yellow-500 text-xs mt-3">
                Warning: The bill significantly exceeds estimates. Some locked amounts may not fully cover all shares — the payer absorbs any shortfall.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(actualRaw)}
            disabled={loading || !actualBill || parseFloat(actualBill) <= 0}
            className="btn-primary text-sm px-4 py-2"
          >
            {loading ? "Settling…" : "Settle and Release Funds"}
          </button>
        </div>
      </div>
    </div>
  );
}
