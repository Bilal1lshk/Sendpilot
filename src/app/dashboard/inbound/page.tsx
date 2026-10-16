"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Calendar,
  Eye,
  ThumbsUp,
  UserCheck,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { pageVariants, cardVariants } from "@/lib/motion";

export interface ReplySuggestionItem {
  id: string;
  prospect: string;
  replyText: string;
  aiSuggestion: string;
  isNew: boolean;
}

const SAMPLE_DEMO_REPLIES: ReplySuggestionItem[] = [
  {
    id: "sample_r1",
    prospect: "Jordan Lee (Growth Consultant)",
    replyText: "Sounds interesting, what is your pricing model?",
    aiSuggestion: "Hi Jordan, we charge based on active sender seats with unlimited contact scoring. Would you prefer a quick 5-min walk-through?",
    isNew: true,
  },
  {
    id: "sample_r2",
    prospect: "Elena Rostova (RevOps)",
    replyText: "Let's connect next week after our planning sprint.",
    aiSuggestion: "Sounds great Elena! I'll hold some time on Thursday. Here's my direct link whenever you're ready: cal.com/sendpilot",
    isNew: false,
  },
];

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLeadsIfNeeded } from "@/store/slices/databaseSlice";

export default function InboundAutomationPage() {
  const dispatch = useAppDispatch();
  const { items: leads, loading: storeLoading, loaded: storeLoaded } = useAppSelector(
    (state) => state.database.leads
  );
  const loading = storeLoading && !storeLoaded;
  const realLeadsCount = leads.length;

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [disabledAutomationIds, setDisabledAutomationIds] = useState<string[]>(["a3"]);

  useEffect(() => {
    dispatch(fetchLeadsIfNeeded());
  }, [dispatch]);

  const repliedLeads = leads.filter(
    (l) => l.status === "replied" || l.status === "interested"
  );

  const realReplySuggestions: ReplySuggestionItem[] = repliedLeads.map((l, idx) => ({
    id: l._id || l.id || `rep_${idx}`,
    prospect: `${l.fullName || l.name || "Prospect"} (${l.company || l.title || "Target Lead"})`,
    replyText:
      l.notes ||
      "Thanks for reaching out! Could you share more details on how SendPilot integrates with our CRM?",
    aiSuggestion: `Hi ${
      l.fullName ? l.fullName.split(" ")[0] : "there"
    }, glad to hear from you! We support direct 1-click webhook & CSV exports. Let's set up a quick 10-min overview call this week.`,
    isNew: idx === 0,
  }));

  const replySuggestions = isDemoMode ? SAMPLE_DEMO_REPLIES : realReplySuggestions;

  const automations = [
    {
      id: "a1",
      title: "Profile Visit Follow-up",
      description: "When a target persona views your profile, queue a soft connection invite within 4 hours.",
      icon: Eye,
      enabled: !disabledAutomationIds.includes("a1"),
      liveStat: leads.length > 0 ? `${leads.length} leads eligible` : "0 leads queued",
    },
    {
      id: "a2",
      title: "Post Engagement Auto-Capture",
      description: "Capture everyone who likes or comments on your industry thought leadership posts.",
      icon: ThumbsUp,
      enabled: !disabledAutomationIds.includes("a2"),
      liveStat: leads.length > 0 ? `${Math.round(leads.length * 0.4)} captured` : "0 captured",
    },
    {
      id: "a3",
      title: "Instant Acceptance Welcome",
      description: "Send a friendly greeting within 30 minutes of a prospect accepting your connection.",
      icon: UserCheck,
      enabled: !disabledAutomationIds.includes("a3"),
      liveStat: "Paused",
    },
    {
      id: "a4",
      title: "Meeting Scheduler Linker",
      description: "Detect calendar interest in replies and automatically present your booking link.",
      icon: Calendar,
      enabled: !disabledAutomationIds.includes("a4"),
      liveStat: "Active",
    },
  ];

  const toggleAutomation = (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;
    toast.success(`${target.title} ${nextEnabled ? "activated" : "paused"}`);
    setDisabledAutomationIds((prev) =>
      nextEnabled ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleDemo = () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      toast.info("Cleared demo suggestions. Displaying real database data.");
    } else {
      setIsDemoMode(true);
      toast.success("Loaded sample reply suggestions for preview.");
    }
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
            Inbound automation
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Turn profile visitors, post engagements, and acceptances into warm pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleDemo}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isDemoMode
                ? "bg-palm-leaf-100 dark:bg-palm-leaf-950/40 text-palm-leaf-800 dark:text-palm-leaf-300 border-palm-leaf-300 dark:border-palm-leaf-700"
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isDemoMode ? "Exit Demo Preview" : "Preview Demo Suggestions"}
          </button>
          <button
            onClick={() => dispatch(fetchLeadsIfNeeded({ force: true }))}
            disabled={loading}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Assisted reply suggestions
              </h3>
              {isDemoMode && (
                <span className="px-2 py-0.5 text-[10px] rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Demo Preview
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review AI drafts generated from prospect replies.
            </p>
          </div>
        </div>

        {replySuggestions.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 text-neutral-400">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              No prospect replies yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-4">
              When prospects reply to your automated outreach or accept connection requests, SendPilot AI will generate instant response suggestions here.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-palm-leaf-600 text-white hover:bg-palm-leaf-700 transition-colors shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Preview Sample Suggestions
              </button>
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
              >
                <Database className="h-3.5 w-3.5" />
                View Leads Database
              </Link>
            </div>
          </div>
        ) : (
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
        )}
      </motion.div>
    </motion.div>
  );
}
