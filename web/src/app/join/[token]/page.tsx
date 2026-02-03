"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { getClientSessionToken } from "@/lib/clientSession";
import { TrialOfferCard } from "@/components/TrialOfferCard";
import { PricingPreview } from "@/components/PricingPreview";

type TribeInfo = {
  id: string;
  name: string;
  memberCount: number;
  inviterName?: string;
};

const VALUE_PROPS = [
  { icon: "🤖", title: "AI Life Assistant", desc: "Smart categorization and helpful responses" },
  { icon: "✅", title: "Manage Everything", desc: "Todos, appointments, habits, groceries" },
  { icon: "👥", title: "Coordinate Together", desc: "Share and sync with your tribe" },
  { icon: "🎙️", title: "Voice or Text", desc: "Speak naturally or type - your choice" },
];

export default function JoinTribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tribe, setTribe] = useState<TribeInfo | null>(null);
  const [joined, setJoined] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Store the invite token for after sign up
    localStorage.setItem("pendingTribeInvite", token);
    console.log("Stored tribe invite token:", token);
    
    const checkAuthAndLoadTribe = async () => {
      const sessionToken = getClientSessionToken();
      setIsAuthenticated(!!sessionToken);

      try {
        const res = await fetch(`/api/tribes/join/${token}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTribe(data.tribe);
        } else {
          setError(data.error || "Invalid invite link");
        }
      } catch {
        setError("Failed to load invite information");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadTribe();
  }, [token]);

  const handleJoin = async () => {
    const sessionToken = getClientSessionToken();
    
    if (!sessionToken) {
      openInApp();
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/tribes/join/${token}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      const data = await res.json();
      if (res.ok) {
        setJoined(true);
      } else {
        setError(data.error || "Failed to join tribe");
      }
    } catch {
      setError("Failed to join tribe. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const openInApp = () => {
    const appUrl = `helpem://join/${token}`;
    const appStoreUrl = "https://apps.apple.com/app/helpem/id6738968880";
    
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = appUrl;
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
      if (!document.hidden) {
        window.location.href = appStoreUrl;
      }
    }, 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid invite)
  if (error && !tribe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="text-center bg-white p-12 rounded-3xl shadow-xl max-w-md">
          <div className="text-6xl mb-6">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={openInApp}
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Open in App
          </button>
        </div>
      </div>
    );
  }

  // Success state (joined)
  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="text-center bg-white p-12 rounded-3xl shadow-xl max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to {tribe?.name}!</h1>
          <p className="text-gray-600 mb-6">You&apos;ve successfully joined the tribe. Your 30-day trial has started!</p>
          <button
            onClick={openInApp}
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Open helpem
          </button>
        </div>
      </div>
    );
  }

  // Main join page - warm, welcoming experience
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Sticky CTA for mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <button
          onClick={isAuthenticated ? handleJoin : openInApp}
          disabled={joining}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-70"
        >
          {joining ? "Joining..." : isAuthenticated ? "Join Tribe" : "Get Started Free"}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 md:pb-8">
        
        {/* Section 1: Welcome Hero */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span>👋</span>
            <span>You&apos;ve been invited!</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">{tribe?.name}</span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-2">
            {tribe?.inviterName ? `${tribe.inviterName} wants you to join their tribe on helpem` : "Your friend wants you to join their tribe on helpem"}
          </p>
          
          <p className="text-gray-400 text-sm">
            {tribe?.memberCount} member{tribe?.memberCount !== 1 ? "s" : ""} already here
          </p>
        </section>

        {/* Section 2: Trial Offer (PROMINENT) */}
        <section className="mb-10">
          <TrialOfferCard
            onGetStarted={isAuthenticated ? handleJoin : openInApp}
            buttonText={joining ? "Joining..." : "Get Started Free"}
            isLoading={joining}
          />
        </section>

        {/* Section 3: What is helpem? */}
        <section className="mb-10">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
            What is helpem?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VALUE_PROPS.map((prop, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">{prop.icon}</div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{prop.title}</h4>
                <p className="text-gray-500 text-xs">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Pricing Preview */}
        <div className="mb-10">
          <PricingPreview showFullPricingLink={false} />
        </div>

        {/* Section 5: Tribe Card & CTA */}
        <section className="hidden md:block">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center text-3xl text-white">
                  👥
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{tribe?.name}</h4>
                  <p className="text-gray-500 text-sm">
                    {tribe?.memberCount} member{tribe?.memberCount !== 1 ? "s" : ""} waiting for you
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={isAuthenticated ? handleJoin : openInApp}
                  disabled={joining}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                >
                  {joining ? "Joining..." : isAuthenticated ? "Join Tribe" : "Open helpem"}
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={openInApp}
                    className="px-6 py-2 text-blue-500 text-sm font-medium hover:underline"
                  >
                    Already have helpem? Open the app
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center text-gray-400 text-sm">
          <p className="mb-2">
            Don&apos;t have the app?{" "}
            <a 
              href="https://apps.apple.com/app/helpem/id6738968880"
              className="text-blue-500 hover:underline"
            >
              Download helpem
            </a>
          </p>
          <p>
            <Link href="/pricing" className="hover:underline">View full pricing</Link>
            {" · "}
            <Link href="/" className="hover:underline">Learn more about helpem</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
