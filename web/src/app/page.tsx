"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/helpem-logo.png" alt="helpem" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gray-900">helpem</span>
          </div>
          <Link
            href="/app"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-lg">
              <img src="/helpem-logo.png" alt="helpem" className="h-16 w-auto" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Life&apos;s busy enough.
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Let helpem remember everything for you.
          </p>

          {/* Auth Buttons */}
          <div className="space-y-4">
            {/* Sign In - Quick path to app */}
            <Link
              href="/app"
              className="block w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Sign In
            </Link>

            {/* Sign Up - New user journey */}
            <Link
              href="/signup"
              className="block w-full py-4 px-6 bg-white text-gray-900 font-semibold text-lg rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              Create Account
            </Link>
          </div>

          {/* Subtext */}
          <p className="mt-8 text-sm text-gray-500">
            Free to start. No credit card required.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="space-x-6 text-sm text-gray-500">
          <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
          <a href="mailto:support@helpem.ai" className="hover:text-gray-900">Support</a>
          <a href="/privacy" className="hover:text-gray-900">Privacy</a>
          <a href="/terms" className="hover:text-gray-900">Terms</a>
        </div>
        <p className="mt-4 text-xs text-gray-400">© 2026 helpem. All rights reserved.</p>
      </footer>
    </div>
  );
}
