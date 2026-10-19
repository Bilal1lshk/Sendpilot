"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const tiers = [
    {
      name: "Starter",
      tagline: "Ideal for solo founders and early outbound experiments.",
      priceMonthly: 49,
      priceAnnual: 39,
      ctaText: "Start 14-Day Trial",
      ctaHref: "/get-started",
      isPopular: false,
      features: [
        "1 connected LinkedIn sender profile",
        "Up to 500 enriched leads / month",
        "AI ICP lead qualification & scoring",
        "Contextual AI opening hook generator",
        "Standard CSV & LinkedIn import",
        "Community & documentation support",
      ],
    },
    {
      name: "Growth",
      tagline: "Designed for scaling sales reps needing consistent meetings.",
      priceMonthly: 119,
      priceAnnual: 95,
      ctaText: "Get Started Free",
      ctaHref: "/get-started",
      isPopular: true,
      features: [
        "Up to 3 connected sender profiles",
        "Up to 2,500 enriched leads / month",
        "AI Sales Copilot conversational queries",
        "Automated multi-step cadence reminders",
        "Human-in-the-loop review batch mode",
        "Priority live chat & email support",
      ],
    },
    {
      name: "Scale",
      tagline: "For high-velocity outbound teams and growing sales pods.",
      priceMonthly: 249,
      priceAnnual: 199,
      ctaText: "Talk to Sales",
      ctaHref: "/get-started",
      isPopular: false,
      features: [
        "Unlimited sender accounts & team seats",
        "10,000+ enriched leads / month",
        "Custom ICP fine-tuning & prompt control",
        "HubSpot & Salesforce bi-directional sync",
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
                !isAnnual ? "text-black" : "text-neutral-400"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAnnual ? "bg-neutral-900" : "bg-neutral-300"
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-semibold ${
                  isAnnual ? "text-black" : "text-neutral-400"
                }`}
              >
                Annual
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200/60 px-2 py-0.5 rounded-full">
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
                className={`rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-colors duration-150 relative ${
                  tier.isPopular
                    ? "bg-white border-2 border-neutral-900 shadow-sm"
                    : "bg-white border border-neutral-200 shadow-xs hover:border-neutral-300"
                }`}
              >
                {tier.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-semibold tracking-wider uppercase shadow-xs">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-black">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                      {tier.tagline}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black font-mono">
                      ${price}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      / month {isAnnual && price > 0 ? "(billed annually)" : ""}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-neutral-100">
                    <span className="text-xs font-semibold text-neutral-800 block">
                      What&apos;s included:
                    </span>
                    <ul className="space-y-2.5">
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2.5 text-xs text-neutral-700"
                        >
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2.5] mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={tier.ctaHref}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition-colors ${
                      tier.isPopular
                        ? "bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs"
                        : "border border-neutral-200 hover:bg-neutral-50 text-neutral-900"
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
