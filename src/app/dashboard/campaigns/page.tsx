"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export interface CampaignItem {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Draft";
  sender: string;
  leadsCount: number;
  sentCount: number;
  acceptRate: number;
  replyRate: number;
  variantA: number;
  variantB: number;
}

export interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  dailyCap: number;
  sentToday: number;
  remainingToday: number;
  funnel: { stage: string; count: number }[];
}

const SAMPLE_DEMO_CAMPAIGNS: CampaignItem[] = [
  {
    id: "sample_c1",
    name: "SaaS Founders Seed & Series A",
    status: "Active",
    sender: "Connected Account",
    leadsCount: 248,
    sentCount: 180,
    acceptRate: 48,
    replyRate: 34,
    variantA: 44,
    variantB: 52,
  },
  {
    id: "sample_c2",
    name: "VP Sales & RevOps Outreach",
    status: "Active",
    sender: "Connected Account",
    leadsCount: 120,
    sentCount: 95,
    acceptRate: 42,
    replyRate: 28,
    variantA: 42,
    variantB: 41,
  },
];

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "wizard" | "detail">("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [availableLeadsCount, setAvailableLeadsCount] = useState(0);
  const [availableAccountsCount, setAvailableAccountsCount] = useState(0);

  // Real campaigns from database
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState("Targeted Industry Sequence #1");
  const [targetAudience, setTargetAudience] = useState("B2B SaaS Decision Makers");
  const [creditsRequired, setCreditsRequired] = useState(120);
  const creditsRemaining = 300;

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (data.success && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
        if (data.campaigns.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(data.campaigns[0].id);
        }
        if (typeof data.availableLeadsCount === "number") setAvailableLeadsCount(data.availableLeadsCount);
        if (typeof data.availableAccountsCount === "number") setAvailableAccountsCount(data.availableAccountsCount);
      }
    } catch (err) {
      console.warn("Could not fetch campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const toggleStatus = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "Paused" : "Active";

    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus.toLowerCase() }),
      });
      toast.success(`Campaign marked as ${nextStatus}`);
    } catch {
      toast.error("Failed to update campaign status");
      fetchCampaigns();
    }
  };

  const fetchCampaignDetail = async (id: string) => {
    setIsLoadingDetail(true);
    setCampaignDetail(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) {
        setCampaignDetail({
          id,
          name: data.campaign.name,
          status: data.campaign.status,
          dailyCap: data.campaign.dailyCap ?? 20,
          sentToday: data.sentToday ?? 0,
          remainingToday: data.remainingToday ?? 0,
          funnel: data.funnel || [],
        });
      } else {
        toast.error(data.error || "Failed to load campaign details");
      }
    } catch {
      toast.error("Failed to load campaign details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleLaunchCampaign = async () => {
    setIsLaunching(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          targetLeadsCount: availableLeadsCount || 50,
          niche: targetAudience,
          status: "Active",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Campaign launched successfully!");
        fetchCampaigns();
        setActiveTab("list");
      } else {
        toast.error(data.error || "Failed to launch campaign");
      }
    } catch {
      toast.error("Network error while launching campaign");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleLoadDemoCampaigns = () => {
    setCampaigns(SAMPLE_DEMO_CAMPAIGNS);
    setSelectedCampaignId(SAMPLE_DEMO_CAMPAIGNS[0].id);
    toast.success("Loaded sample demo campaigns for preview");
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || SAMPLE_DEMO_CAMPAIGNS[0];

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
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-palm-leaf-600" />
                        <span className="text-xs font-medium">Loading campaigns...</span>
                      </div>
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3 px-4">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                          <Send className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          No Outreach Campaigns Yet
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          Launch your first automated sequence with your connected LinkedIn sender account and {availableLeadsCount} saved leads.
                        </p>
                        <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setWizardStep(1);
                              setActiveTab("wizard");
                            }}
                            className="px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Create First Campaign
                          </button>
                          <button
                            type="button"
                            onClick={handleLoadDemoCampaigns}
                            className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Load Demo Campaigns
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => (
                    <tr
                      key={camp.id}
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setActiveTab("detail");
                        fetchCampaignDetail(camp.id);
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* VIEW 2: Campaign Detail with Real Funnel Stats */}
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
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedCampaign.status === "Active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {selectedCampaign.status === "Active" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {selectedCampaign.status}
                </span>
              </div>
            </div>

            {/* Sequence Funnel */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Sequence Funnel
              </h4>
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-10 gap-2 text-neutral-400">
                  <Loader2 className="h-5 w-5 animate-spin text-palm-leaf-600" />
                  <span className="text-xs">Loading funnel data...</span>
                </div>
              ) : campaignDetail && campaignDetail.funnel.length > 0 ? (
                <div className="space-y-3">
                  {campaignDetail.funnel.map((stage, idx) => {
                    const maxCount = campaignDetail.funnel[0].count || 1;
                    const pct = Math.min((stage.count / maxCount) * 100, 100);
                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-neutral-600 dark:text-neutral-400 font-medium">{stage.stage}</span>
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">{stage.count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full bg-palm-leaf-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 text-center">
                      <p className="text-[10px] text-neutral-500 mb-0.5">Sent today</p>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{campaignDetail.sentToday}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/30 text-center">
                      <p className="text-[10px] text-neutral-500 mb-0.5">Remaining today</p>
                      <p className="text-base font-bold text-palm-leaf-700 dark:text-palm-leaf-300">{campaignDetail.remainingToday}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No funnel data yet</p>
                  <p className="text-[11px] text-neutral-400 mt-1">Enroll leads and start the campaign to see stats here.</p>
                </div>
              )}
            </div>

            {/* Quick stats from the list */}
            <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="text-center">
                <p className="text-[10px] text-neutral-500">Leads</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{selectedCampaign.sentCount}/{selectedCampaign.leadsCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-neutral-500">Accept rate</p>
                <p className="text-sm font-bold text-palm-leaf-700 dark:text-palm-leaf-400">{selectedCampaign.acceptRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-neutral-500">Reply rate</p>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{selectedCampaign.replyRate}%</p>
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
                  disabled={isLaunching}
                  onClick={handleLaunchCampaign}
                  className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Launching Campaign...</span>
                    </>
                  ) : (
                    <span>Launch campaign</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
