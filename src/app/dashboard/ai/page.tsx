"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Check,
  CheckCircle2,
  Copy,
  RotateCw,
  ShieldCheck,
  MessageSquare,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Bot,
  Zap,
  ChevronRight,
  Loader2,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Inbox,
  UserPlus,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { pageVariants, cardVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLeadsIfNeeded, RawLeadPayload } from "@/store/slices/databaseSlice";

type ActiveTab = "personalizer" | "followup" | "classifier";
type InviteTone = "conversational" | "peer" | "direct" | "curious";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface GeneratedOption {
  angle: string;
  text: string;
  charCount: number;
  withinLimit: boolean;
}

interface PersonalizerResult {
  options: GeneratedOption[];
  leadSummary: string;
  mode: "openai" | "heuristic";
}

interface ReplyClassificationResult {
  classification: {
    category: "interested" | "objection" | "question" | "not_interested" | "out_of_office";
    confidence: number;
    reasoning: string;
    sentiment: "positive" | "neutral" | "negative";
    objectionType?: string;
  };
  quickReplies: Array<{
    title: string;
    replyText: string;
    tone: string;
  }>;
  recommendedAction: string;
  mode: "openai" | "heuristic";
}

const PRESET_INBOUND_SAMPLES = [
  {
    label: "Interested / Pricing",
    text: "Hi, saw your message. Sounds interesting—what does your pricing model look like and do you offer a trial?",
    sender: "Jordan Lee (VP Growth)",
  },
  {
    label: "Budget Objection",
    text: "Thanks for reaching out, but we don't have budget for new sales tooling this quarter. Reconnect next year.",
    sender: "Elena Rostova (RevOps Director)",
  },
  {
    label: "Integration Question",
    text: "Can SendPilot sync automatically with HubSpot and Salesloft, or does it require manual CSV exports?",
    sender: "David Vance (Engineering Lead)",
  },
  {
    label: "Not Interested",
    text: "Not interested right now. Please remove me from your outreach sequence.",
    sender: "Mark Stevens (Operations)",
  },
  {
    label: "Out of Office",
    text: "I am currently traveling through next Monday with limited email access. For urgent matters, contact support.",
    sender: "Claire Liu (Head of Product)",
  },
];

export default function AIAssistantPage() {
  const dispatch = useAppDispatch();
  const { items: realLeads, loading: storeLoading, loaded: storeLoaded } = useAppSelector(
    (state) => state.database.leads
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("personalizer");

  // ==========================================
  // TAB 1: AI CONNECTION PERSONALIZER STATE
  // ==========================================
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead =
    realLeads.find((lead) => lead.id === selectedLeadId) ??
    (selectedLeadId ? undefined : realLeads[0]);
  const selectedLeadName = selectedLead
    ? `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`.trim() || selectedLead.name || ""
    : "";
  const [leadNameOverride, setLeadNameOverride] = useState<string | null>(null);
  const [leadTitleOverride, setLeadTitleOverride] = useState<string | null>(null);
  const [leadCompanyOverride, setLeadCompanyOverride] = useState<string | null>(null);
  const [leadIndustryOverride, setLeadIndustryOverride] = useState<string | null>(null);
  const [leadSkillsOverride, setLeadSkillsOverride] = useState<string | null>(null);
  const leadName = leadNameOverride ?? selectedLeadName;
  const leadTitle = leadTitleOverride ?? selectedLead?.jobTitle ?? selectedLead?.title ?? "";
  const leadCompany = leadCompanyOverride ?? selectedLead?.company ?? "";
  const leadIndustry = leadIndustryOverride ?? selectedLead?.industry ?? selectedLead?.location ?? "";
  const leadSkills = leadSkillsOverride ?? selectedLead?.tags?.join(", ") ?? "";
  const [recentPostSnippet, setRecentPostSnippet] = useState("");
  const [inviteTone, setInviteTone] = useState<InviteTone>("conversational");
  const [isGeneratingInvites, setIsGeneratingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState<PersonalizerResult | null>(null);
  const [approvedInviteIdx, setApprovedInviteIdx] = useState<number | null>(null);

  // ==========================================
  // TAB 2: AUTOMATED FOLLOW-UP SENDER STATE
  // ==========================================
  const [followupProfileUrlOverride, setFollowupProfileUrlOverride] = useState<string | null>(null);
  const [followupLeadNameOverride, setFollowupLeadNameOverride] = useState<string | null>(null);
  const followupProfileUrl = followupProfileUrlOverride ?? selectedLead?.linkedinUrl ?? "";
  const followupLeadName = followupLeadNameOverride ?? selectedLeadName;
  const [followupMessage, setFollowupMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendLogs, setSendLogs] = useState<Array<{
    timestamp: string;
    profileUrl: string;
    leadName?: string;
    status: "success" | "error";
    method: string;
    message: string;
  }>>([]);

  // ==========================================
  // TAB 3: REPLY CLASSIFIER & AUTO-RESPONDER
  // ==========================================
  const [inboundMessage, setInboundMessage] = useState(PRESET_INBOUND_SAMPLES[0].text);
  const [prospectName, setProspectName] = useState(PRESET_INBOUND_SAMPLES[0].sender);
  const [campaignContext, setCampaignContext] = useState("Cold outreach sequence for outbound automation");
  const [myOffering, setMyOffering] = useState("SendPilot AI-powered LinkedIn lead scoring and engagement system");
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ReplyClassificationResult | null>(null);

  useEffect(() => {
    dispatch(fetchLeadsIfNeeded());
  }, [dispatch]);

  const handleLeadSelection = (id: string) => {
    setSelectedLeadId(id || null);
    const lead = realLeads.find((item) => item.id === id);
    setFollowupLeadNameOverride(lead ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.name || "" : "");
    setFollowupProfileUrlOverride(lead?.linkedinUrl || "");
  };

  // ----------------------------------------------------
  // HANDLERS: TAB 1 (CONNECTION REQUEST PERSONALIZER)
  // ----------------------------------------------------
  const handleGenerateInvites = async () => {
    if (!leadName.trim()) {
      toast.error("Please enter a prospect name or select a lead.");
      return;
    }

    setIsGeneratingInvites(true);
    setApprovedInviteIdx(null);

    try {
      const res = await fetch("/api/ai/personalize-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: {
            name: leadName,
            firstName: leadName.split(" ")[0],
            company: leadCompany,
            jobTitle: leadTitle,
            industry: leadIndustry,
            keySkills: leadSkills,
            recentPostSnippet: recentPostSnippet,
          },
          tone: inviteTone,
        }),
      });

      const data = await res.json();
      if (data.success && data.options) {
        setInviteResult({
          options: data.options,
          leadSummary: data.leadSummary,
          mode: data.mode,
        });
        toast.success(`Generated 3 tailored notes for ${leadName}!`);
      } else {
        toast.error(data.error || "Failed to generate connection notes.");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setIsGeneratingInvites(false);
    }
  };

  const handleCopyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Note copied to clipboard! (Ready to paste in LinkedIn)");
  };

  const handleSendToFollowup = (text: string) => {
    setFollowupMessage(text);
    setActiveTab("followup");
    toast.info("Transferred draft to Follow-up Sender tab.");
  };

  // ----------------------------------------------------
  // HANDLERS: TAB 2 (AUTOMATED FOLLOW-UP SENDER)
  // ----------------------------------------------------
  const handleSendFollowup = async () => {
    if (!followupProfileUrl.trim()) {
      toast.error("Please provide a valid LinkedIn profile URL.");
      return;
    }
    if (!followupMessage.trim()) {
      toast.error("Please enter a message to send.");
      return;
    }

    setIsSendingMessage(true);

    try {
      const res = await fetch("/api/linkedin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrl: followupProfileUrl.trim(),
          message: followupMessage.trim(),
          leadId: selectedLeadId || undefined,
        }),
      });

      const data = await res.json();
      const timestamp = new Date().toLocaleTimeString();

      if (data.success) {
        toast.success(`Message dispatched to ${data.leadName || followupLeadName || "lead"}!`);
        setSendLogs((prev) => [
          {
            timestamp,
            profileUrl: followupProfileUrl,
            leadName: data.leadName || followupLeadName || "Lead",
            status: "success",
            method: data.method === "worker" ? "Residential Worker" : "Playwright Local",
            message: "Delivered successfully into conversation thread.",
          },
          ...prev,
        ]);
      } else {
        toast.error(data.error || "Direct messaging failed.");
        setSendLogs((prev) => [
          {
            timestamp,
            profileUrl: followupProfileUrl,
            leadName: followupLeadName || "Lead",
            status: "error",
            method: data.method || "Engine",
            message: data.error || "Delivery failure",
          },
          ...prev,
        ]);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Network request failed."));
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS: TAB 3 (REPLY CLASSIFIER & AUTO-RESPONDER)
  // ----------------------------------------------------
  const handleClassifyReply = async () => {
    if (!inboundMessage.trim()) {
      toast.error("Please provide an inbound message to analyze.");
      return;
    }

    setIsClassifying(true);

    try {
      const res = await fetch("/api/ai/classify-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: inboundMessage,
          prospectName: prospectName,
          campaignContext: campaignContext,
          myOffering: myOffering,
        }),
      });

      const data = await res.json();
      if (data.success && data.classification) {
        setClassificationResult({
          classification: data.classification,
          quickReplies: data.quickReplies || [],
          recommendedAction: data.recommendedAction,
          mode: data.mode,
        });
        toast.success("Analyzed inbound reply & generated smart draft responses!");
      } else {
        toast.error(data.error || "Failed to classify reply.");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to analyze message."));
    } finally {
      setIsClassifying(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "interested":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          label: "Interested / High Intent",
        };
      case "objection":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          label: "Objection Detected",
        };
      case "question":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
          label: "Inquiry / Product Question",
        };
      case "not_interested":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
          label: "Not Interested",
        };
      case "out_of_office":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
          label: "Out of Office / Away",
        };
      default:
        return {
          bg: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300",
          label: category,
        };
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Top Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              AI Outreach & Intelligence Suite
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-palm-leaf-100 text-palm-leaf-800 dark:bg-palm-leaf-950/60 dark:text-palm-leaf-300 border border-palm-leaf-300 dark:border-palm-leaf-800">
              Active Engines
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Personalize connection notes under 300 characters, send automated follow-ups, and classify inbound replies.
          </p>
        </div>

        {/* Safe Reminder */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-300 shadow-2xs">
          <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>Strict &lt; 300-char LinkedIn safety limits enforced</span>
        </div>
      </motion.div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200/80 dark:border-neutral-800 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("personalizer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "personalizer"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>Connection Personalizer</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono">
            &lt;300 chars
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("followup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "followup"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Send className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>Automated Follow-up Sender</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono">
            Playwright
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("classifier")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "classifier"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Bot className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>Reply Classifier & Auto-Responder</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono">
            1-Click Smart
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI CONNECTION REQUEST PERSONALIZER */}
      {/* ========================================================================= */}
      {activeTab === "personalizer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Prospect Profile & Controls (5 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-palm-leaf-50 dark:bg-palm-leaf-950/50 flex items-center justify-center text-palm-leaf-600">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    Prospect Intelligence
                  </h3>
                </div>
                {realLeads.length > 0 && (
                  <span className="text-[11px] text-neutral-400">
                    {realLeads.length} leads in database
                  </span>
                )}
              </div>

              {/* Select from Database */}
              {realLeads.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Select Lead from Database
                  </label>
                  <select
                    value={selectedLead?.id || ""}
                    onChange={(e) => handleLeadSelection(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-palm-leaf-500 cursor-pointer"
                  >
                    {realLeads.map((l) => {
                      const name = `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.name || "Prospect";
                      return (
                        <option key={l.id} value={l.id}>
                          {name} — {l.jobTitle || l.title || "Decision Maker"} at {l.company || "Enterprise"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Manual / Overridable Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadNameOverride(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={leadTitle}
                    onChange={(e) => setLeadTitleOverride(e.target.value)}
                    placeholder="e.g. VP of Growth"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={leadCompany}
                    onChange={(e) => setLeadCompanyOverride(e.target.value)}
                    placeholder="e.g. Linear"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Industry / Market
                  </label>
                  <input
                    type="text"
                    value={leadIndustry}
                    onChange={(e) => setLeadIndustryOverride(e.target.value)}
                    placeholder="e.g. B2B SaaS, DevTools"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Key Skills or Domain Focus
                </label>
                <input
                  type="text"
                  value={leadSkills}
                  onChange={(e) => setLeadSkillsOverride(e.target.value)}
                  placeholder="e.g. Self-serve PLG, enterprise expansion, outbound"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Recent Post Snippet or Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={recentPostSnippet}
                  onChange={(e) => setRecentPostSnippet(e.target.value)}
                  placeholder="e.g. Shared a post about scaling outbound conversion without high spam rates"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Outreach Angle & Tone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "conversational", label: "Conversational", desc: "Warm & natural" },
                    { id: "peer", label: "Peer-to-Peer", desc: "Insight exchange" },
                    { id: "direct", label: "Direct", desc: "Clear & succinct" },
                    { id: "curious", label: "Curious", desc: "Low-pressure question" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInviteTone(t.id as InviteTone)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        inviteTone === t.id
                          ? "border-palm-leaf-600 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/40 text-palm-leaf-900 dark:text-palm-leaf-200"
                          : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 hover:border-neutral-300"
                      }`}
                    >
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className="text-[10px] text-neutral-400">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateInvites}
                disabled={isGeneratingInvites}
                className="w-full py-2.5 px-4 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isGeneratingInvites ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing profile & crafting notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate 3 High-Converting Notes</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Column: Generated 3 Notes under 300 Chars (7 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Customized Notes (Under 300 Characters)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Every note is strictly verified below LinkedIn&apos;s 300-char connection note limit.
                </p>
              </div>
              {inviteResult && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  Engine: {inviteResult.mode === "openai" ? "GPT-4o-mini" : "Heuristic NLP"}
                </span>
              )}
            </div>

            {!inviteResult ? (
              <div className="p-10 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/50 text-palm-leaf-600 mx-auto flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Ready to Personalize Connection Notes
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Select a prospect on the left and click &quot;Generate 3 High-Converting Notes&quot;. You&apos;ll get 3 strategic angles tailored to their role and company.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inviteResult.options.map((opt, idx) => {
                  const isSafe = opt.charCount <= 300;
                  const isApproved = approvedInviteIdx === idx;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-4 transition-all shadow-xs ${
                        isApproved
                          ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
                          : "border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      {/* Note Header & Char Counter */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-palm-leaf-100 text-palm-leaf-800 dark:bg-palm-leaf-950/50 dark:text-palm-leaf-300">
                            Angle {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {opt.angle}
                          </span>
                        </div>

                        {/* Character count pill */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              opt.charCount <= 280
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : opt.charCount <= 300
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {opt.charCount} / 300 chars
                          </span>
                        </div>
                      </div>

                      {/* Content (Editable inline) */}
                      <div className="mt-3">
                        <textarea
                          rows={3}
                          value={opt.text}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setInviteResult((prev) => {
                              if (!prev) return null;
                              const updated = [...prev.options];
                              updated[idx] = {
                                ...updated[idx],
                                text: newText,
                                charCount: newText.length,
                                withinLimit: newText.length <= 300,
                              };
                              return { ...prev, options: updated };
                            });
                          }}
                          className="w-full bg-neutral-50/60 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-palm-leaf-500 font-medium leading-relaxed resize-none"
                        />
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">
                          {isSafe ? "Safe to send on LinkedIn" : "Over 300 char limit! Trim words."}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyNote(opt.text)}
                            className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Note</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendToFollowup(opt.text)}
                            className="inline-flex items-center gap-1.5 text-xs text-palm-leaf-700 dark:text-palm-leaf-300 hover:text-palm-leaf-900 px-2.5 py-1.5 rounded-xl border border-palm-leaf-200 dark:border-palm-leaf-800 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/30 transition-colors cursor-pointer font-medium"
                          >
                            <ArrowRight className="h-3 w-3" />
                            <span>Use in Follow-up</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setApprovedInviteIdx(idx);
                              toast.success("Note approved!");
                            }}
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                              isApproved
                                ? "bg-emerald-600 text-white"
                                : "bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white shadow-2xs"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isApproved ? "Approved" : "Approve"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATED FOLLOW-UP SENDER (PLAYWRIGHT MESSAGING) */}
      {/* ========================================================================= */}
      {activeTab === "followup" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Direct Messaging Dispatcher (7 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-palm-leaf-50 dark:bg-palm-leaf-950/50 flex items-center justify-center text-palm-leaf-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                      LinkedIn Direct Message Sender
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Simulates human keystrokes &amp; navigates 1st-degree connection threads via Playwright
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational Callout */}
              <div className="p-3.5 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                <Bot className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <div className="leading-relaxed text-[11px]">
                  <strong>1st-Degree Connection Direct Messaging:</strong> This function opens the target&apos;s LinkedIn profile, verifies they are connected, brings up the messaging dock, types with natural cadence, and transmits the message. If your residential worker is online, it routes via your home IP tunnel.
                </div>
              </div>

              {/* Lead Selector or Direct URL */}
              {realLeads.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Quick-Fill from Database Lead
                  </label>
                  <select
                    value={selectedLead?.id || ""}
                    onChange={(e) => {
                      handleLeadSelection(e.target.value);
                    }}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-palm-leaf-500 cursor-pointer"
                  >
                    <option value="">-- Choose a lead to populate URL --</option>
                    {realLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} ({l.company || "Enterprise"}) — {l.linkedinUrl || "No URL"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  LinkedIn Profile URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={followupProfileUrl}
                    onChange={(e) => setFollowupProfileUrlOverride(e.target.value)}
                    placeholder="https://www.linkedin.com/in/prospect-username/"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 pr-10 text-xs font-medium focus:outline-none focus:border-palm-leaf-500 font-mono"
                  />
                  {followupProfileUrl && (
                    <a
                      href={followupProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Recipient Name (Optional, for reference)
                </label>
                <input
                  type="text"
                  value={followupLeadName}
                  onChange={(e) => setFollowupLeadNameOverride(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Follow-Up Message Text *
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {followupMessage.length} characters
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={followupMessage}
                  onChange={(e) => setFollowupMessage(e.target.value)}
                  placeholder="Hi Sarah, following up on our connection note earlier! Saw your recent update regarding..."
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3 text-xs font-medium focus:outline-none focus:border-palm-leaf-500 leading-relaxed resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
                  <span>Human typing speed applied (40–120ms/keystroke)</span>
                </div>

                <button
                  type="button"
                  onClick={handleSendFollowup}
                  disabled={isSendingMessage || !followupProfileUrl || !followupMessage}
                  className="py-2.5 px-5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isSendingMessage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending DM via Playwright...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Direct Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Execution History & Worker Logs (5 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Live Dispatch Activity
                </h3>
                <span className="text-[10px] text-neutral-400">
                  {sendLogs.length} events logged
                </span>
              </div>

              {sendLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <Clock className="h-6 w-6 text-neutral-400 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    No Messages Dispatched Yet
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                    When you send direct messages, the real-time Playwright execution steps and delivery status will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sendLogs.map((log, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        log.status === "success"
                          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                          : "bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                          {log.status === "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                          )}
                          <span>{log.leadName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400 break-all">
                        {log.profileUrl}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Runner: {log.method}
                        </span>
                        <span className={log.status === "success" ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                          {log.message}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Worker Setup Note */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 space-y-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                  Automated Queue Safeguards:
                </span>
                <p>
                  • Anti-bot jitter automatically adds 2–4s pauses between profile loads.
                </p>
                <p>
                  • InMail / unconnected detection prevents accidental paid credits usage.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI REPLY CLASSIFIER & AUTO-RESPONDER */}
      {/* ========================================================================= */}
      {activeTab === "classifier" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inbound Message Input & Tester (5 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-palm-leaf-50 dark:bg-palm-leaf-950/50 flex items-center justify-center text-palm-leaf-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    Inbound LinkedIn Reply
                  </h3>
                </div>
              </div>

              {/* Sample Presets */}
              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Load Realistic Test Reply
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_INBOUND_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInboundMessage(sample.text);
                        setProspectName(sample.sender);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:border-palm-leaf-400 transition-colors cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Inbound Message Content *
                </label>
                <textarea
                  rows={4}
                  value={inboundMessage}
                  onChange={(e) => setInboundMessage(e.target.value)}
                  placeholder="Paste what the prospect said in their LinkedIn reply..."
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3 text-xs font-medium focus:outline-none focus:border-palm-leaf-500 leading-relaxed resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Prospect Name
                  </label>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Campaign Goal
                  </label>
                  <input
                    type="text"
                    value={campaignContext}
                    onChange={(e) => setCampaignContext(e.target.value)}
                    placeholder="e.g. Outbound demo meeting"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  My Offering / Value Proposition
                </label>
                <input
                  type="text"
                  value={myOffering}
                  onChange={(e) => setMyOffering(e.target.value)}
                  placeholder="e.g. SendPilot LinkedIn Outbound and scoring platform"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-2 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <button
                type="button"
                onClick={handleClassifyReply}
                disabled={isClassifying || !inboundMessage.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing sentiment & objection...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Classify & Generate 1-Click Replies</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Column: Classification & 1-Click Smart Replies (7 cols) */}
          <motion.div variants={cardVariants} className="lg:col-span-7 space-y-4">
            {!classificationResult ? (
              <div className="p-10 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/50 text-palm-leaf-600 mx-auto flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  No Message Classified Yet
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Paste an inbound reply from a prospect or click one of the presets on the left. The AI will classify intent, detect objections, and generate 1-click tailored responses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Classification Summary Card */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const badge = getCategoryBadge(classificationResult.classification.category);
                        return (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        );
                      })()}

                      <span className="text-[11px] font-semibold text-neutral-500">
                        {Math.round(classificationResult.classification.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-neutral-400">
                        Sentiment:
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          classificationResult.classification.sentiment === "positive"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : classificationResult.classification.sentiment === "negative"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {classificationResult.classification.sentiment}
                      </span>
                    </div>
                  </div>

                  {/* Objection Tag if any */}
                  {classificationResult.classification.objectionType && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Objection Identified: {classificationResult.classification.objectionType.toUpperCase()}</span>
                    </div>
                  )}

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    <strong>AI Analysis:</strong> {classificationResult.classification.reasoning}
                  </p>

                  <div className="p-3 rounded-xl bg-palm-leaf-50/50 dark:bg-palm-leaf-950/30 border border-palm-leaf-200 dark:border-palm-leaf-900/50 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-palm-leaf-800 dark:text-palm-leaf-300 uppercase tracking-wider block mb-0.5">
                        Recommended Next Step
                      </span>
                      <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                        {classificationResult.recommendedAction}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* 1-Click Smart Replies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                      1-Click Smart Replies ({classificationResult.quickReplies.length})
                    </h4>
                    <span className="text-[11px] text-neutral-400">
                      Click &quot;Copy&quot; or send to Follow-up tab
                    </span>
                  </div>

                  {classificationResult.quickReplies.map((reply, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {reply.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">
                          Tone: {reply.tone}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                        {reply.replyText}
                      </p>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(reply.replyText);
                            toast.success("Reply copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy Reply</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFollowupMessage(reply.replyText);
                            setActiveTab("followup");
                            toast.info("Transferred smart reply to Follow-up Sender!");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-white bg-palm-leaf-600 hover:bg-palm-leaf-700 px-3 py-1.5 rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Dispatch via Follow-up</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
