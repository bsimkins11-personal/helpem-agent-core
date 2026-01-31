"use client";

import Link from "next/link";
import { TrialOfferCard } from "@/components/TrialOfferCard";
import { PricingPreview } from "@/components/PricingPreview";

const VALUE_PROPS = [
  { icon: "🤖", title: "AI Life Assistant", desc: "Smart categorization and helpful responses" },
  { icon: "✅", title: "Manage Everything", desc: "Todos, appointments, habits, groceries" },
  { icon: "👥", title: "Coordinate Together", desc: "Share and sync with your tribe" },
  { icon: "🎙️", title: "Voice or Text", desc: "Speak naturally or type—your choice" },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/helpem-logo.png" alt="helpem" className="h-8 w-auto" />
            <span className="text-lg font-bold text-gray-900">helpem</span>
          </Link>
          <Link href="/app/signin" className="text-blue-600 font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </header>

      {/* Sticky CTA for mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <Link
          href="/app/onboarding"
          className="block w-full py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white text-center rounded-xl font-bold text-lg shadow-lg"
        >
          Get Started Free
        </Link>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32 md:pb-8">
        {/* Hero */}
        <section className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">helpem</span>
          </h1>
          <p className="text-lg text-gray-600">
            Your AI-powered life assistant that never forgets.
          </p>
        </section>

        {/* Trial Offer */}
        <section className="mb-10">
          <TrialOfferCard
            onGetStarted={() => window.location.href = "/app/onboarding"}
            buttonText="Get Started Free"
          />
        </section>

        {/* What is helpem? */}
        <section className="mb-10">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
            What can helpem do for you?
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

        {/* Pricing Preview */}
        <div className="mb-10">
          <PricingPreview />
        </div>

        {/* Desktop CTA */}
        <section className="hidden md:block">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to get organized?</h3>
            <p className="text-gray-600 mb-6">Start your 30-day free trial with Sign In with Apple.</p>
            <Link
              href="/app/onboarding"
              className="inline-block px-10 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Sign In with Apple
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Already have an account? <Link href="/app/signin" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center border-t border-gray-100">
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
