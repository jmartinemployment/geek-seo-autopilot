"use client";

import { useState } from "react";
import { CheckCircle2, Zap } from "lucide-react";
import { SignInButton } from "./sign-in-button";

const PLANS = [
  {
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "Perfect for solo creators and small businesses.",
    features: [
      "1 website",
      "20 AI articles/month",
      "100 keyword research credits",
      "WordPress auto-publish",
      "SEO + readability scoring",
      "Content calendar",
      "Email support",
    ],
    highlight: false,
    badge: null,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    annualPrice: 79,
    description: "For growing businesses that need more content.",
    features: [
      "5 websites",
      "100 AI articles/month",
      "Unlimited keyword research",
      "WordPress + Webflow publish",
      "Brand voice training",
      "Audience targeting",
      "Analytics dashboard",
      "Priority support",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Business",
    monthlyPrice: 299,
    annualPrice: 239,
    description: "For agencies and enterprises managing many sites.",
    features: [
      "Unlimited websites",
      "Unlimited AI articles",
      "White-label reports",
      "All CMS integrations",
      "Campaign manager",
      "Knowledge base AI",
      "Team seats (5)",
      "Dedicated support",
    ],
    highlight: false,
    badge: null,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            Start free. Upgrade when you&apos;re ready.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !annual
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                annual
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-green-600 font-semibold">
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "bg-blue-600 text-white border-2 border-blue-500 shadow-xl shadow-blue-500/20"
                  : "bg-white border border-slate-200"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-lg font-bold mb-1 ${
                    plan.highlight ? "text-white" : "text-slate-900"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm ${
                    plan.highlight ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlight ? "text-white" : "text-slate-900"
                    }`}
                  >
                    ${annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span
                    className={`text-sm mb-1.5 ${
                      plan.highlight ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    /mo
                  </span>
                </div>
                {annual && (
                  <div
                    className={`text-xs mt-1 ${
                      plan.highlight ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    Billed ${plan.annualPrice * 12}/year
                  </div>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        plan.highlight ? "text-blue-200" : "text-green-500"
                      }`}
                    />
                    <span
                      className={
                        plan.highlight ? "text-blue-50" : "text-slate-700"
                      }
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className={plan.highlight ? "" : ""}>
                {plan.highlight ? (
                  <SignInButton />
                ) : (
                  <SignInButton compact />
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
