"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrialOfferCard } from "@/components/TrialOfferCard";
import { PricingPreview } from "@/components/PricingPreview";

const VALUE_PROPS = [
  { icon: "🤖", title: "AI Life Assistant", desc: "Smart categorization and helpful responses" },
  { icon: "✅", title: "Manage Everything", desc: "Todos, appointments, habits, groceries" },
  { icon: "👥", title: "Coordinate Together", desc: "Share and sync with your tribe" },
  { icon: "🎙️", title: "Voice or Text", desc: "Speak naturally or type—your choice" },
];

const FEATURES = [
  {
    emoji: "🎯",
    title: "Smart Organization",
    description: "AI automatically categorizes your tasks, appointments, and reminders"
  },
  {
    emoji: "👥",
    title: "Tribes",
    description: "Coordinate with family, friends, and teams effortlessly"
  },
  {
    emoji: "🗓️",
    title: "Calendar Integration",
    description: "Sync with Google Calendar and Apple Calendar"
  },
  {
    emoji: "🔔",
    title: "Smart Reminders",
    description: "Get notified at the right time, never miss what matters"
  },
];

/**
 * Onboarding Flow - Shows features and plans before sign up
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const handleGetStarted = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final step - proceed to sign in
      router.push("/app/signin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/helpem-logo.png?v=1" alt="helpem" className="h-8 w-auto" />
            <span className="text-lg font-bold text-gray-900">helpem</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Step {step} of 3</span>
            <Link href="/app" className="text-blue-600 font-medium hover:underline text-sm">
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-gray-200 h-1">
        <div 
          className="bg-gradient-to-r from-blue-500 to-green-500 h-1 transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Sticky CTA for mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <button
          onClick={handleGetStarted}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white text-center rounded-xl font-bold text-lg shadow-lg"
        >
          {step === 3 ? "Sign Up Free" : "Continue"}
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32 md:pb-8">
        {/* Step 1: Welcome & Trial Offer */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <section className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center shadow-xl mb-6">
                <img src="/helpem-logo.png?v=1" alt="helpem" className="h-12 w-auto" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">helpem</span>
              </h1>
              <p className="text-lg text-gray-600">
                Your AI-powered life assistant that never forgets.
              </p>
            </section>

            <section>
              <TrialOfferCard
                onGetStarted={handleGetStarted}
                buttonText="Get Started Free"
              />
            </section>

            <section>
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
          </div>
        )}

        {/* Step 2: Features */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <section className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything you need to stay organized
              </h1>
              <p className="text-lg text-gray-600">
                Powerful features designed to simplify your life
              </p>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              {FEATURES.map((feature, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">{feature.emoji}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </section>

            <section className="text-center">
              <button
                onClick={handleGetStarted}
                className="hidden md:inline-block px-10 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                See Pricing
              </button>
            </section>
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <section className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Simple, transparent pricing
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Start with 30 days free, no credit card required
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 font-medium mb-8">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                30-day free trial • 3,000 AI interactions
              </div>
            </section>

            <PricingPreview />

            <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to get started?</h3>
              <p className="text-gray-600 mb-6">Sign up now and get 30 days free with 3,000 AI interactions.</p>
              <button
                onClick={handleGetStarted}
                className="hidden md:inline-block px-10 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Sign Up Free
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Already have an account? <Link href="/app/signin" className="text-blue-500 hover:underline">Sign in</Link>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
