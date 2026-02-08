"use client";

import Link from "next/link";

export default function AppOnlyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brandBlue to-brandGreen rounded-3xl flex items-center justify-center shadow-2xl shadow-brandBlue/30">
            <span className="text-5xl">🤝</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          helpem
        </h1>
        
        <p className="text-slate-400 text-lg mb-8">
          Your AI personal assistant
        </p>

        {/* Message */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
          <p className="text-slate-300 leading-relaxed">
            helpem now runs directly in your mobile browser. No App Store install
            required.
          </p>
        </div>

        {/* CTA Button */}
        <div className="space-y-4">
          <Link
            href="/app/onboarding"
            className="block w-full py-4 px-6 bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold rounded-xl shadow-lg shadow-brandBlue/25 hover:shadow-xl hover:shadow-brandBlue/30 transition-all active:scale-[0.98]"
          >
            Start on Web
          </Link>
          
          <p className="text-slate-500 text-sm">
            Works on iPhone and Android browsers.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-slate-600 text-xs">
          Currently in beta testing
        </div>
      </div>
    </div>
  );
}
