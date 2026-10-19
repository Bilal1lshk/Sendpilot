"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Filter,
  Sparkles,
  UserCheck,
  Trophy,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  Mail,
  Zap,
  Bot,
  ShieldCheck,
  Check,
  TrendingUp,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";

interface Stage {
  id: number;
  label: string;
  stepNumber: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const stages: Stage[] = [
  {
    id: 0,
    label: "Intake & Clean",
    stepNumber: "01",
    badge: "Smart Sync",
    title: "Multi-Source Lead Ingestion & De-duplication",
    description:
      "Drop your CSV lists or sync LinkedIn Sales Navigator searches. SendPilot cleans syntax, removes duplicate profiles, and normalizes candidate records in seconds.",
    icon: Filter,
  },
  {
    id: 1,
    label: "Enrich & Score",
    stepNumber: "02",
    badge: "0-100% ICP",
    title: "Deep Firmographic Enrichment & Algorithmic Scoring",
    description:
      "Live scanners synthesize tech stacks, company funding rounds, headcount growth, and title keywords into comprehensive dossier cards.",
    icon: Sparkles,
  },
  {
    id: 2,
    label: "Bespoke Pitch",
    stepNumber: "03",
    badge: "Human-in-the-Loop",
    title: "Contextual AI Opening Hooks with 1-Click Approval",
    description:
      "The AI Copilot crafts personalized icebreakers referencing verified prospect events. Sales reps retain 100% control to review, edit, or 1-click approve.",
    icon: UserCheck,
  },
  {
    id: 3,
    label: "Convert & Book",
    stepNumber: "04",
    badge: "Calendar Sync",
    title: "Safe Residential Dispatch & Booked Meetings",
    description:
      "Messages send via local residential sessions at randomized typing speeds. Live replies are categorized and booked calls sync straight to your CRM.",
    icon: Trophy,
  },
];

export function InteractiveOutboundSimulator() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [approvedLead, setApprovedLead] = useState(false);

  // Auto-advance timer (6.5 seconds per step)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % stages.length);
      setApprovedLead(false);
    }, 6500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSelectStage = (index: number) => {
    setActiveStage(index);
    setApprovedLead(false);
  };

  const current = stages[activeStage];

  return (
    <section className="py-20 md:py-32 bg-white border-b border-neutral-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Outbound Simulator</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            See the outbound engine work in real time.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            Experience how a raw prospect travels from ingestion and algorithmic qualification to bespoke personalized outreach and booked revenue.
          </p>
        </div>

        {/* Step Navigation Tabs with Progress Timers */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
            {stages.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleSelectStage(idx)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-300 overflow-hidden cursor-pointer ${
                    isActive
                      ? "border-black bg-neutral-50 shadow-xs"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  {/* Active Progress Line */}
                  {isActive && isPlaying && (
                    <motion.div
                      className="absolute top-0 left-0 bottom-0 bg-black/5 z-0"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 6.5, ease: "linear" }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-neutral-400">
                      STAGE {stage.stepNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isActive
                          ? "bg-black text-white border-black"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      {stage.badge}
                    </span>
                  </div>

                  <div className="relative z-10 text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
                    <stage.icon className="h-3.5 w-3.5 shrink-0 text-neutral-800" />
                    <span>{stage.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Play/Pause Control */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:text-black hover:border-neutral-300 transition-colors shrink-0 cursor-pointer"
            title={isPlaying ? "Pause auto-advancing simulation" : "Play auto-advancing simulation"}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
        </div>

        {/* Central Simulation Console */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-xl overflow-hidden">
          {/* Top Console Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-neutral-800 bg-black/40 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-neutral-400 text-[11px]">
                pipeline://sim-outbound-engine/v2.4
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Engine Active</span>
              </span>
              <span className="text-neutral-500 font-mono text-[11px]">
                Step {current.stepNumber} of 04
              </span>
            </div>
          </div>

          {/* Console Body: Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left Detail Description Column */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-950/50">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  <current.icon className="h-4 w-4" />
                  <span>{current.badge}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  {current.title}
                </h3>

                <p className="text-sm text-neutral-400 leading-relaxed">
                  {current.description}
                </p>
              </div>

              <div className="pt-6 border-t border-neutral-800/80 space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Real-World Outcome:
                </div>
                <div className="text-xs text-neutral-300 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    {activeStage === 0 && "Zero duplicate messages across SDR territories."}
                    {activeStage === 1 && "94% ICP qualification with verified tech stack."}
                    {activeStage === 2 && "Personalized opening hook generated in 2.3 seconds."}
                    {activeStage === 3 && "Meeting booked directly into Google Calendar & CRM."}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Live Simulation Canvas */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-black/60 flex items-center justify-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                {/* ── STAGE 01: Ingestion & Deduplication ── */}
                {activeStage === 0 && (
                  <motion.div
                    key="stage-0"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                    className="w-full space-y-4"
                  >
                    {/* Ingestion Pill Bar */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-neutral-800 text-neutral-300">
                          <LinkedInIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-mono text-neutral-200">
                          SalesNav_Fintech_Founders.csv
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                        +1,420 Raw Leads
                      </span>
                    </div>

                    {/* Stream of Incoming Lead Cards */}
                    <div className="space-y-2.5">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/90 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            ER
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Elena Rostova</div>
                            <div className="text-[11px] text-neutral-400">Head of Growth • DataMetrics</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Valid Contact ✓
                        </span>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                            ER
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Elena Rostova (Duplicate)</div>
                            <div className="text-[11px] text-amber-400/80">Imported 3 weeks ago in Campaign #1</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 border border-amber-500/40 bg-amber-950/50 px-2 py-0.5 rounded-full">
                          Auto-Merged ✓
                        </span>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/90 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">
                            MV
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Marcus Vance</div>
                            <div className="text-[11px] text-neutral-400">VP of Engineering • ApexScale</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Valid Contact ✓
                        </span>
                      </motion.div>
                    </div>

                    {/* Ingestion Metric Footer */}
                    <div className="p-3 rounded-xl bg-black/40 border border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>Syntax Check: 100% Passed</span>
                      <span className="text-emerald-400 font-bold">14 Duplicates Auto-Prevented</span>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 02: AI Enrichment & ICP Scoring ── */}
                {activeStage === 1 && (
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                    className="w-full space-y-4"
                  >
                    {/* Active Lead Card with Radar Scan Animation */}
                    <div className="p-5 rounded-2xl border border-neutral-700 bg-neutral-900/95 space-y-4 relative overflow-hidden">
                      {/* Laser Radar Scan Effect */}
                      <motion.div
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-500 text-black font-extrabold text-sm flex items-center justify-center">
                            ER
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Elena Rostova</h4>
                            <p className="text-xs text-neutral-400">Head of Growth • DataMetrics Inc.</p>
                          </div>
                        </div>

                        {/* Animated Score Gauge */}
                        <div className="text-right">
                          <div className="text-xs font-mono text-neutral-400">ICP Qualification</div>
                          <div className="text-xl font-mono font-extrabold text-emerald-400 flex items-center gap-1 justify-end">
                            <TrendingUp className="h-4 w-4" />
                            <span>94%</span>
                          </div>
                        </div>
                      </div>

                      {/* Enriched Signals Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-black/60 border border-neutral-800">
                          <span className="text-[10px] text-neutral-500 block uppercase font-mono">
                            Firmographics
                          </span>
                          <span className="text-neutral-200 font-medium">120 Employees • Series B ($24M)</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/60 border border-neutral-800">
                          <span className="text-[10px] text-neutral-500 block uppercase font-mono">
                            Buying Intent Signal
                          </span>
                          <span className="text-emerald-400 font-medium">Hiring 6 Sales Development Reps</span>
                        </div>
                      </div>

                      {/* Technographic Stack Tags */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-neutral-500 font-mono uppercase">
                          Detected Tech Stack:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {["Stripe", "HubSpot", "Segment", "PostgreSQL", "React"].map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] text-neutral-300 font-mono border border-neutral-700"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                      <span>Matches Criteria: SaaS + Series B + Head of Growth</span>
                      <span className="font-bold font-mono">✓ High Priority</span>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 03: Bespoke Pitch & 1-Click Approve ── */}
                {activeStage === 2 && (
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                    className="w-full space-y-4"
                  >
                    {/* AI Draft Box */}
                    <div className="p-5 rounded-2xl border border-neutral-700 bg-neutral-900/95 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Bot className="h-4 w-4 text-emerald-400" />
                          <span className="font-bold text-white">AI Sales Copilot Draft</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          Citing: $24M Series B &amp; SDR Team Expansion
                        </span>
                      </div>

                      {/* Typewriter text preview */}
                      <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-800 text-xs font-mono text-neutral-200 leading-relaxed space-y-2">
                        <p>
                          &ldquo;Hi Elena — congrats on DataMetrics&apos; $24M Series B round! Noticed your team is currently scaling up SDR capacity on LinkedIn.
                        </p>
                        <p className="text-neutral-300">
                          Curious how you&apos;re currently handling lead enrichment hygiene so new reps don&apos;t burn domain reputation on bad data?&rdquo;
                        </p>
                      </div>

                      {/* Interactive Rep Action Button */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-neutral-400">
                          {approvedLead
                            ? "✓ Staged in Outbound Queue"
                            : "Human-in-the-Loop review required before sending."}
                        </span>

                        <button
                          type="button"
                          onClick={() => setApprovedLead(!approvedLead)}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            approvedLead
                              ? "bg-emerald-500 text-black border border-emerald-400"
                              : "bg-white hover:bg-neutral-200 text-black border border-white"
                          }`}
                        >
                          {approvedLead ? (
                            <>
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                              <span>Approved &amp; Queued</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>1-Click Approve Message</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between font-mono">
                      <span>Sentiment Prediction: 42% Reply Probability</span>
                      <span className="text-neutral-300">Zero Generic Templates</span>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 04: Convert & Booked Meeting ── */}
                {activeStage === 3 && (
                  <motion.div
                    key="stage-3"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                    className="w-full space-y-3.5"
                  >
                    {/* Simulated Incoming Positive Prospect Reply */}
                    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                          <span className="font-bold text-white">New LinkedIn Reply Received</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400">Just Now</span>
                      </div>
                      <p className="text-xs text-emerald-100 font-mono bg-black/40 p-2.5 rounded-lg border border-emerald-900/60">
                        &ldquo;Hey! Really good timing — our outbound reply rates actually dropped last quarter. Let&apos;s chat Thursday at 2 PM.&rdquo;
                      </p>
                    </div>

                    {/* Booked Meeting Card */}
                    <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Calendar className="h-4 w-4 text-emerald-400" />
                          <span>Google Meet Call Confirmed</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          Meeting Booked ✓
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-black/60 border border-neutral-800 text-xs space-y-1">
                        <div className="font-bold text-white">SendPilot Product Intro with DataMetrics</div>
                        <div className="text-[11px] text-neutral-400">
                          Thursday, 2:00 PM – 2:30 PM (EST) • Elena Rostova (Host)
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
                        <span>Synced to HubSpot CRM: Deal Stage &quot;Meeting Scheduled&quot;</span>
                        <span className="text-emerald-400 font-bold">$18,000 Pipeline Added</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
