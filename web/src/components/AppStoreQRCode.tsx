"use client";

import { QRCodeSVG } from "qrcode.react";

const WEB_ONBOARDING_URL = "https://helpem.ai/app/onboarding";

interface AppStoreQRCodeProps {
  size?: number;
  referralCode?: string;
}

export function AppStoreQRCode({ size = 160, referralCode }: AppStoreQRCodeProps) {
  const qrValue = referralCode
    ? `${WEB_ONBOARDING_URL}?ref=${encodeURIComponent(referralCode)}`
    : WEB_ONBOARDING_URL;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">Scan to get started</p>
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
