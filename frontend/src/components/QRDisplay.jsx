import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRDisplay({ url }) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG value={url} size={120} />
      </div>
      <p className="text-xs text-gray-500">Scan to join</p>
    </div>
  );
}
