import React from "react";

export default function ConfirmModal({ title, message, confirmLabel = "Confirm", confirmClass = "btn-danger", onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`${confirmClass} text-sm px-4 py-2`}>
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
