"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VALUE_PROPS = [
  { icon: "🤖", title: "AI Life Assistant", desc: "Smart categorization and helpful responses" },
  { icon: "✅", title: "Manage Everything", desc: "Todos, appointments, habits, groceries" },
  { icon: "🗣️", title: "Voice or Text", desc: "Speak naturally or type—your choice" },
  { icon: "⚡", title: "Zero Friction", desc: "Just say it and helpem handles the rest" },
];

export default function ReferralsPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");

    if (code) {
      const normalizedCode = code.toUpperCase();
      const initTimer = window.setTimeout(() => {
        setReferralCode(normalizedCode);
        // Store code for post-signup application.
        localStorage.setItem("pendingReferralCode", normalizedCode);
        setIsLoading(false);
      }, 0);
      return () => {
        window.clearTimeout(initTimer);
      };
    } else {
      // No referral code - redirect to main landing page
      router.replace("/");
    }
  }, [router]);

  const handleGetStarted = () => {
    window.location.href = `/app/onboarding?ref=${referralCode}`;
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const faqs = [
    {
      q: "Where do I enter the referral code?",
      a: "During signup on web, you'll see a referral code field. Enter your 6-digit code there."
    },
    {
      q: "What do I get for using a referral code?",
      a: "When you subscribe to Basic or Premium, you get +1 free month of that tier. So if you subscribe to Premium, you get 2 months of Premium for the price of 1."
    },
    {
      q: "Does my friend who invited me get something too?",
      a: "Yes! When you complete a paid month within 60 days, they earn a free Premium month as a thank you."
    },
    {
      q: "Can I use multiple referral codes?",
      a: "No. Only the first referral code you use is honored. Additional codes are ignored."
    },
    {
      q: "What if I forget to enter the code?",
      a: "You can only enter a referral code during initial signup. If you forget, it can't be applied later."
    },
  ];

  // Show loading while checking for referral code
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // This shouldn't render (redirect happens), but just in case
  if (!referralCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <button
          onClick={handleGetStarted}
          className="w-full py-4 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-xl font-bold text-lg shadow-lg"
        >
          Start Free on Web
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 md:pb-8">

        {/* Hero Section */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span>🎁</span>
            <span>You&apos;ve got a referral code!</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">1 Free Month</span> When You Subscribe
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Subscribe to Basic or Premium with this code and get an extra free month.
          </p>

          {/* Referral Code Display */}
          <div className="inline-flex items-center gap-3 bg-white border-2 border-orange-200 rounded-2xl px-6 py-4 shadow-sm mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Code</p>
              <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">{referralCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Important reminder */}
          <div className="bg-orange-100 border border-orange-300 rounded-xl px-4 py-3 mb-8 max-w-md mx-auto">
            <p className="text-sm text-orange-800 font-medium">
              ⚠️ Remember to enter this code during signup in the app to get your free month!
            </p>
          </div>

          {/* Web CTA - Desktop */}
          <div className="hidden md:flex items-center justify-center gap-8">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg"
            >
              <div className="text-left">
                <div className="text-xs opacity-80">Continue to</div>
                <div className="text-xl font-semibold -mt-1">Web Signup</div>
              </div>
            </button>
          </div>
        </section>

        {/* How Referrals Work */}
        <section className="mb-10">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How Referrals Work</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                <h3 className="font-semibold text-gray-900 mb-1">Start on Web</h3>
                <p className="text-sm text-gray-600">Open helpem in your browser</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                <h3 className="font-semibold text-gray-900 mb-1">Enter Code</h3>
                <p className="text-sm text-gray-600">Use code {referralCode} during signup</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                <h3 className="font-semibold text-gray-900 mb-1">Get Free Month</h3>
                <p className="text-sm text-gray-600">Subscribe and get +1 free month</p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
            What is helpem?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VALUE_PROPS.map((prop, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">{prop.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{prop.title}</h3>
                <p className="text-gray-500 text-xs">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reward Summary Cards */}
        <section className="mb-10">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-3">🎁</div>
              <h3 className="font-bold text-gray-900 mb-2">Your Bonus</h3>
              <p className="text-gray-600 text-sm">Subscribe with code {referralCode} and get +1 free month of your tier (Basic or Premium).</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-3">⭐</div>
              <h3 className="font-bold text-gray-900 mb-2">Your Friend Earns Too</h3>
              <p className="text-gray-600 text-sm">When you complete a paid month, they earn a free Premium month as a thank you.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Frequently Asked Questions</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {faqs.map((faq, index) => (
              <div key={index} className={index !== 0 ? "border-t border-gray-100" : ""}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === index ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === index ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-4 text-gray-600 text-sm">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Web CTA */}
        <section className="hidden md:block text-center mb-10">
          <div className="bg-gradient-to-r from-brandBlue to-brandGreen rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-white/80 mb-6">Start your 30-day free trial in your browser.</p>
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Start Free on Web
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm">
          <p className="mb-2">
            Questions?{" "}
            <a href="mailto:support@helpem.ai" className="text-brandBlue hover:underline">
              support@helpem.ai
            </a>
          </p>
          <p>
            <Link href="/" className="hover:underline">Home</Link>
            {" · "}
            <Link href="/pricing" className="hover:underline">Pricing</Link>
            {" · "}
            <Link href="/support" className="hover:underline">Support</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
