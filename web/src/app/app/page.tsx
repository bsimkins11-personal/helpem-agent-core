"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * App Landing Page - Authentication Gate
 * Shows Sign In / Sign Up options
 * Handles tribe invite tokens for post-signup flow
 */
export default function AppLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tribeInvite, setTribeInvite] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log("🔵 App Landing Page - Rendering");
    console.log("Current URL:", window.location.href);
    console.log("Cookies:", document.cookie);
    
    // Check if there's a tribe invite token in URL
    const inviteToken = searchParams.get("invite") || searchParams.get("token");
    
    if (inviteToken) {
      // Store invite token for after sign up
      localStorage.setItem("pendingTribeInvite", inviteToken);
      setTribeInvite(inviteToken);
      console.log("Stored tribe invite token:", inviteToken);
    }

    // Check if user is already authenticated (has real session, not demo)
    const hasSession = document.cookie.includes("session_token");
    const hasNativeToken = (window as any).__nativeSessionToken;
    
    console.log("Has session cookie?", hasSession);
    console.log("Has native token?", !!hasNativeToken);
    
    if (hasSession || hasNativeToken) {
      console.log("✅ User authenticated, redirecting to dashboard");
      // Already signed in, go to dashboard
      setTimeout(() => {
        router.push("/app/dashboard");
      }, 100);
    } else {
      console.log("❌ No session, showing auth gate");
      setIsChecking(false);
    }
  }, [searchParams, router]);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-2xl mb-4 animate-pulse">
            <img src="/helpem-logo.png" alt="helpem" className="h-16 w-auto" />
          </div>
          <p className="text-gray-600">Loading helpem...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = () => {
    // For iOS: This will trigger native Apple Sign In
    // For web: Will show Apple Sign In web flow
    router.push("/app/signin");
  };

  const handleSignUp = () => {
    // Go to sign up onboarding flow
    router.push("/app/onboarding");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/helpem-logo.png" alt="helpem" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gray-900">helpem</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-2xl mb-6">
              <img src="/helpem-logo.png" alt="helpem" className="h-16 w-auto" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to helpem
            </h1>
            <p className="text-lg text-gray-600">
              Your AI-powered life assistant
            </p>
          </div>

          {/* Tribe Invite Banner */}
          {tribeInvite && (
            <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">👥</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">
                    You've been invited to a tribe!
                  </h3>
                  <p className="text-sm text-purple-700">
                    Sign up to join your tribe and start collaborating.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Options */}
          <div className="space-y-4">
            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02]"
            >
              Sign In
            </button>

            {/* Sign Up Button */}
            <button
              onClick={handleSignUp}
              className="w-full py-4 px-6 bg-white text-gray-900 font-bold text-lg rounded-xl border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all transform hover:scale-[1.02]"
            >
              Create Account
            </button>
          </div>

          {/* Benefits */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Free 30-day trial • 3,000 AI interactions • No credit card required
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>✓ Voice & Text</span>
              <span>✓ Smart AI</span>
              <span>✓ Tribes</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="space-x-6 text-sm text-gray-500">
          <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
          <Link href="/support" className="hover:text-gray-900">Support</Link>
          <a href="/privacy" className="hover:text-gray-900">Privacy</a>
          <a href="/terms" className="hover:text-gray-900">Terms</a>
        </div>
        <p className="mt-4 text-xs text-gray-400">© 2026 helpem. All rights reserved.</p>
      </footer>
    </div>
  );
}
