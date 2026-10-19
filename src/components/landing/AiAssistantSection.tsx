"use client";

import Link from "next/link";
import { Bot, Sparkles, Send, ArrowRight, User } from "lucide-react";

export function AiAssistantSection() {
  const suggestedProspects = [
    {
      name: "Marcus Vance",
      role: "VP of Engineering",
      company: "ApexScale",
      score: 95,
      intent: "High - Actively Hiring",
    },
    {
      name: "Elena Rostova",
      role: "Head of Growth",
      company: "DataMetrics Inc.",
      score: 92,
      intent: "Series B Announcement",
    },
    {
      name: "Julian Thorne",
      role: "Chief Revenue Officer",
      company: "HyperCloud Systems",
      score: 89,
      intent: "Viewed Product Page",
    },
  ];

  return (
    <section id="ai-assistant" className="py-20 md:py-32 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <Bot className="h-3.5 w-3.5 text-neutral-600" />
            <span>Conversational Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            Your AI sales assistant works behind the scenes.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            Interact with your entire lead database using natural language. Surface high-intent prospects, analyze campaign performance, and generate custom pitches in seconds.
          </p>
        </div>

        {/* Chat-Style Interface Mockup */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* User Message Bubble */}
          <div className="flex items-start gap-3.5 justify-end">
            <div className="max-w-lg rounded-2xl bg-neutral-900 text-white p-4 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                Sales Rep Query
              </div>
              <p className="text-sm font-medium text-white">
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

            <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-900">
                    SendPilot Copilot Analysis
                  </span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Queried in 0.3s
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                I filtered your active workspace across 2,400+ leads. Here is the breakdown of your top uncontacted prospects matching your ICP:
              </p>

              {/* 4 Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <div className="text-xl font-bold text-neutral-900 font-mono">
                    24
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Qualified Leads
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <div className="text-xl font-bold text-neutral-900 font-mono">
                    87%
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    Avg Lead Score
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <div className="text-xl font-bold text-emerald-700 font-mono">
                    8
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    High-Intent
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <div className="text-xl font-bold text-neutral-900 font-mono">
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
                      className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">
                          {lead.name}
                        </span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500">
                          {lead.role} at {lead.company}
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[11px]">
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors"
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
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-600 outline-none shadow-xs"
            />
            <button
              type="button"
              className="absolute right-2 top-3.5 h-8 w-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white px-7 py-3.5 text-sm font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Meet Your AI Assistant</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
