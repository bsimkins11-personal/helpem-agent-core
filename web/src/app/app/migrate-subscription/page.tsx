"use client";

import { useEffect, useState } from "react";
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

export default function MigrateSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
          setSubInfo(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      }
      setLoading(false);
    }
    fetchSubscription();
  }, []);

  const isApple = subInfo?.subscription?.platform === "apple";
  const isActive = subInfo?.subscription?.status === "active";
  const periodEnd = subInfo?.subscription?.currentPeriodEnd
    ? new Date(subInfo.subscription.currentPeriodEnd)
    : null;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isAlreadyStripe = subInfo?.subscription?.platform === "stripe";

  async function handleStripeCheckout() {
    setCheckoutLoading(true);
    try {
      // Default to basic monthly for migration
      const priceId = process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Migrate Your Subscription
        </h1>
        <p className="text-gray-600 mb-8">
          helpem is now a web app. Set up billing through our website to
          continue your subscription after your current App Store period ends.
        </p>

        {/* Already on Stripe */}
        {isAlreadyStripe && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              You&apos;re all set!
            </h2>
            <p className="text-green-700">
              Your subscription is already managed through Stripe. No migration
              needed.
            </p>
            <Link
              href="/app/billing"
              className="inline-block mt-4 px-5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Billing
            </Link>
          </div>
        )}

        {/* Apple subscription — needs migration */}
        {isApple && isActive && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Current App Store Subscription
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {subInfo?.plan || "Basic"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                {periodEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current period ends</span>
                    <span className="font-medium text-gray-900">
                      {periodEnd.toLocaleDateString()} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">
                How to Migrate
              </h2>
              <ol className="space-y-3 text-blue-800 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>
                    <strong>Cancel your App Store subscription</strong> — Go to
                    iPhone Settings &gt; Apple ID &gt; Subscriptions &gt;
                    helpem &gt; Cancel. Your access continues until{" "}
                    {periodEnd?.toLocaleDateString()}.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>
                    <strong>Subscribe through our website</strong> — Click the
                    button below to set up Stripe billing. Your new subscription
                    starts immediately.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>
                    <strong>That&apos;s it!</strong> — You&apos;ll keep all your
                    data, referrals, and history. No interruption to service.
                  </span>
                </li>
              </ol>
            </div>

            <button
              onClick={handleStripeCheckout}
              disabled={checkoutLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {checkoutLoading
                ? "Redirecting to checkout..."
                : "Set Up Stripe Billing"}
            </button>

            <p className="mt-3 text-xs text-gray-500 text-center">
              Your existing App Store subscription will continue until it
              expires. We recommend canceling the App Store renewal to avoid
              double billing.
            </p>
          </>
        )}

        {/* Apple subscription but expired */}
        {isApple && !isActive && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Your App Store subscription has expired
            </h2>
            <p className="text-gray-600 mb-4">
              Subscribe through our website to continue using helpem.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              View Plans &amp; Subscribe
            </Link>
          </div>
        )}

        {/* No subscription at all */}
        {!subInfo?.subscription && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <p className="text-gray-600 mb-4">
              You don&apos;t have an active subscription.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              View Plans &amp; Subscribe
            </Link>
          </div>
        )}

        <div className="mt-8 text-center space-x-6">
          <Link
            href="/app/billing"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Billing Settings
          </Link>
          <Link
            href="/app/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
