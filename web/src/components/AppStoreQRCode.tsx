"use client";

import { QRCodeSVG } from "qrcode.react";

const APP_STORE_URL = "https://apps.apple.com/app/helpem/id6738968880";

interface AppStoreQRCodeProps {
  size?: number;
  referralCode?: string;
}

export function AppStoreQRCode({ size = 160, referralCode }: AppStoreQRCodeProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <QRCodeSVG
          value={APP_STORE_URL}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">Scan to download</p>
      {referralCode && (
        <div className="mt-3 bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 text-center max-w-[200px]">
          <p className="text-xs text-orange-800 font-medium">
            Enter code <span className="font-mono font-bold">{referralCode}</span> during signup
          </p>
        </div>
      )}
    </div>
  );
}
