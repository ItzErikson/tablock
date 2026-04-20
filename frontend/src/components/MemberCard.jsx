import React from "react";
import { fromRawUsdc } from "../services/contract.js";

export default function MemberCard({
  member,
  isOrganizer,
  currentAddress,
  tabOrganizer,
  tabStatus,
  onRemove,
  onLeave,
}) {
  const isCurrentUser = currentAddress && member.address.toLowerCase() === currentAddress.toLowerCase();
  const isTabOrganizer = member.address.toLowerCase() === tabOrganizer?.toLowerCase();
  const canRemove = isOrganizer && !isTabOrganizer && tabStatus === "OPEN" && !isCurrentUser;
  const canLeave = isCurrentUser && !isTabOrganizer && tabStatus === "OPEN";
  const settled = tabStatus === "SETTLED";

  return (
    <div className={`card relative ${!member.active ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-white truncate">{member.displayName}</span>
            {isTabOrganizer && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Organizer</span>
            )}
            {isCurrentUser && (
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">You</span>
            )}
            {!member.active && (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Removed</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-400">Food estimate</span>
            <span className="text-white">${fromRawUsdc(member.foodEstimate)}</span>
            <span className="text-gray-400">Locked</span>
            <span className="text-green-400">${fromRawUsdc(member.locked)}</span>
            {settled && member.active && (
              <>
                <span className="text-gray-400">Final share</span>
                <span className="text-white">${fromRawUsdc(member.finalShare)}</span>
                <span className="text-gray-400">Returned</span>
                <span className="text-blue-400">${fromRawUsdc(member.returned)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {canRemove && (
            <button
              onClick={() => onRemove(member)}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
          {canLeave && (
            <button
              onClick={() => onLeave(member)}
              className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-400/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Leave Tab
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
