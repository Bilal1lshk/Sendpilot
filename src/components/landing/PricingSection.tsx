"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const tiers = [
    {
      name: "Free",
      tagline: "For exploring SendPilot",
      priceMonthly: 0,
      priceAnnual: 0,
      isPopular: false,
      ctaText: "Start for Free",
      ctaHref: "/get-started",
      features: [
        "50 qualified leads",
        "Basic lead management",
        "AI summary previews",
        "Standard ICP scoring",
        "1 connected sender profile",
        "Community support",
      ],
    },
    {
      name: "Pro",
      tagline: "For scaling reps, founders & revenue teams",
      priceMonthly: 49,
      priceAnnual: 39,
      isPopular: true,
      ctaText: "Start 14-Day Free Trial",
      ctaHref: "/get-started",
      features: [
        "1,500 qualified leads / month",
        "Full AI qualification & ICP scoring",
        "AI personalized outreach generator",
        "Multi-channel sequence tracking",
        "Assisted sending daily task lists",
        "3 connected sender profiles",
        "Priority email & chat support",
      ],
    },
    {
      name: "Scale",
      tagline: "For agencies & high-volume outbound teams",
      priceMonthly: 129,
      priceAnnual: 99,
      isPopular: false,
      ctaText: "Scale Your Pipeline",
      ctaHref: "/get-started",
      features: [
        "10,000 qualified leads / month",
        "Unlimited AI enrichment & deep signals",
        "Unlimited personalized message drafts",
        "Team workspaces & role-based permissions",
        "10+ connected sender profiles",
        "Suppression list & compliance protection",
        "Dedicated onboarding manager & API access",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-white border-b border-neutral-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <span>Transparent Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            Simple pricing. Built to scale with you.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            No hidden setup fees or surprise overages. Choose the plan that fits your current outbound volume.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold ${
                !isAnnual ? "text-neutral-900 dark:text-white" : "text-neutral-400"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-palm-leaf-600 transition-colors duration-200 ease-in-out focus:outline-none"
              aria-label="Toggle annual billing"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-semibold ${
                  isAnnual ? "text-neutral-900 dark:text-white" : "text-neutral-400"
                }`}
              >
                Annual
              </span>
              <span className="text-[10px] font-bold text-palm-leaf-900 bg-palm-leaf-200 dark:bg-palm-leaf-900 dark:text-palm-leaf-200 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier) => {
            const price = isAnnual ? tier.priceAnnual : tier.priceMonthly;

            return (
              <div
                key={tier.name}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                  tier.isPopular
                    ? "bg-white dark:bg-neutral-900 border-2 border-palm-leaf-500 shadow-xl shadow-palm-leaf-500/10 scale-102 lg:-translate-y-2"
                    : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:shadow-md"
                }`}
              >
                {tier.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-palm-leaf-600 text-white text-[11px] font-bold tracking-wider uppercase shadow-xs">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                      {tier.tagline}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      / month {isAnnual && price > 0 ? "(billed annually)" : ""}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                      What&apos;s included:
                    </span>
                    <ul className="space-y-2.5">
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-300"
                        >
                          <Check className="h-4 w-4 text-palm-leaf-600 shrink-0 stroke-[2.5] mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={tier.ctaHref}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-all ${
                      tier.isPopular
                        ? "bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white shadow-md shadow-palm-leaf-600/25"
                        : "border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
