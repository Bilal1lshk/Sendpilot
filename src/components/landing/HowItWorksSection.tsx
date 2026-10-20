"use client";

import { Filter, Sparkles, UserCheck, Trophy, ArrowRight } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Target & Ingest",
      description: "Import your prospects from CSV files, LinkedIn sales searches, or direct CRM integrations with automated de-duplication.",
      icon: Filter,
      detail: "Clean lead deduplication",
    },
    {
      num: "02",
      title: "Enrich & Score",
      description: "Our AI synthesizes verified firmographics, funding data, job history, and tech stack into comprehensive lead dossiers.",
      icon: Sparkles,
      detail: "Algorithmic ICP match",
    },
    {
      num: "03",
      title: "Draft & Approve",
      description: "Generate bespoke outreach hooks tailored to each lead. Reps review and approve copy with 1-click safeguards.",
      icon: UserCheck,
      detail: "Human-in-the-loop safety",
    },
    {
      num: "04",
      title: "Convert",
      description: "Track replies, manage live conversations, and move qualified prospects directly into booked meetings and closed revenue.",
      icon: Trophy,
      detail: "Calendar & CRM sync",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-white border-b border-neutral-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <span>Simple 4-Step Process</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            How SendPilot turns raw prospects into closed revenue.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            A battle-tested methodology built to scale outbound without adding headcount.
          </p>
        </div>

        {/* 4-Step Grid with Connecting Line */}
        <div className="relative">
          {/* Subtle horizontal connecting line on desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-px bg-neutral-200 -translate-y-12 -z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-10">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs hover:border-neutral-300 transition-colors flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-2xl tracking-tight text-neutral-900">
                        {step.num}
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-black">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 text-[11px] font-semibold text-emerald-700 flex items-center justify-between">
                    <span>{step.detail}</span>
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
