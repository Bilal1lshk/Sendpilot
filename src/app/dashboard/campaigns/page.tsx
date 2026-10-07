"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Plus,
  Play,
  Pause,
  Copy,
  ChevronRight,
  Sparkles,
  Check,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "wizard" | "detail">("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("c1");

  // [PLACEHOLDER DATA] Campaigns
  const [campaigns, setCampaigns] = useState([
    {
      id: "c1",
      name: "SaaS Founders Seed & Series A",
      status: "Active" as "Active" | "Paused" | "Draft",
      sender: "Alex Rivera",
      leadsCount: 248,
      sentCount: 180,
      acceptRate: 48,
      replyRate: 34,
      variantA: 44,
      variantB: 52,
    },
    {
      id: "c2",
      name: "VP Sales & RevOps Q4 Outreach",
      status: "Active" as "Active" | "Paused" | "Draft",
      sender: "Elena Rostova",
      leadsCount: 120,
      sentCount: 95,
      acceptRate: 42,
      replyRate: 28,
      variantA: 42,
      variantB: 41,
    },
    {
      id: "c3",
      name: "Design Studio Agency Leads",
      status: "Paused" as "Active" | "Paused" | "Draft",
      sender: "Alex Rivera",
      leadsCount: 84,
      sentCount: 40,
      acceptRate: 39,
      replyRate: 22,
      variantA: 38,
      variantB: 40,
    },
  ]);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState("Nordic Tech Founders");
  const [targetAudience, setTargetAudience] = useState("B2B SaaS Founders in Stockholm & Oslo");
  const [creditsRequired, setCreditsRequired] = useState(420);
  const creditsRemaining = 300;

  const toggleStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const next = c.status === "Active" ? "Paused" : "Active";
          return { ...c, status: next };
        }
        return c;
      })
    );
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

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
            Outreach campaigns
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Targeted sequences with automated follow-ups and AI A/B testing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== "list" && (
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
            >
              Back to campaigns
            </button>
          )}

          {activeTab === "list" && (
            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                setActiveTab("wizard");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New campaign</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* VIEW 1: Minimal Campaigns Table */}
      {activeTab === "list" && (
        <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/60 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Accept rate</th>
                  <th className="py-3 px-4">Reply rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {campaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaignId(camp.id);
                      setActiveTab("detail");
                    }}
                    className="group hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      {camp.name}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          camp.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {camp.status === "Active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-neutral-500 dark:text-neutral-400">
                      {camp.sender}
                    </td>
                    <td className="py-4 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                      {camp.sentCount} / {camp.leadsCount}
                    </td>
                    <td className="py-4 px-4 font-semibold text-palm-leaf-700 dark:text-palm-leaf-400">
                      {camp.acceptRate}%
                    </td>
                    <td className="py-4 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                      {camp.replyRate}%
                    </td>
                    <td className="py-4 px-4 text-right">
                      {/* Hover action reveal */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          type="button"
                          onClick={() => toggleStatus(camp.id)}
                          className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                          title={camp.status === "Active" ? "Pause campaign" : "Resume campaign"}
                        >
                          {camp.status === "Active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => alert("Campaign duplicated as Draft")}
                          className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                          title="Duplicate campaign"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* VIEW 2: Campaign Detail with Focused Funnel & A/B Variants */}
      {activeTab === "detail" && (
        <div className="space-y-6">
          <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 gap-3">
              <div>
                <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 uppercase font-semibold">
                  Campaign performance
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedCampaign.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {selectedCampaign.status}
                </span>
              </div>
            </div>

            {/* A/B Test Focus */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                A/B Message Test Comparison
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                {microcopy.feedback.abTestingNote}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Variant A */}
                <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Variant A (Direct Value)
                    </span>
                    <span className="text-palm-leaf-700 dark:text-palm-leaf-400 font-bold">
                      {selectedCampaign.variantA}% accept
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedCampaign.variantA}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-palm-leaf-500 rounded-full"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 italic">
                    &quot;Hey [First Name], saw you lead sales at [Company]. We automated account scoring...&quot;
                  </p>
                </div>

                {/* Variant B */}
                <div className="p-4 rounded-xl border border-palm-leaf-200 dark:border-palm-leaf-900/60 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      Variant B (Post Observation)
                      <span className="text-[9px] bg-palm-leaf-200 text-palm-leaf-900 font-bold px-1.5 py-0.2 rounded-full">
                        Leader
                      </span>
                    </span>
                    <span className="text-palm-leaf-800 dark:text-palm-leaf-300 font-bold">
                      {selectedCampaign.variantB}% accept
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-palm-leaf-200 dark:bg-neutral-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedCampaign.variantB}%` }}
                      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-palm-leaf-600 rounded-full"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                    &quot;Hi [First Name], really agreed with your thoughts on PLG efficiency this week...&quot;
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* VIEW 3: New Campaign Wizard with Horizontal Sliding Stepper */}
      {activeTab === "wizard" && (
        <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs max-w-2xl mx-auto">
          {/* Horizontal Stepper */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span className={wizardStep === 1 ? "font-bold text-neutral-900 dark:text-neutral-100" : ""}>
                1. Target Audience
              </span>
              <span className={wizardStep === 2 ? "font-bold text-neutral-900 dark:text-neutral-100" : ""}>
                2. AI Previews
              </span>
              <span className={wizardStep === 3 ? "font-bold text-neutral-900 dark:text-neutral-100" : ""}>
                3. Review & Credits
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <motion.div
                animate={{ width: `${(wizardStep / 3) * 100}%` }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-palm-leaf-600 rounded-full"
              />
            </div>
          </div>

          {/* Step 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Campaign name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Who are you reaching out to?
                </label>
                <textarea
                  rows={3}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 p-3 text-xs focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold"
                >
                  <span>Generate AI drafts</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Three AI Previews appearing sequentially */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-palm-leaf-700 dark:text-palm-leaf-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold">AI Generated Step 1 Sequences</span>
              </div>

              {[
                "Option 1 (Friendly Observation): Hey [Name], noticed your team expanding into EMEA...",
                "Option 2 (Direct Tooling Pitch): Hi [Name], we built a lightweight pipeline assistant...",
                "Option 3 (Peer Discussion): [Name], curious how your outbound team is handling reply qualification...",
              ].map((text, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.25 }}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs text-neutral-700 dark:text-neutral-300"
                >
                  {text}
                </motion.div>
              ))}

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold"
                >
                  Review sequence
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Credit Estimate and Gentle Amber Limit warning */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Credit Notice
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {microcopy.feedback.creditEstimateClose(creditsRequired, creditsRemaining)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Campaign launched.");
                    setActiveTab("list");
                  }}
                  className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold"
                >
                  Launch campaign
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
