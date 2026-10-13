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
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6 shadow-xs">
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
                      ? "bg-white shadow-md border border-palm-leaf-300 scale-102 ring-2 ring-palm-leaf-500/20"
                      : "hover:bg-white/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "text-palm-leaf-700"
                          : "text-neutral-400"
                      }`}
                    >
                      Step 0{idx + 1}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected
                          ? "text-palm-leaf-600"
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

        {/* Large Product Showcase Showcase Canvas */}
        <div className="rounded-3xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-6 sm:p-10 shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-palm-leaf-700 uppercase tracking-wider">
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

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-50 border border-palm-leaf-200 text-palm-leaf-800 text-xs font-semibold">
                <Bot className="h-4 w-4 text-palm-leaf-600" />
                AI Autopilot
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-100/60 border border-palm-leaf-200 text-palm-leaf-900 text-xs font-semibold">
                <UserCheck className="h-4 w-4 text-palm-leaf-700" />
                Human Approved
              </span>
            </div>
          </div>

          {/* Interactive Screen Preview */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Prospect Card */}
              <div className="rounded-xl border border-neutral-200 p-4 space-y-4 bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-palm-leaf-600 to-palm-leaf-500 text-white font-bold text-sm flex items-center justify-center">
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
                  <div className="p-2 rounded-lg bg-white border border-neutral-100">
                    <span className="text-[10px] text-neutral-400 block">Company Size</span>
                    <span className="font-semibold text-neutral-800">
                      120–250 Empl.
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-neutral-100">
                    <span className="text-[10px] text-neutral-400 block">Funding</span>
                    <span className="font-semibold text-palm-leaf-700">
                      Series B ($28M)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-palm-leaf-50 border border-palm-leaf-200/60 text-xs flex items-center justify-between">
                  <span className="font-semibold text-palm-leaf-800">
                    ICP Compatibility
                  </span>
                  <span className="font-bold text-palm-leaf-700">
                    95 / 100
                  </span>
                </div>
              </div>

              {/* Middle & Right: AI Context Generation & Sequence */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-palm-leaf-200/80 bg-palm-leaf-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-palm-leaf-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
                      Synthesized AI Context
                    </span>
                    <span className="text-[11px] font-mono text-palm-leaf-700">
                      Source: TechCrunch &amp; LinkedIn Post
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    ApexScale just announced an enterprise data migration initiative. Alexander posted about bottlenecks scaling outbound workflows across EU teams.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      Generated Personalized Opener
                    </span>
                    <span className="text-[11px] text-palm-leaf-800 font-semibold bg-palm-leaf-100 px-2.5 py-0.5 rounded-full">
                      Ready for 1-Click Approval
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-700 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
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
