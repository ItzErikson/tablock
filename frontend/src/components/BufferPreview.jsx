import React from "react";
import { fromRawUsdc, getTotalLocked, toRawUsdc } from "../services/contract.js";

export default function BufferPreview({ foodDollars }) {
  const raw = toRawUsdc(foodDollars || 0);
  const buffer = Math.floor(raw * 0.4);
  const total = raw + buffer;

  if (!foodDollars || isNaN(parseFloat(foodDollars)) || parseFloat(foodDollars) <= 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm space-y-1.5">
      <div className="flex justify-between">
        <span className="text-gray-400">Your food estimate</span>
        <span className="text-white">${parseFloat(foodDollars).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Buffer (tax + tip, 40%)</span>
        <span className="text-yellow-400">+${fromRawUsdc(buffer)}</span>
      </div>
      <div className="border-t border-gray-700 pt-1.5 flex justify-between">
        <span className="text-white font-semibold">Total you will lock</span>
        <span className="text-green-400 font-semibold">${fromRawUsdc(total)}</span>
      </div>
      <p className="text-gray-500 text-xs pt-0.5">
        Unused buffer is returned to you after settlement
      </p>
    </div>
  );
}
