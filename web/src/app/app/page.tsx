"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * App Landing Page - Authentication Gate
 * Shows Sign In / Sign Up options
 * Handles tribe invite tokens for post-signup flow
 */
function AppLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const tribeInvite = searchParams.get("invite") || searchParams.get("token");

  useEffect(() => {
    // Show splash briefly unless we can immediately route to dashboard
    const minimumSplashTime = 800;
    const startTime = Date.now();

    // Check for force_auth parameter to show auth gate even when logged in
    const forceAuth = searchParams.get("force_auth");
    const logout = searchParams.get("logout");

    // Handle logout
    if (logout === "true") {
      // Clear all cookies
      document.cookie.split(";").forEach(c => {
        const name = c.trim().split("=")[0];
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.helpem.ai`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      });
      localStorage.clear();
      sessionStorage.clear();

      // Remove logout param and show auth gate after minimum splash time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minimumSplashTime - elapsed);
      setTimeout(() => {
        window.history.replaceState({}, '', '/app');
        setIsChecking(false);
      }, remaining);
      return;
    }

    // Check if there's a tribe invite token in URL
    if (tribeInvite) {
      localStorage.setItem("pendingTribeInvite", tribeInvite);
    }

    // Check if user is already authenticated (unless force_auth is set)
    if (!forceAuth) {
      const hasSession = document.cookie.includes("session_token");

      if (hasSession) {
        router.push("/app/dashboard");
        return;
      }
    }

    // No session - show auth gate after minimum splash time
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minimumSplashTime - elapsed);
    setTimeout(() => {
      setIsChecking(false);
    }, remaining);
  }, [searchParams, router, tribeInvite]);

  // Show beautiful splash screen while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-400 to-green-500 flex items-center justify-center relative overflow-hidden">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Logo and brand */}
        <div className="text-center relative z-10">
          <div className="w-32 h-32 mx-auto bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 animate-bounce">
            <Image
              src="/helpem-logo.png"
              alt="helpem"
              width={320}
              height={120}
              className="h-20 w-auto"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">helpem</h1>
          <p className="text-white/90 text-lg">Built for you.</p>
        </div>
      </div>
    );
  }

  const handleSignIn = () => {
    // Opens the unified web sign-in flow (Apple/Google/email options)
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
            <Image
              src="/helpem-logo.png"
              alt="helpem"
              width={160}
              height={60}
              className="h-10 w-auto"
              priority
            />
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
              <Image
                src="/helpem-logo.png"
                alt="helpem"
                width={256}
                height={96}
                className="h-16 w-auto"
                priority
              />
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
                    You&apos;ve been invited to a tribe!
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

export default function AppLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <AppLandingContent />
    </Suspense>
  );
}
