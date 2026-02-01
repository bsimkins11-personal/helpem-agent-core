"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Sign In Page
 * Handles authentication via Apple Sign In
 * Redirects to dashboard after successful auth
 */
export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already signed in
    const hasSession = document.cookie.includes("session_token");
    if (hasSession) {
      // Check if there's a pending tribe invite
      const pendingInvite = localStorage.getItem("pendingTribeInvite");
      if (pendingInvite) {
        // Redirect to dashboard with invite notification
        router.push("/app/dashboard?showInvite=true");
      } else {
        router.push("/app/dashboard");
      }
      return;
    }

    // Check if running in iOS app
    const isNativeApp = 
      navigator.userAgent.includes("helpem") ||
      (window as any).webkit?.messageHandlers?.native ||
      (window as any).__IS_HELPEM_APP__;

    if (isNativeApp) {
      // Trigger native Apple Sign In
      console.log("📱 Triggering native Apple Sign In");
      
      // Try multiple methods to trigger native auth
      if ((window as any).webkit?.messageHandlers?.signInWithApple) {
        (window as any).webkit.messageHandlers.signInWithApple.postMessage({});
      } else if ((window as any).nativeBridge?.signInWithApple) {
        (window as any).nativeBridge.signInWithApple();
      } else {
        // Fallback: dispatch event that iOS listens for
        window.dispatchEvent(new CustomEvent("requestAppleSignIn"));
      }
    } else {
      // Web flow: Redirect to Apple OAuth or show web sign in
      console.log("🌐 Web Apple Sign In flow");
      // For now, redirect to /api/auth/apple
      // This should trigger Apple's web OAuth flow
      window.location.href = "/api/auth/apple";
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3">
            <img src="/helpem-logo.png?v=1" alt="helpem" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gray-900">helpem</span>
          </Link>
          <Link href="/app" className="text-gray-600 hover:text-gray-900 text-sm">
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
            <img src="/helpem-logo.png?v=1" alt="helpem" className="h-16 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sign in to helpem
          </h1>

          {/* Loading indicator */}
          <div className="mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Connecting to Apple Sign In...
            </p>
          </div>

          {/* Manual trigger button (fallback) */}
          <button
            onClick={() => {
              window.location.href = "/api/auth/apple";
            }}
            className="w-full py-4 px-6 bg-black text-white font-semibold rounded-xl shadow-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Sign in with Apple
          </button>

          <div className="mt-6 text-sm text-gray-500">
            <p>
              Don't have an account?{" "}
              <Link href="/app/onboarding" className="text-blue-500 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* Privacy note */}
          <p className="mt-8 text-xs text-gray-400">
            We never store your Apple email or personal data.
            <br />
            Your privacy is protected.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="space-x-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-900">Terms</Link>
          <Link href="/support" className="hover:text-gray-900">Support</Link>
        </div>
      </footer>
    </div>
  );
}
