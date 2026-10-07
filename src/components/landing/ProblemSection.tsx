"use client";

import { Clock, MessageSquareOff, Layers, AlertCircle, ArrowDown } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      icon: Clock,
      title: "Manual Research",
      tag: "Time Drain",
      description:
        "Finding the right prospects takes hours. Sales reps spend up to 65% of their working day digging through LinkedIn profiles, company blogs, and messy spreadsheets instead of talking to buyers.",
      impact: "15+ hours lost per rep every week",
    },
    {
      icon: MessageSquareOff,
      title: "Generic Outreach",
      tag: "Low Conversion",
      description:
        "Copy-paste templates and generic mass blasts don't create meaningful conversations. Modern decision-makers instantly delete messages that lack genuine context and relevance.",
      impact: "Sub-2% average reply rates",
    },
    {
      icon: Layers,
      title: "Scattered Lead Data",
      tag: "Lost Pipeline",
      description:
        "Leads, notes, follow-up reminders, and conversation threads live across different tools, tabs, and disconnected CRM instances. Hot opportunities slip through the cracks unnoticed.",
      impact: "30% of warm prospects get neglected",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-neutral-50/70 dark:bg-neutral-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>The Traditional Outbound Problem</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
            Your sales team shouldn&apos;t spend hours researching every lead.
          </h2>

          <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Traditional sales prospecting is broken. Reps are bogged down by administrative busywork, leaving high-value deals on the table.
          </p>
        </div>

        {/* Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {problems.map((prob) => {
            const Icon = prob.icon;
            return (
              <div
                key={prob.title}
                className="group relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xs hover:shadow-md transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-700 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform">
                      <Icon className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full">
                      {prob.tag}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {prob.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {prob.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800 text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                  <span>Impact:</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    {prob.impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
