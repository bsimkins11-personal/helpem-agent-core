"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code?: string;
          };
          user?: {
            name?: { firstName?: string; lastName?: string };
            email?: string;
          };
        }>;
      };
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
        };
      };
    };
  }
}

/**
 * Sign In Page
 * Web OAuth: Apple Sign In + Google Sign In
 */
export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleReady, setAppleReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID;

  // Check if already signed in
  useEffect(() => {
    const hasSession = document.cookie.includes("session_token");
    if (hasSession) {
      const pendingInvite = localStorage.getItem("pendingTribeInvite");
      if (pendingInvite) {
        router.push("/app/dashboard?showInvite=true");
      } else {
        router.push("/app/dashboard");
      }
    }
  }, [router]);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Google sign in failed");
        }

        // Cookie is set by the API route (HttpOnly)
        // Also store in localStorage for client-side checks
        if (data.session_token) {
          localStorage.setItem("helpem_session", data.session_token);
        }

        console.log("Google auth success, redirecting...");
        router.push(
          data.is_new_user ? "/app/onboarding" : "/app/dashboard"
        );
      } catch (err) {
        console.error("Google auth error:", err);
        setError(
          err instanceof Error ? err.message : "Google sign in failed"
        );
        setIsLoading(false);
      }
    },
    [router]
  );

  // Initialize Google button when SDK loads
  useEffect(() => {
    if (!googleReady || !googleClientId || !googleButtonRef.current) return;

    try {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });

      window.google?.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 400,
        text: "signin_with",
        shape: "rectangular",
      });
    } catch (err) {
      console.error("Google SDK init error:", err);
    }
  }, [googleReady, googleClientId, handleGoogleResponse]);

  // Handle Apple Sign In
  async function handleAppleSignIn() {
    if (!window.AppleID || !appleClientId) return;

    setIsLoading(true);
    setError(null);

    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: window.location.origin + "/app/signin",
        usePopup: true,
      });

      const response = await window.AppleID.auth.signIn();
      const idToken = response.authorization.id_token;

      // Decode JWT to extract sub (apple_user_id) - client-side decode only
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      const appleUserId = payload.sub;

      const res = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apple_user_id: appleUserId,
          identity_token: idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Apple sign in failed");
      }

      // Cookie is set by the API route (HttpOnly)
      if (data.session_token) {
        localStorage.setItem("helpem_session", data.session_token);
      }

      console.log("Apple auth success, redirecting...");
      router.push(
        data.is_new_user ? "/app/onboarding" : "/app/dashboard"
      );
    } catch (err: unknown) {
      // User cancelled popup
      if (
        typeof err === "object" &&
        err !== null &&
        "error" in err &&
        (err as { error?: string }).error === "popup_closed_by_user"
      ) {
        setIsLoading(false);
        return;
      }
      console.error("Apple auth error:", err);
      setError(
        err instanceof Error ? err.message : "Apple sign in failed"
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Load Apple Sign In JS SDK */}
      {appleClientId && (
        <Script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          onLoad={() => setAppleReady(true)}
        />
      )}

      {/* Load Google Identity Services */}
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          onLoad={() => setGoogleReady(true)}
        />
      )}

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
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
            <Image
              src="/helpem-logo.png"
              alt="helpem"
              width={256}
              height={96}
              className="h-16 w-auto"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign in to helpem
          </h1>
          <p className="text-gray-600 mb-8">
            Your AI-powered life assistant
          </p>

          {/* Loading overlay */}
          {isLoading && (
            <div className="mb-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Signing you in...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Auth buttons */}
          {!isLoading && (
            <div className="space-y-4">
              {/* Apple Sign In */}
              {appleClientId && (
                <button
                  onClick={handleAppleSignIn}
                  disabled={!appleReady}
                  className="w-full py-4 px-6 bg-black text-white font-semibold rounded-xl shadow-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Sign in with Apple
                </button>
              )}

              {/* Google Sign In */}
              {googleClientId && (
                <div className="flex justify-center">
                  <div
                    ref={googleButtonRef}
                    className={googleReady ? "" : "opacity-50"}
                  />
                  {!googleReady && (
                    <button
                      disabled
                      className="w-full py-4 px-6 bg-white text-gray-700 font-semibold rounded-xl shadow border border-gray-300 flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Loading Google Sign In...
                    </button>
                  )}
                </div>
              )}

              {/* Divider */}
              {!appleClientId && !googleClientId && (
                <p className="text-gray-500 text-sm">
                  Sign in is not configured. Please contact support.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 text-sm text-gray-500">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/app/onboarding"
                className="text-blue-500 hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Privacy note */}
          <p className="mt-6 text-xs text-gray-400">
            Your privacy is protected. We only use your account to
            authenticate you.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="space-x-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-900">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-900">
            Terms
          </Link>
          <Link href="/support" className="hover:text-gray-900">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
