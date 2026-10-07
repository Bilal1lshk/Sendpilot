"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Pause,
  Play,
  RotateCw,
  Trash2,
  AlertCircle,
  Plus,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { pageVariants, cardVariants, drawerVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export default function LinkedInAccountsPage() {
  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);

  // [PLACEHOLDER DATA] Accounts state
  const [accounts, setAccounts] = useState([
    {
      id: "acc_1",
      name: "Alex Rivera",
      headline: "Sales Director @ SendPilot",
      type: "Sales Navigator",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      status: "Active" as "Active" | "Paused" | "Disconnected",
      connectedDate: "Aug 12, 2026",
      usedToday: 18,
      dailyCap: 25,
      warmupStage: 3, // 1 to 3
    },
    {
      id: "acc_2",
      name: "Elena Rostova",
      headline: "Founder & CEO @ SendPilot",
      type: "LinkedIn Premium",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      status: "Active" as "Active" | "Paused" | "Disconnected",
      connectedDate: "Sep 04, 2026",
      usedToday: 12,
      dailyCap: 15,
      warmupStage: 2,
    },
    {
      id: "acc_3",
      name: "Jordan Lee",
      headline: "Growth Consultant",
      type: "LinkedIn Free",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
      status: "Disconnected" as "Active" | "Paused" | "Disconnected",
      connectedDate: "Jul 19, 2026",
      usedToday: 0,
      dailyCap: 15,
      warmupStage: 1,
    },
  ]);

  const togglePause = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const nextStatus = acc.status === "Active" ? "Paused" : "Active";
          return { ...acc, status: nextStatus };
        }
        return acc;
      })
    );
  };

  const reconnect = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: "Active" } : acc))
    );
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const disconnectedAccount = accounts.find((a) => a.status === "Disconnected");

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
            LinkedIn accounts
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Sender profiles, safe daily caps, and warm-up progression.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSecurityPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-palm-leaf-400 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Security notes</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Redirecting to LinkedIn official sign-in...")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect account</span>
          </button>
        </div>
      </motion.div>

      {/* Disconnected account friendly banner: No alarm colours, calm wording */}
      {disconnectedAccount && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {microcopy.feedback.disconnectedNotice(disconnectedAccount.name)}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                LinkedIn sessions expire periodically. Reconnect to resume scheduled steps.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reconnect(disconnectedAccount.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 shadow-2xs shrink-0 self-start sm:self-center"
          >
            <RotateCw className="h-3 w-3 text-palm-leaf-600" />
            <span>Reconnect</span>
          </button>
        </motion.div>
      )}

      {/* Spacious Account Cards */}
      <div className="space-y-4">
        {accounts.map((acc) => {
          const usagePercent = Math.min((acc.usedToday / acc.dailyCap) * 100, 100);

          return (
            <motion.div
              key={acc.id}
              variants={cardVariants}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs hover:border-neutral-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Avatar, Name, Status line */}
                <div className="flex items-start gap-4">
                  <div className="relative h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0">
                    <LinkedInIcon className="h-6 w-6 text-[#0a66c2]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {acc.name}
                      </h3>
                      <span className="text-[11px] text-neutral-400">
                        ({acc.type})
                      </span>
                    </div>

                    {/* Single human status line */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                        {acc.status === "Active" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-medium text-emerald-800 dark:text-emerald-300">Active</span>
                          </>
                        ) : acc.status === "Paused" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">Paused</span>
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span className="font-medium text-rose-700 dark:text-rose-400">Disconnected</span>
                          </>
                        )}
                        <span className="text-neutral-400">•</span>
                        <span>
                          {acc.usedToday} of {acc.dailyCap} requests used today.
                        </span>
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-1">
                      Connected {acc.connectedDate}
                    </p>
                  </div>
                </div>

                {/* Middle: Usage Progress & 3 Warm-up steps */}
                <div className="flex-1 max-w-sm space-y-3">
                  {/* Thin usage bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                      <span>Daily requests</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {acc.usedToday} / {acc.dailyCap}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${usagePercent}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-palm-leaf-500"
                      />
                    </div>
                  </div>

                  {/* 3 Warm-up steps with current gently highlighted */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                      <span>Warm-up progression</span>
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">
                        Stage {acc.warmupStage} of 3
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((stage) => {
                        const isCurrent = acc.warmupStage === stage;
                        const isCompleted = acc.warmupStage > stage;
                        return (
                          <div
                            key={stage}
                            className={`h-1.5 rounded-full transition-colors ${
                              isCompleted
                                ? "bg-palm-leaf-600"
                                : isCurrent
                                ? "bg-palm-leaf-400"
                                : "bg-neutral-200 dark:bg-neutral-800"
                            }`}
                            title={`Stage ${stage}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  {acc.status === "Disconnected" ? (
                    <button
                      type="button"
                      onClick={() => reconnect(acc.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Reconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePause(acc.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
                    >
                      {acc.status === "Active" ? (
                        <>
                          <Pause className="h-3 w-3 text-neutral-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 text-palm-leaf-600" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAccount(acc.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove profile"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security Side Panel with Soft Slide */}
      <AnimatePresence>
        {securityPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSecurityPanelOpen(false)}
              className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs"
            />
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-palm-leaf-700 dark:text-palm-leaf-400">
                    <ShieldCheck className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Security & Privacy
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecurityPanelOpen(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      What we store
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      We store your profile name, email, avatar photo, and OAuth token so outreach sequences can authenticate as you.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      What we never do
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      We never ask for your LinkedIn password, never scrape private inboxes without permission, and never send high-volume mass spam.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      Account safety limits
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Every connected profile is throttled to 15–25 connection requests per day with randomized intervals to keep your reputation intact.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      How to disconnect
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Click Remove on any card, or revoke SendPilot access directly from your LinkedIn Settings &gt; Data Privacy &gt; Other applications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSecurityPanelOpen(false)}
                  className="w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
