"use client";

import { useState } from "react";
import {
  Compass,
  CheckCircle2,
  Sparkles,
  Send,
  RotateCcw,
  Trophy,
  Bot,
  UserCheck,
} from "lucide-react";

export function SolutionSection() {
  const [activeStep, setActiveStep] = useState(2); // default to 'Personalize'

  const workflowSteps = [
    {
      id: 0,
      title: "Discover",
      subtitle: "Filter & Import",
      icon: Compass,
      desc: "Connect your CSV or CRM data. SendPilot cleans duplicates and verifies emails.",
      tagline: "Hygiene & Enrichment",
    },
    {
      id: 1,
      title: "Qualify",
      subtitle: "AI Lead Scoring",
      icon: CheckCircle2,
      desc: "Instant ICP evaluation scans company growth, tech stack, and role fit automatically.",
      tagline: "Scored 0–100%",
    },
    {
      id: 2,
      title: "Personalize",
      subtitle: "Contextual Hooks",
      icon: Sparkles,
      desc: "AI synthesizes company events, funding, and career history into custom opening lines.",
      tagline: "Human-in-the-Loop",
    },
    {
      id: 3,
      title: "Reach Out",
      subtitle: "Multi-Channel Push",
      icon: Send,
      desc: "Assisted sending lets reps dispatch authenticated messages with one click.",
      tagline: "High Deliverability",
    },
    {
      id: 4,
      title: "Follow Up",
      subtitle: "Smart Cadence",
      icon: RotateCcw,
      desc: "Never let a thread go cold. Dynamic prompts remind reps when replies slow down.",
      tagline: "Timely Alerts",
    },
    {
      id: 5,
      title: "Close",
      subtitle: "Booked Meetings",
      icon: Trophy,
      desc: "Direct calendar synchronisation logs booked meetings straight into your CRM.",
      tagline: "Revenue Realized",
    },
  ];

  return (
    <section id="solution" className="py-20 md:py-32 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-palm-leaf-200 dark:border-palm-leaf-800 bg-palm-leaf-50/70 dark:bg-palm-leaf-950/40 px-3.5 py-1 text-xs font-semibold text-palm-leaf-800 dark:text-palm-leaf-300">
            <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>The Unified Outbound Engine</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
            One workspace for your entire lead workflow.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate context switching. SendPilot centralizes prospect intelligence, AI personalization, and pipeline tracking so your sales team moves faster.
          </p>
        </div>

        {/* Workflow Breadcrumb / Timeline Bar */}
        <div className="rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = activeStep === step.id;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-neutral-900 shadow-md border border-palm-leaf-300 dark:border-palm-leaf-700 scale-102 ring-2 ring-palm-leaf-500/20"
                      : "hover:bg-white/60 dark:hover:bg-neutral-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "text-palm-leaf-700 dark:text-palm-leaf-400"
                          : "text-neutral-400"
                      }`}
                    >
                      Step 0{idx + 1}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected
                          ? "text-palm-leaf-600 dark:text-palm-leaf-400"
                          : "text-neutral-400"
                      }`}
                    />
                  </div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {step.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Large Product Showcase Showcase Canvas */}
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-6 sm:p-10 shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-palm-leaf-700 dark:text-palm-leaf-400 uppercase tracking-wider">
                  Active Stage
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {workflowSteps[activeStep].title} — {workflowSteps[activeStep].subtitle}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                {workflowSteps[activeStep].desc}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 border border-palm-leaf-200 dark:border-palm-leaf-800 text-palm-leaf-800 dark:text-palm-leaf-300 text-xs font-semibold">
                <Bot className="h-4 w-4 text-palm-leaf-600" />
                AI Autopilot
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-100/60 dark:bg-palm-leaf-900/40 border border-palm-leaf-200 dark:border-palm-leaf-700 text-palm-leaf-900 dark:text-palm-leaf-200 text-xs font-semibold">
                <UserCheck className="h-4 w-4 text-palm-leaf-700" />
                Human Approved
              </span>
            </div>
          </div>

          {/* Interactive Screen Preview */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Prospect Card */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-950/40">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-palm-leaf-600 to-palm-leaf-500 text-white font-bold text-sm flex items-center justify-center">
                    AR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Alexander Reed
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Chief Technology Officer • ApexScale
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block">Company Size</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      120–250 Empl.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block">Funding</span>
                    <span className="font-semibold text-palm-leaf-700">
                      Series B ($28M)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-palm-leaf-50 dark:bg-palm-leaf-950/40 border border-palm-leaf-200/60 dark:border-palm-leaf-800/40 text-xs flex items-center justify-between">
                  <span className="font-semibold text-palm-leaf-800 dark:text-palm-leaf-300">
                    ICP Compatibility
                  </span>
                  <span className="font-bold text-palm-leaf-700 dark:text-palm-leaf-400">
                    95 / 100
                  </span>
                </div>
              </div>

              {/* Middle & Right: AI Context Generation & Sequence */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-palm-leaf-200/80 dark:border-palm-leaf-800/80 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-palm-leaf-800 dark:text-palm-leaf-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
                      Synthesized AI Context
                    </span>
                    <span className="text-[11px] font-mono text-palm-leaf-700 dark:text-palm-leaf-400">
                      Source: TechCrunch &amp; LinkedIn Post
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    ApexScale just announced an enterprise data migration initiative. Alexander posted about bottlenecks scaling outbound workflows across EU teams.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Generated Personalized Opener
                    </span>
                    <span className="text-[11px] text-palm-leaf-800 font-semibold bg-palm-leaf-100 px-2.5 py-0.5 rounded-full">
                      Ready for 1-Click Approval
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-700 dark:text-neutral-300 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
                    &quot;Hi Alexander, saw ApexScale&apos;s recent Series B expansion. Scaling outbound across distributed EU teams often creates data silos — we helped FinFlow automate prospect research so reps focus 100% on qualified chats. Open to a 10-min look?&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
