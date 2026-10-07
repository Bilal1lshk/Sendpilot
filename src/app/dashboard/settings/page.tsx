"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Building,
  Bell,
  ShieldAlert,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { pageVariants, cardVariants, modalVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export default function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "team" | "danger">("general");
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);

  // Form states
  const [workspaceName, setWorkspaceName] = useState("SendPilot HQ");
  const [defaultDailyCap, setDefaultDailyCap] = useState(20);
  const [timezone, setTimezone] = useState("America/New_York (UTC-5)");

  const handleSave = () => {
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const TABS = [
    { id: "general", label: "General & Workspace" },
    { id: "team", label: "Members & Permissions" },
    { id: "danger", label: "Data & Danger Zone" },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Workspace settings
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage sending limits, workspace profile, and data controls.
          </p>
        </div>

        {/* Inline Saved check notification */}
        <div className="flex items-center gap-2">
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 font-semibold"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>{microcopy.feedback.savedChanges}</span>
            </motion.div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all"
          >
            Save changes
          </button>
        </div>
      </motion.div>

      {/* Tabs with Sliding Underline */}
      <div className="relative border-b border-neutral-200/80 dark:border-neutral-800 flex gap-6 text-xs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative pb-3 font-medium transition-colors ${
                isActive
                  ? "text-palm-leaf-950 dark:text-palm-leaf-200 font-semibold"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="settings-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-palm-leaf-600"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: General Form */}
      {activeTab === "general" && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Workspace name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Default daily requests cap (per account)
            </label>
            <input
              type="number"
              value={defaultDailyCap}
              onChange={(e) => setDefaultDailyCap(Number(e.target.value))}
              className="w-32 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              We recommend 15 to 25 invites to preserve account reputation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Operating timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
            >
              <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
              <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8)</option>
              <option value="Europe/London (UTC+0)">Europe/London (UTC+0)</option>
              <option value="Europe/Berlin (UTC+1)">Europe/Berlin (UTC+1)</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* TAB 2: Team Members */}
      {activeTab === "team" && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Workspace members
              </h3>
              <p className="text-[11px] text-neutral-400">
                Teammates can link their own LinkedIn profiles and share lead lists.
              </p>
            </div>
            <button
              type="button"
              onClick={() => alert("Invite modal placeholder")}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Invite member
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Alex Rivera (You)</p>
                <p className="text-[11px] text-neutral-400">alex@sendpilot.io</p>
              </div>
              <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-medium">
                Workspace Owner
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Elena Rostova</p>
                <p className="text-[11px] text-neutral-400">elena@sendpilot.io</p>
              </div>
              <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: Calm Danger Zone with One-Sentence Confirm Dialog */}
      {activeTab === "danger" && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-6"
        >
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Data retention & disconnects
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Permanently revoke integrations or wipe workspace leads.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Wipe all imported leads
              </p>
              <p className="text-[11px] text-neutral-400">
                Removes all prospects and history from this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDangerModalOpen(true)}
              className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Wipe leads
            </button>
          </div>
        </motion.div>
      )}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {dangerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Confirm Lead Database Wipe
                </h4>
              </div>

              {/* One sentence explaining exactly what will happen */}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                This will permanently delete all 2,480 leads and their associated conversation history from your workspace.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDangerModalOpen(false)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDangerModalOpen(false);
                    alert("Lead database wiped.");
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 font-semibold"
                >
                  Confirm and wipe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
