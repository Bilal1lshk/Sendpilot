"use client";

import {
  Sparkles,
  Globe,
  MapPin,
} from "lucide-react";

export function LeadProfileShowcase() {
  return (
    <section className="py-20 md:py-32 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
            <span>Deep Prospect Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
            Comprehensive Lead Intelligence, Down to the Last Detail.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Give reps superpowers with auto-compiled prospect profiles, AI summaries, intent signals, and historical touchpoints.
          </p>
        </div>

        {/* Detailed Lead Profile UI Card */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 p-6 sm:p-10 shadow-xl space-y-8">
          {/* Top Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-palm-leaf-600 to-palm-leaf-500 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
                SL
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Sarah Lawrence
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-palm-leaf-50 dark:bg-palm-leaf-950/60 border border-palm-leaf-200 dark:border-palm-leaf-800 px-2.5 py-0.5 text-xs font-bold text-palm-leaf-800 dark:text-palm-leaf-300">
                    <Sparkles className="h-3 w-3 text-palm-leaf-600" />
                    94/100 Lead Score
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500">
                  VP of Enterprise Sales • CloudMetrics Systems
                </p>
                <div className="flex items-center gap-3 text-xs text-neutral-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> New York, NY
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> cloudmetrics.io
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-right">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                  Next Follow-up
                </span>
                <span className="text-xs font-bold text-palm-leaf-700 dark:text-palm-leaf-400">
                  Tomorrow, 10:30 AM
                </span>
              </div>
            </div>
          </div>

          {/* AI Insight Highlight Card */}
          <div className="rounded-2xl border border-palm-leaf-300 dark:border-palm-leaf-800/80 bg-gradient-to-r from-palm-leaf-50/80 via-white to-palm-leaf-50/40 dark:from-palm-leaf-950/40 dark:via-neutral-900 dark:to-palm-leaf-950/30 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-palm-leaf-600 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-palm-leaf-900 dark:text-palm-leaf-200">
                  AI Insight
                </span>
              </div>
              <span className="text-[11px] font-semibold text-palm-leaf-800 dark:text-palm-leaf-300 bg-palm-leaf-100 dark:bg-palm-leaf-950 px-2 py-0.5 rounded-full">
                High Priority
              </span>
            </div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed italic">
              &quot;Strong ICP match. Company is growing its sales team and recently expanded into the US market. Recommend personalized outreach referencing their Series B scale.&quot;
            </p>
          </div>

          {/* 3 Columns: Company Info, AI Summary & Notes, Outreach History */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Company Firmographics */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Company &amp; Role
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Company</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    CloudMetrics Systems
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Industry</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    B2B Observability SaaS
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Headcount</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    180 employees (+35% YoY)
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Tech Stack</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Salesforce, HubSpot, Outreach
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Recent Activity & Notes */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Recent Activity
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>LinkedIn Engagement</span>
                    <span>2h ago</span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 font-medium line-clamp-2">
                    Sarah liked a post regarding outbound sequence personalization.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Website Visit</span>
                    <span>Yesterday</span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                    Visited Pricing &amp; Case Studies pages (3m 40s duration).
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Outreach History */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Outreach History
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Connection Request
                  </span>
                  <span className="text-palm-leaf-700 font-bold text-[11px]">
                    Accepted
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Intro Message #1
                  </span>
                  <span className="text-palm-leaf-700 font-bold text-[11px]">
                    Replied
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-palm-leaf-50/60 dark:bg-palm-leaf-950/40 border border-palm-leaf-200 dark:border-palm-leaf-800">
                  <span className="font-semibold text-palm-leaf-900 dark:text-palm-leaf-200">
                    Product Demo
                  </span>
                  <span className="text-palm-leaf-700 font-bold text-[11px]">
                    Scheduled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
