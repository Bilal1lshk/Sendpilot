"use client";

import Link from "next/link";
import {
  Bot,
  User,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";

export function AiAssistantSection() {
  const suggestedProspects = [
    {
      name: "Rachel Vance",
      role: "VP of Commercial Sales",
      company: "Synthetix Cloud",
      score: 95,
      intent: "High Intent",
    },
    {
      name: "Karan Patel",
      role: "Head of GTM Operations",
      company: "OrbitFlow AI",
      score: 91,
      intent: "High Intent",
    },
    {
      name: "Nora Lindqvist",
      role: "Director of Enterprise Sales",
      company: "ScaleMetric",
      score: 89,
      intent: "Immediate Match",
    },
  ];

  return (
    <section id="ai-assistant" className="py-20 md:py-32 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <Bot className="h-3.5 w-3.5 text-neutral-600" />
            <span>Conversational Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
            Your AI sales assistant works behind the scenes.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
            Interact with your entire lead database using natural language. Surface high-intent prospects, analyze campaign performance, and generate custom pitches in seconds.
          </p>
        </div>

        {/* Chat-Style Interface Mockup */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* User Message Bubble */}
          <div className="flex items-start gap-3.5 justify-end">
            <div className="max-w-lg rounded-2xl bg-neutral-900 text-white p-4 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                Sales Rep Query
              </div>
              <p className="text-sm font-medium">
                &quot;Find my highest-quality SaaS leads that haven&apos;t been contacted yet.&quot;
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
              <User className="h-4 w-4" />
            </div>
          </div>

          {/* AI Response Bubble */}
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Bot className="h-5 w-5" />
            </div>

            <div className="flex-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-palm-leaf-600" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    SendPilot Copilot Analysis
                  </span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Queried in 0.3s
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                I filtered your active workspace across 2,400+ leads. Here is the breakdown of your top uncontacted prospects matching your ICP:
              </p>

              {/* 4 Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 text-center">
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">
                    24
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Qualified Leads
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 text-center">
                  <div className="text-xl font-bold text-palm-leaf-600 dark:text-palm-leaf-400">
                    87%
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Avg Lead Score
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 text-center">
                  <div className="text-xl font-bold text-palm-leaf-700 dark:text-palm-leaf-400">
                    8
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    High-Intent
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 text-center">
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">
                    5
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Immediate Action
                  </div>
                </div>
              </div>

              {/* Prospect preview snippet */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Top 3 Recommended Prospects:
                </span>
                <div className="space-y-1.5">
                  {suggestedProspects.map((lead) => (
                    <div
                      key={lead.name}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {lead.name}
                        </span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500">
                          {lead.role} at {lead.company}
                        </span>
                      </div>
                      <span className="font-bold text-palm-leaf-800 bg-palm-leaf-100 px-2.5 py-0.5 rounded-full text-[11px]">
                        {lead.score}% Score
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons inside AI response */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-neutral-500">
                  Would you like to draft personalized hooks for these 5 leads?
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/get-started"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Draft Outreach</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Input Bar Mockup */}
          <div className="relative pt-2">
            <input
              type="text"
              readOnly
              value="Draft a 3-step follow-up for leads that didn't reply to email #1..."
              className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 outline-none shadow-2xs"
            />
            <button
              type="button"
              className="absolute right-2 top-3.5 h-8 w-8 rounded-xl bg-palm-leaf-600 text-white flex items-center justify-center hover:bg-palm-leaf-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 px-7 py-3.5 text-sm font-semibold shadow-md transition-all hover:gap-2.5"
          >
            <Sparkles className="h-4 w-4 text-palm-leaf-400" />
            <span>Meet Your AI Assistant</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
