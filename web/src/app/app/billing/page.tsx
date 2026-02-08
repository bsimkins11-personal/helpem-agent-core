"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getClientSessionToken } from "@/lib/clientSession";

interface SubscriptionInfo {
  subscription: {
    status: string;
    productId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    platform: string;
  } | null;
  plan: string;
}

function BillingContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success === "true") {
      setMessage("Subscription activated! Welcome to helpem.");
    } else if (canceled === "true") {
      setMessage("Checkout was canceled. You can subscribe anytime.");
    }
  }, [success, canceled]);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const token = getClientSessionToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const res = await fetch(`${backendUrl}/stripe/subscription-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setSubInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      }
      setLoading(false);
    }

    fetchSubscription();
  }, [success]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Unable to open billing portal. Please try again.");
        setPortalLoading(false);
      }
    } catch {
      setMessage("Failed to open billing portal.");
      setPortalLoading(false);
    }
  }

  const planName =
    subInfo?.plan === "premium"
      ? "Premium"
      : subInfo?.plan === "basic"
        ? "Basic"
        : "Free";

  const isActive = subInfo?.subscription?.status === "active";
  const periodEnd = subInfo?.subscription?.currentPeriodEnd
    ? new Date(subInfo.subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
        <p className="text-gray-600 mb-8">
          Manage your subscription and billing details.
        </p>

        {/* Status message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              success === "true"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Current Plan */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Plan
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isActive ? "Active" : planName === "Free" ? "Free" : subInfo?.subscription?.status || "None"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900">{planName}</span>
                </div>
                {subInfo?.subscription?.productId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product</span>
                    <span className="font-medium text-gray-900">
                      {subInfo.subscription.productId.includes("premium")
                        ? "Premium"
                        : "Basic"}
                      {subInfo.subscription.productId.includes("annual")
                        ? " (Annual)"
                        : " (Monthly)"}
                    </span>
                  </div>
                )}
                {periodEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {isActive ? "Next billing date" : "Expired"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {periodEnd}
                    </span>
                  </div>
                )}
                {subInfo?.subscription?.platform && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {subInfo.subscription.platform}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {isActive && subInfo?.subscription?.platform === "stripe" && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full py-3 px-6 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                >
                  {portalLoading
                    ? "Opening..."
                    : "Manage Subscription"}
                </button>
              )}

              {isActive && subInfo?.subscription?.platform === "apple" && (
                <div className="space-y-3">
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      helpem is now a web app
                    </p>
                    <p className="text-sm text-amber-700">
                      Your App Store subscription is still active, but we
                      recommend migrating to Stripe billing for the best
                      experience.
                    </p>
                  </div>
                  <Link
                    href="/app/migrate-subscription"
                    className="block w-full py-3 px-6 text-center bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Migrate to Web Billing
                  </Link>
                </div>
              )}

              {!isActive && (
                <Link
                  href="/pricing"
                  className="block w-full py-3 px-6 text-center bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  View Plans &amp; Subscribe
                </Link>
              )}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/app/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
