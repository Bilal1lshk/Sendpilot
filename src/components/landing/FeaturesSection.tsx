"use client";

import {
  Target,
  Sparkles,
  Database,
  GitBranch,
  CalendarCheck,
  BarChart3,
  Bot,
  Users2,
  CheckCircle2,
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Target,
      title: "AI Lead Scoring",
      badge: "Intelligent ICP",
      description:
        "Automatically evaluate incoming leads based on your ideal customer profile criteria: revenue, company headcount, funding stage, and role relevancy.",
      highlight: "Customizable scoring algorithms",
    },
    {
      icon: Database,
      title: "Smart Lead Enrichment",
      badge: "Real-Time Data",
      description:
        "Aggregate verified company technographics, firmographics, decision-maker verified emails, and LinkedIn profile details into a unified profile view.",
      highlight: "Auto-synced data hygiene",
    },
    {
      icon: Sparkles,
      title: "AI Personalization",
      badge: "High Conversion",
      description:
        "Generate hyper-relevant outreach hooks and personalized icebreakers based on recent company announcements, hiring patterns, and prospect context.",
      highlight: "Human-in-the-loop review",
    },
    {
      icon: GitBranch,
      title: "Lead Pipeline",
      badge: "Drag & Drop",
      description:
        "Move prospects seamlessly through customizable sales stages: from Imported and Qualified to Personalized, Contacted, and Meeting Booked.",
      highlight: "Kanban & Table views",
    },
    {
      icon: CalendarCheck,
      title: "Follow-up Management",
      badge: "Never Miss",
      description:
        "Never let a hot prospect go cold. Automated cadence alerts tell reps the exact day and time to follow up with tailored conversation starters.",
      highlight: "Smart snooze & alerts",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      badge: "Full Visibility",
      description:
        "Track lead volume, sequence response rates, acceptance ratios, pipeline velocity, and individual rep performance from one centralized dashboard.",
      highlight: "Exportable metrics",
    },
    {
      icon: Bot,
      title: "AI Sales Assistant",
      badge: "Natural Language",
      description:
        "Ask questions about your leads and pipeline in plain English. Get instant answers on top opportunities, stalled deals, and recommended next actions.",
      highlight: "Conversational query",
    },
    {
      icon: Users2,
      title: "Team Collaboration",
      badge: "Multi-User Workspaces",
      description:
        "Assign leads to teammates, leave contextual notes on prospect profiles, share high-performing templates, and balance outbound volume safely.",
      highlight: "Role-based permissions",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
            <span>Enterprise-Grade Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            Everything your team needs to scale outbound.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Engineered to replace disjointed tool stacks with a cohesive, AI-powered system designed for modern revenue teams.
          </p>
        </div>

        {/* 2-Column Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xs hover:shadow-md hover:border-palm-leaf-300 dark:hover:border-palm-leaf-700 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-700 dark:text-palm-leaf-300 group-hover:bg-palm-leaf-600 group-hover:text-white transition-colors duration-200">
                      <Icon className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <span className="text-[11px] font-semibold text-palm-leaf-800 dark:text-palm-leaf-300 bg-palm-leaf-50 dark:bg-palm-leaf-950/40 px-3 py-1 rounded-full border border-palm-leaf-200 dark:border-palm-leaf-800/40">
                      {feat.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                      <span>{feat.title}</span>
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5 text-palm-leaf-700 dark:text-palm-leaf-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-palm-leaf-600" />
                    {feat.highlight}
                  </span>
                  <span className="text-neutral-400 group-hover:text-palm-leaf-600 transition-colors">
                    Explore &rarr;
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
