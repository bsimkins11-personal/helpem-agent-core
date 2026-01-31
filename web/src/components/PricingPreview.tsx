"use client";

import Link from "next/link";

type PricingTier = {
  name: string;
  price: string;
  period: string;
  interactions: string;
  items: string;
  highlight?: boolean;
  badge?: string;
};

const DEFAULT_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    interactions: "Up to 100",
    items: "3 of each",
    highlight: false,
  },
  {
    name: "Basic",
    price: "$4.99",
    period: "/month",
    interactions: "Up to 3,000",
    items: "20 of each",
    highlight: true,
    badge: "Same as Trial",
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/month",
    interactions: "Up to 7,500",
    items: "Unlimited",
    highlight: false,
  },
];

type PricingPreviewProps = {
  tiers?: PricingTier[];
  showFullPricingLink?: boolean;
  title?: string;
  subtitle?: string;
};

export function PricingPreview({
  tiers = DEFAULT_TIERS,
  showFullPricingLink = true,
  title = "Simple, transparent pricing",
  subtitle = "Choose your plan after your trial ends. Downgrade to Free anytime.",
}: PricingPreviewProps) {
  return (
    <section>
      <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
        {title}
      </h3>
      <p className="text-gray-500 text-center text-sm mb-6">
        {subtitle}
      </p>
      
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((tier, i) => (
          <div 
            key={i} 
            className={`bg-white rounded-2xl p-5 border-2 transition-all ${
              tier.highlight 
                ? "border-blue-500 shadow-lg relative" 
                : "border-gray-100 hover:border-gray-200"
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </span>
              </div>
            )}
            <div className="text-center">
              <h4 className="font-bold text-gray-900 mb-1">{tier.name}</h4>
              <div className="mb-3">
                <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                <span className="text-gray-500 text-sm">{tier.period}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700">{tier.interactions} interactions</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700">{tier.items} items</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showFullPricingLink && (
        <p className="text-center mt-4">
          <Link href="/pricing" className="text-blue-500 text-sm hover:underline">
            View full pricing details →
          </Link>
        </p>
      )}
    </section>
  );
}
