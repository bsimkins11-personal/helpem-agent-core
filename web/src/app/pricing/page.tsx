"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free",
      tagline: "Perfect for trying HelpEm",
      price: { monthly: 0, annual: 0 },
      features: [
        "50 tasks per month",
        "10 appointments per month",
        "5 routines",
        "Basic grocery lists",
        "Voice input (iOS app)",
        "Web access",
        "Email support"
      ],
      limitations: [
        "No priority support",
        "Standard response time",
        "Single device sync"
      ],
      cta: "Start Free",
      href: "/app",
      popular: false,
      color: "gray"
    },
    {
      name: "Basic",
      tagline: "For busy individuals",
      price: { monthly: 4.99, annual: 50 },
      features: [
        "500 tasks per month",
        "Unlimited appointments",
        "Unlimited routines",
        "Advanced grocery lists",
        "Voice input (iOS app)",
        "Web + mobile sync",
        "Calendar integration",
        "Smart notifications",
        "Priority email support",
        "Export data"
      ],
      limitations: [],
      cta: "Start Basic",
      href: "/app",
      popular: true,
      color: "blue"
    },
    {
      name: "Premium",
      tagline: "For power users & teams",
      price: { monthly: 9.99, annual: 100 },
      features: [
        "Unlimited everything",
        "All Basic features",
        "Team collaboration (up to 5)",
        "Shared grocery lists",
        "Shared appointments",
        "Advanced analytics",
        "Custom categories",
        "API access",
        "Priority chat support",
        "Phone support",
        "Early access to new features",
        "Custom integrations"
      ],
      limitations: [],
      cta: "Start Premium",
      href: "/app",
      popular: false,
      color: "green"
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.price.monthly === 0) return "Free";
    const price = billingPeriod === "monthly" ? plan.price.monthly : plan.price.annual;
    const period = billingPeriod === "monthly" ? "/mo" : "/yr";
    return `$${price}${period}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.price.monthly === 0) return null;
    if (billingPeriod === "annual") {
      const monthlyCost = plan.price.monthly * 12;
      const savings = monthlyCost - plan.price.annual;
      return `Save $${savings}/year`;
    }
    return null;
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-4 pb-6 sm:pt-6 sm:pb-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-brandText mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-brandTextLight max-w-3xl mx-auto mb-10">
            Choose the plan that fits your life. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-full p-2 shadow-sm border border-gray-200">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-brandBlue to-brandGreen text-white"
                  : "text-brandTextLight hover:text-brandText"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                billingPeriod === "annual"
                  ? "bg-gradient-to-r from-brandBlue to-brandGreen text-white"
                  : "text-brandTextLight hover:text-brandText"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pt-8 sm:pt-12 pb-16 sm:pb-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-8 shadow-lg border-2 transition-all hover:shadow-2xl ${
                  plan.popular
                    ? "border-brandBlue scale-105 md:scale-110"
                    : "border-gray-200 hover:border-brandBlue/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-brandBlue to-brandGreen text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-brandText mb-2">{plan.name}</h3>
                  <p className="text-sm text-brandTextLight mb-4">{plan.tagline}</p>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-brandText">{getPrice(plan)}</span>
                  </div>
                  {getSavings(plan) && (
                    <p className="text-sm text-green-600 font-semibold">{getSavings(plan)}</p>
                  )}
                </div>

                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-base mb-6 transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-brandBlue to-brandGreen text-white hover:shadow-xl"
                      : "border-2 border-brandBlue text-brandBlue hover:bg-brandBlue hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-brandTextLight font-semibold mb-3">
                      What's Included
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-brandGreen flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-sm text-brandText">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, limitIndex) => (
                          <li key={limitIndex} className="flex items-start gap-3">
                            <svg
                              className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="text-sm text-gray-400">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-brandText text-center mb-12">
            Pricing Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-brandText mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-brandTextLight">
                Yes! Upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any charges.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-brandText mb-2">
                What happens if I exceed my limits on Free?
              </h3>
              <p className="text-brandTextLight">
                We'll notify you when you're approaching your limits. You can upgrade to continue using HelpEm or wait until next month when limits reset.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-brandText mb-2">
                Is there a team discount?
              </h3>
              <p className="text-brandTextLight">
                Premium includes team features for up to 5 people. Need more? Contact us for custom enterprise pricing.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-brandText mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-brandTextLight">
                We accept all major credit cards (Visa, Mastercard, Amex) and Apple Pay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-brandBlue to-brandGreen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            Still not sure? Try it free!
          </h2>
          <p className="text-lg sm:text-xl mb-10 text-white/90">
            Start with our Free plan. No credit card required. Upgrade when you're ready.
          </p>
          <Link
            href="/app"
            className="inline-block px-8 py-4 rounded-xl bg-white text-brandBlue font-semibold text-lg hover:shadow-2xl transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
