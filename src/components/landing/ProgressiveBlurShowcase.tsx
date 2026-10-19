"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProgressiveBlur } from "@/registry/magicui/progressive-blur";
import {
  Sparkles,
  Layers,
  Send,
  UserCheck,
  Calendar,
  MessageSquare,
  TrendingUp,
  Bot,
  Zap,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { pageVariants, cardVariants } from "@/lib/motion";

// The canonical ProgressiveBlurDemo requested by the user
export function ProgressiveBlurDemo() {
  return (
    <div className="relative w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
      <ScrollArea className="relative h-[400px] overflow-hidden">
        <div className="flex flex-col gap-2.5 p-4">
          {Array.from({ length: 20 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(index * 0.03, 0.4),
                ease: "easeOut",
              }}
              whileHover={{ scale: 1.015, x: 3 }}
              className="bg-card flex h-16 w-full items-center justify-between px-5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-xs hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Outbound Sequence Item #{index + 1}
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Active • 200 OK
              </span>
            </motion.div>
          ))}
        </div>
        <ProgressiveBlur position="bottom" height="40%" />
      </ScrollArea>
    </div>
  );
}

// Live simulated activity stream for the interactive showcase
const OUTBOUND_EVENTS = [
  {
    id: 1,
    type: "reply",
    icon: MessageSquare,
    iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    name: "Alex Rivera",
    role: "VP of Enterprise Sales • Stripe",
    action: "Replied to Sequence Step 2",
    detail: "“Sounds compelling, let's connect for 15 mins this Thursday afternoon.”",
    score: "98 Fit",
    time: "2m ago",
  },
  {
    id: 2,
    type: "meeting",
    icon: Calendar,
    iconColor: "text-purple-600 bg-purple-500/10 border-purple-500/20",
    name: "Sarah Chen",
    role: "Head of Growth • Ramp",
    action: "Demo Call Booked",
    detail: "Calendar invite confirmed via automated LinkedIn AI scheduler.",
    score: "95 Fit",
    time: "6m ago",
  },
  {
    id: 3,
    type: "accepted",
    icon: UserCheck,
    iconColor: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    name: "Marcus Vance",
    role: "Chief Revenue Officer • Datadog",
    action: "Accepted Connection Request",
    detail: "Enriched with direct verified phone and mobile contact info.",
    score: "92 Fit",
    time: "11m ago",
  },
  {
    id: 4,
    type: "ai_icebreaker",
    icon: Bot,
    iconColor: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    name: "Elena Rostova",
    role: "Director of Demand Gen • Snowflake",
    action: "AI Tailored Message Dispatched",
    detail: "Hook: “Noticed Snowflake's recent expansion into EMEA data clusters...”",
    score: "96 Fit",
    time: "18m ago",
  },
  {
    id: 5,
    type: "sent",
    icon: Send,
    iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    name: "David Kim",
    role: "VP Marketing • Figma",
    action: "Smart Follow-up Delivered",
    detail: "Step 3 sent 3 days after connection acceptance without response.",
    score: "89 Fit",
    time: "24m ago",
  },
  {
    id: 6,
    type: "optimization",
    icon: TrendingUp,
    iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    name: "Campaign Engine",
    role: "Autonomous Optimization",
    action: "A/B Subject Variant Auto-Promoted",
    detail: "Variant B yielded +23.4% response lift over the last 150 sends.",
    score: "+23.4%",
    time: "32m ago",
  },
  {
    id: 7,
    type: "accepted",
    icon: UserCheck,
    iconColor: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    name: "Jessica Hayes",
    role: "VP Engineering • Vercel",
    action: "Accepted Connection Request",
    detail: "Engaged with the latest technical post on distributed workflows.",
    score: "94 Fit",
    time: "41m ago",
  },
  {
    id: 8,
    type: "reply",
    icon: MessageSquare,
    iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    name: "Liam O'Connor",
    role: "Founder & CEO • Hyperscale.ai",
    action: "Positive Feedback Received",
    detail: "“Great timing. Send over the deck and let's schedule time next week.”",
    score: "99 Fit",
    time: "48m ago",
  },
  {
    id: 9,
    type: "ai_icebreaker",
    icon: Zap,
    iconColor: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    name: "Rachel Goldman",
    role: "SVP Strategy • Cloudflare",
    action: "Intent Trigger Detected",
    detail: "Trigger: Company posted 14 new Senior SDR roles in past 7 days.",
    score: "97 Fit",
    time: "55m ago",
  },
  {
    id: 10,
    type: "sent",
    icon: Send,
    iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    name: "Carlos Mendez",
    role: "VP Sales Ops • HubSpot",
    action: "Personalized Outreach Sent",
    detail: "Referenced mutual connection with enterprise account team.",
    score: "91 Fit",
    time: "1h ago",
  },
];

export function ProgressiveBlurShowcase() {
  const [blurPosition, setBlurPosition] = useState<"bottom" | "top" | "both">("bottom");
  const [blurHeight, setBlurHeight] = useState<string>("40%");
  const [activeTab, setActiveTab] = useState<"live" | "demo">("live");

  return (
    <section className="py-20 md:py-28 bg-neutral-50/60 dark:bg-neutral-950/60 border-y border-neutral-200 dark:border-neutral-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Real-Time Stream Engine</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight"
          >
            Live Activity & Conversion Stream
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            Monitor real-time prospect discovery, AI-crafted touches, and confirmed demo bookings across active campaigns.
          </motion.p>
        </div>

        {/* Interactive Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
        >
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("live")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "live"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              Live Campaign Feed
            </button>
            <button
              onClick={() => setActiveTab("demo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "demo"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              ProgressiveBlur Demo
            </button>
          </div>

          {/* Blur Position Config */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="h-3 w-3" /> Position:
            </span>
            {(["bottom", "top", "both"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setBlurPosition(pos)}
                className={`text-xs px-2.5 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                  blurPosition === pos
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Blur Height Config */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Height:
            </span>
            {["25%", "40%", "55%"].map((h) => (
              <button
                key={h}
                onClick={() => setBlurHeight(h)}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  blurHeight === h
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main Display Container */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "demo" ? (
              <motion.div
                key="demo"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      ProgressiveBlur Demo Container
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      position=&quot;{blurPosition}&quot; height=&quot;{blurHeight}&quot;
                    </span>
                  </div>

                  <ScrollArea className="relative h-[420px] overflow-hidden">
                    <div className="flex flex-col gap-2.5 p-4">
                      {Array.from({ length: 20 }).map((_, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: Math.min(index * 0.025, 0.35),
                          }}
                          className="bg-card flex h-16 w-full items-center justify-between px-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {index}
                            </div>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              Scroll Stream Block #{index}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-neutral-400">
                            Layer {index + 1} of 20
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <ProgressiveBlur position={blurPosition} height={blurHeight} />
                  </ScrollArea>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="live"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md overflow-hidden">
                  {/* Top Bar with Live Indicator */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-neutral-800 dark:text-neutral-200">
                        Live Multi-Channel Outreach Dispatcher
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      <span>10 Active Prospects</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">99.4% Delivery</span>
                    </div>
                  </div>

                  {/* Scrollable Live Activity Feed with Progressive Blur */}
                  <ScrollArea className="relative h-[440px] overflow-hidden">
                    <div className="flex flex-col gap-2.5 p-4">
                      {OUTBOUND_EVENTS.map((event, idx) => {
                        const Icon = event.icon;
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.25,
                              delay: idx * 0.04,
                              ease: "easeOut",
                            }}
                            className="flex items-start justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                          >
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${event.iconColor} shadow-xs mt-0.5`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                    {event.name}
                                  </h4>
                                  <span className="text-[11px] text-neutral-400 font-medium">
                                    • {event.role}
                                  </span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{event.action}</span>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                  {event.detail}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[11px] font-mono font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                                {event.score}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                {event.time}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* The Layered Progressive Blur Overlay */}
                    <ProgressiveBlur position={blurPosition} height={blurHeight} />
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
