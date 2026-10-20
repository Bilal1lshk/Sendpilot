"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket,
  CheckCircle2,
  Clock,
  Send,
  Users,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  Tag,
  Check,
  X,
  FileText,
} from "lucide-react";
import { SequenceStepItem, LeadItem, EnrollmentMode } from "./types";
import { toast } from "sonner";

interface Step3ReviewLaunchProps {
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  targetAudience: string;
  onTargetAudienceChange: (aud: string) => void;
  dailyCap: number;
  onDailyCapChange: (cap: number) => void;
  selectedLeadIds: string[];
  enrollmentMode: EnrollmentMode;
  totalDatabaseLeads: number;
  databaseLeads: LeadItem[];
  steps: SequenceStepItem[];
  flowName: string;
  availableAccountsCount: number;
  isLaunching: boolean;
  onLaunch: (launchNow: boolean) => void;
  onBack: () => void;
  onEditStep: (stepNumber: 1 | 2) => void;
}

export function Step3ReviewLaunch({
  campaignName,
  onCampaignNameChange,
  targetAudience,
  onTargetAudienceChange,
  dailyCap,
  onDailyCapChange,
  selectedLeadIds,
  enrollmentMode,
  totalDatabaseLeads,
  databaseLeads,
  steps,
  flowName,
  availableAccountsCount,
  isLaunching,
  onLaunch,
  onBack,
  onEditStep,
}: Step3ReviewLaunchProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Enrolled leads count & breakdown
  const finalLeadCount =
    enrollmentMode === "later"
      ? 0
      : enrollmentMode === "all"
      ? totalDatabaseLeads
      : selectedLeadIds.length;

  // Breakdown of selected leads by group
  const groupBreakdown = useMemo(() => {
    if (enrollmentMode === "later") return {};
    const selectedSet =
      enrollmentMode === "all"
        ? new Set(databaseLeads.map((l) => l.id))
        : new Set(selectedLeadIds);

    const counts: Record<string, number> = {};
    databaseLeads.forEach((l) => {
      if (selectedSet.has(l.id)) {
        const grp = (l.group || "").trim() || "Unassigned";
        counts[grp] = (counts[grp] || 0) + 1;
      }
    });
    return counts;
  }, [enrollmentMode, totalDatabaseLeads, selectedLeadIds, databaseLeads]);

  // Validation checks
  const isNameValid = campaignName.trim().length > 0;
  const connectStep = steps.find((s) => s.type === "connect");
  const isConnectNoteValid = !connectStep || connectStep.template.length <= 300;
  const hasActionableSteps = steps.some((s) => s.type === "connect" || s.type === "message");
  const hasConnectedAccount = availableAccountsCount > 0;

  const canLaunchNow = isNameValid && isConnectNoteValid && hasActionableSteps && hasConnectedAccount && finalLeadCount > 0;

  const handleOpenLaunchConfirmation = () => {
    if (!isNameValid) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!hasActionableSteps) {
      toast.error("Sequence needs at least one connection request or message step");
      return;
    }
    if (!isConnectNoteValid) {
      toast.error("Connection request note exceeds 300 characters limit");
      return;
    }
    if (!hasConnectedAccount) {
      toast.error("No LinkedIn sender account connected. You can save this campaign as Draft.");
      return;
    }
    if (finalLeadCount === 0) {
      toast.error("No leads enrolled. Select leads or save this campaign as Draft.");
      return;
    }
    setShowConfirmModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 uppercase font-bold tracking-wider">
          Step 3 of 3 • Final Verification
        </span>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Review and Launch Campaign
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Verify your campaign configuration, prospect audience, and cadence before launching.
        </p>
      </div>

      {/* Campaign Details Configuration */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => onCampaignNameChange(e.target.value)}
              placeholder="e.g., Enterprise B2B Decision Makers #1"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3.5 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Target Audience Description
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => onTargetAudienceChange(e.target.value)}
              placeholder="e.g., B2B SaaS Founders, Series A VPs of Engineering"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3.5 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            Daily Connection Sending Cap
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={100}
              value={dailyCap}
              onChange={(e) => onDailyCapChange(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
              className="w-28 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-palm-leaf-500"
            />
            <span className="text-xs text-neutral-500">
              requests / day (Recommended: 15–25 to preserve LinkedIn account reputation)
            </span>
          </div>
        </div>
      </div>

      {/* Summary Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Enrolled Prospects */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-palm-leaf-600" />
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Enrolled Prospects
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit Leads</span>
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {finalLeadCount}
            </span>
            <span className="text-xs text-neutral-500">
              {enrollmentMode === "later" ? "prospects (enroll later)" : "prospects queued for outreach"}
            </span>
          </div>

          {/* Group breakdown tags */}
          {Object.keys(groupBreakdown).length > 0 && (
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                Breakdown by Lead Group:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(groupBreakdown).map(([grpName, count]) => (
                  <span
                    key={grpName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    <Tag className="h-2.5 w-2.5 text-palm-leaf-600" />
                    <span>{grpName}:</span>
                    <strong className="text-neutral-900 dark:text-neutral-100">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: LinkedIn Sender Account Status */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-palm-leaf-600" />
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Sender Account Status
              </h3>
            </div>
          </div>

          {hasConnectedAccount ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>LinkedIn Sender Connected & Ready</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Outbound connections will be sent through your verified LinkedIn profile at a rate of {dailyCap} per day.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold border border-amber-200/60">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>No LinkedIn Sender Account</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You can save this campaign as <strong>Draft</strong> now, then connect your account from the dashboard before starting sends.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Complete Sequence Cadence Preview */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Configured Sequence: {flowName || "Custom Flow"}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {steps.filter((s) => s.type !== "wait").length} message touches scheduled
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer"
          >
            <Edit3 className="h-3 w-3" />
            <span>Edit Sequence</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {steps.map((st, i) => {
            if (st.type === "wait") {
              return (
                <div key={i} className="flex items-center gap-2 pl-4 text-xs text-neutral-500">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Wait <strong>{st.delayDays} days</strong> before next touchpoint</span>
                </div>
              );
            }
            return (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-neutral-50/60 dark:bg-neutral-950/40 border border-neutral-200/80 dark:border-neutral-800 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-palm-leaf-600 font-bold">•</span>
                    <span>{st.type === "connect" ? "Step 1: Connection Request Note" : "Follow-Up Message"}</span>
                  </div>
                  {st.type === "connect" && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {st.template.length}/300 chars
                    </span>
                  )}
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 italic line-clamp-3 leading-relaxed">
                  &quot;{st.template}&quot;
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-launch Checklist */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 space-y-2">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
          Pre-Launch Checklist:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            {isNameValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            )}
            <span className={isNameValid ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-rose-600 font-medium"}>
              Campaign name provided
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isConnectNoteValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            )}
            <span className={isConnectNoteValid ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-rose-600 font-medium"}>
              Connection note within 300 chars
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasActionableSteps ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            )}
            <span className={hasActionableSteps ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-rose-600 font-medium"}>
              Valid sequence cadence
            </span>
          </div>

          <div className="flex items-center gap-2">
            {finalLeadCount > 0 || enrollmentMode === "later" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">
              {finalLeadCount > 0 ? `${finalLeadCount} prospects selected` : "Draft mode (0 enrolled leads)"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation & Action Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sequence</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Save as Draft option */}
          <button
            type="button"
            disabled={isLaunching || !isNameValid}
            onClick={() => onLaunch(false)}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>

          {/* Launch Campaign Button */}
          <button
            type="button"
            disabled={isLaunching || !canLaunchNow}
            onClick={handleOpenLaunchConfirmation}
            className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isLaunching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Rocket className="h-3.5 w-3.5" />
                <span>Launch Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Launch Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 mx-auto flex items-center justify-center">
                <Rocket className="h-6 w-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Ready to Launch {campaignName}?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  This will queue connection requests for <strong>{finalLeadCount}</strong> enrolled prospects through your LinkedIn sender account at a limit of <strong>{dailyCap}</strong> sends/day.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Prospects:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{finalLeadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Flow:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{flowName || "Custom Flow"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Daily Send Rate:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{dailyCap} / day</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLaunching}
                  onClick={() => {
                    setShowConfirmModal(false);
                    onLaunch(true);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Launching...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="h-3.5 w-3.5" />
                      <span>Confirm & Launch</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
