"use client";

import { useState } from "react";
import {
  Sparkles,
  Bot,
  UserCheck,
  CheckCircle2,
  Filter,
  Send,
  Calendar,
  MessageSquare,
} from "lucide-react";

export function SolutionSection() {
  const [activeStep, setActiveStep] = useState(1);

  const workflowSteps = [
    {
      id: 0,
      title: "1. Ingest Leads",
      subtitle: "Instant Multi-Source Sync",
      icon: Filter,
      desc: "Connect your CSV, LinkedIn profile search, or CRM. SendPilot de-duplicates and normalizes candidate contact records automatically.",
    },
    {
      id: 1,
      title: "2. AI Enrichment",
      subtitle: "Deep Prospect Intelligence",
      icon: Sparkles,
      desc: "Synthesize firmographics, tech stack, funding announcements, and role seniority into unified prospect cards.",
    },
    {
      id: 2,
      title: "3. ICP Scoring",
      subtitle: "0–100% Qualification",
      icon: CheckCircle2,
      desc: "Algorithmic ICP scoring matches target titles and company attributes so reps focus exclusively on top-tier prospects.",
    },
    {
      id: 3,
      title: "4. Personalize",
      subtitle: "Dynamic Hook Generation",
      icon: Bot,
      desc: "AI Copilot drafts authentic, contextual opening lines citing verified company events and prospect achievements.",
    },
    {
      id: 4,
      title: "5. Human Approval",
      subtitle: "1-Click Guardrails",
      icon: UserCheck,
      desc: "Maintain 100% control. Reps review and approve messages in bulk or individually before any message sends.",
    },
    {
      id: 5,
      title: "6. Convert & Book",
      subtitle: "Unified Inbox",
      icon: Calendar,
      desc: "Manage replies seamlessly across inboxes. Sync meetings booked directly into your CRM of record.",
    },
  ];

  return (
    <section id="solution" className="py-20 md:py-32 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <Sparkles className="h-3.5 w-3.5 text-neutral-600" />
            <span>The Unified Outbound Engine</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            One workspace for your entire lead workflow.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate context switching. SendPilot centralizes prospect intelligence, AI personalization, and pipeline tracking so your sales team moves faster.
          </p>
        </div>

        {/* Workflow Breadcrumb / Timeline Bar */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = activeStep === step.id;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-white shadow-xs border border-neutral-300 ring-1 ring-neutral-900/5"
                      : "hover:bg-white/80 border border-transparent text-neutral-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "text-emerald-700"
                          : "text-neutral-400"
                      }`}
                    >
                      Step 0{idx + 1}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected
                          ? "text-emerald-600"
                          : "text-neutral-400"
                      }`}
                    />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 line-clamp-1">
                    {step.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Large Product Showcase Canvas */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Active Stage
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {workflowSteps[activeStep].title} — {workflowSteps[activeStep].subtitle}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600">
                {workflowSteps[activeStep].desc}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-medium">
                <Bot className="h-3.5 w-3.5 text-neutral-600" />
                AI Autopilot
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                Human Approved
              </span>
            </div>
          </div>

          {/* Interactive Screen Preview */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Prospect Card */}
              <div className="rounded-xl border border-neutral-200 p-4 space-y-4 bg-white shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    AR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      Alexander Reed
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Chief Technology Officer • ApexScale
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                    <span className="text-[10px] text-neutral-400 block">Company Size</span>
                    <span className="font-semibold text-neutral-800">
                      120–250 Empl.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                    <span className="text-[10px] text-neutral-400 block">Funding</span>
                    <span className="font-semibold text-neutral-900">
                      Series B ($28M)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-xs flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">
                    ICP Compatibility
                  </span>
                  <span className="font-bold text-emerald-700">
                    95 / 100
                  </span>
                </div>
              </div>

              {/* Middle & Right: AI Context Generation & Sequence */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Synthesized AI Context
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      Source: TechCrunch &amp; LinkedIn Post
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    ApexScale just announced an enterprise data migration initiative. Alexander posted about bottlenecks scaling outbound workflows across EU teams.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      Generated Personalized Opener
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                      Ready for 1-Click Approval
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-700 p-3 rounded-lg bg-neutral-50 border border-neutral-100 leading-relaxed">
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
