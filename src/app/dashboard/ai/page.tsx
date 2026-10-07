"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Edit2,
  RotateCw,
  Check,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { pageVariants, cardVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [approvedDraftId, setApprovedDraftId] = useState<string | null>(null);

  // Suggested prompts as soft chips
  const SUGGESTED_CHIPS = [
    "Write a friendly icebreaker for Series A founders",
    "Personalize follow-up for leads who haven't replied in 3 days",
    "Draft a conversational message referencing a prospect's recent hire",
  ];

  // Editable drafts
  const [drafts, setDrafts] = useState([
    {
      id: "d1",
      leadName: "Sarah Chen",
      leadTitle: "Head of Growth @ Stripe",
      content:
        "Hi Sarah, saw your recent talk on self-serve expansion. We built an AI assistant that scores inbound leads without messy forms. Would love to share our 2-min breakdown if you're curious!",
      approved: false,
    },
    {
      id: "d2",
      leadName: "Marcus Vance",
      leadTitle: "VP of Product @ Linear Dynamics",
      content:
        "Hey Marcus, love how Linear approaches craft. We've been thinking a lot about friction in sales tooling—happy to trade notes whenever convenient.",
      approved: false,
    },
  ]);

  const handleSendPrompt = (text: string) => {
    if (!text.trim()) return;
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setDrafts((prev) => [
        {
          id: `d_${Date.now()}`,
          leadName: "New Prospect",
          leadTitle: "Co-Founder",
          content: `Hi there, noticed your team's recent announcement. Thought I'd reach out regarding your pipeline infrastructure.`,
          approved: false,
        },
        ...prev,
      ]);
      setPrompt("");
    }, 1200);
  };

  const handleApprove = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, approved: true } : d))
    );
    setApprovedDraftId(id);
    setTimeout(() => setApprovedDraftId(null), 2500);
  };

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
            AI outreach assistant
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Generate personal icebreakers and contextual follow-ups.
          </p>
        </div>

        {/* Calm Always-Visible Reminder */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-300">
          <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>{microcopy.feedback.aiDisclaimer}</span>
        </div>
      </motion.div>

      {/* Main Grid: Left Chat/Prompt + Right Editable Drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Prompt & Suggested Chips */}
        <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Ask SendPilot AI to draft icebreakers, refine objection handling, or rewrite a message to sound more natural.
            </p>

            {/* Suggested Chips */}
            <div>
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider block mb-2">
                Suggested prompts
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(chip);
                      handleSendPrompt(chip);
                    }}
                    className="text-left text-xs px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 text-neutral-700 dark:text-neutral-300 hover:border-palm-leaf-400 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Thinking State: Three softly pulsing dots */}
            {isThinking && (
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 flex items-center gap-2">
                <span className="text-xs text-neutral-500">Drafting personalized lines</span>
                <div className="flex items-center gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 animate-pulse delay-100" />
                  <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 animate-pulse delay-200" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="relative">
              <textarea
                rows={3}
                placeholder="Type instructions for your outreach message..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 p-3 pr-10 text-xs focus:outline-none focus:border-palm-leaf-500"
              />
              <button
                type="button"
                onClick={() => handleSendPrompt(prompt)}
                disabled={!prompt.trim() || isThinking}
                className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-40 text-white transition-all"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right: Editable Draft Cards */}
        <motion.div variants={cardVariants} className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            Generated message drafts
          </h3>

          <div className="space-y-3">
            {drafts.map((draft) => (
              <motion.div
                key={draft.id}
                layout
                className={`rounded-2xl border p-4 transition-all ${
                  draft.approved
                    ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {draft.leadName}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {draft.leadTitle}
                  </span>
                </div>

                <div className="mt-2.5">
                  <textarea
                    rows={3}
                    defaultValue={draft.content}
                    className="w-full bg-transparent text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  {draft.approved ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{microcopy.feedback.approvalSuccess}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => alert("Refining draft with alternate phrasing...")}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Regenerate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(draft.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3 py-1 text-xs font-semibold shadow-2xs transition-colors"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
