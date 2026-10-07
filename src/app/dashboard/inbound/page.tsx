"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Flame,
  Calendar,
  MessageSquare,
  Sparkles,
  Eye,
  CheckCircle2,
  ThumbsUp,
  UserCheck,
} from "lucide-react";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";

export default function InboundAutomationPage() {
  // Four large, minimal cards with smooth toggles & live stats
  const [automations, setAutomations] = useState([
    {
      id: "a1",
      title: "Profile Visit Follow-up",
      description: "When a target persona views your profile, queue a soft connection invite within 4 hours.",
      icon: Eye,
      enabled: true,
      liveStat: "6 leads this month",
    },
    {
      id: "a2",
      title: "Post Engagement Auto-Capture",
      description: "Capture everyone who likes or comments on your industry thought leadership posts.",
      icon: ThumbsUp,
      enabled: true,
      liveStat: "34 leads captured",
    },
    {
      id: "a3",
      title: "Instant Acceptance Welcome",
      description: "Send a friendly greeting within 30 minutes of a prospect accepting your connection.",
      icon: UserCheck,
      enabled: false,
      liveStat: "Paused",
    },
    {
      id: "a4",
      title: "Meeting Scheduler Linker",
      description: "Detect calendar interest in replies and automatically present your booking link.",
      icon: Calendar,
      enabled: true,
      liveStat: "12 meetings booked",
    },
  ]);

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  // Reply suggestions quiet list
  const [replySuggestions, setReplySuggestions] = useState([
    {
      id: "r1",
      prospect: "Jordan Lee (Growth Consultant)",
      replyText: "Sounds interesting, what is your pricing model?",
      aiSuggestion: "Hi Jordan, we charge based on active sender seats with unlimited contact scoring. Would you prefer a quick 5-min walk-through?",
      isNew: true,
    },
    {
      id: "r2",
      prospect: "Elena Rostova (RevOps)",
      replyText: "Let's connect next week after our planning sprint.",
      aiSuggestion: "Sounds great Elena! I'll hold some time on Thursday. Here's my direct link whenever you're ready: cal.com/sendpilot",
      isNew: false,
    },
  ]);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Inbound automation
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Turn profile visitors, post engagements, and acceptances into warm pipeline.
          </p>
        </div>
      </motion.div>

      {/* Four Large Minimal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((item) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.id}
              variants={cardVariants}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {item.title}
                    </h3>
                  </div>

                  {/* Smooth sliding toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAutomation(item.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      item.enabled ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        item.enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Small live stat under each card */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Live impact</span>
                <span className="font-semibold text-palm-leaf-700 dark:text-palm-leaf-400">
                  {item.liveStat}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Reply Suggestions: Quiet List with Gentle Highlight for New Items */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Assisted reply suggestions
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review AI drafts generated from prospect replies.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {replySuggestions.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border text-xs transition-colors ${
                item.isNew
                  ? "bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 border-palm-leaf-200/60 dark:border-palm-leaf-900/40"
                  : "bg-neutral-50/50 dark:bg-neutral-950/40 border-neutral-200/60 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.prospect}
                </span>
                {item.isNew && (
                  <span className="text-[10px] bg-palm-leaf-200 text-palm-leaf-900 font-bold px-1.5 py-0.2 rounded-full">
                    New reply
                  </span>
                )}
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 italic mb-2">
                &ldquo;{item.replyText}&rdquo;
              </p>
              <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                <span className="text-[10px] text-palm-leaf-700 font-semibold block mb-0.5">
                  Suggested response
                </span>
                {item.aiSuggestion}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
