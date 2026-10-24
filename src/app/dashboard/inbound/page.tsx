"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
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
  Plus,
  Bot,
  Shield,
  Check,
  Trash2,
  ExternalLink,
  Code2,
  Clock,
  Send,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { pageVariants, cardVariants } from "@/lib/motion";
import { FlowItem } from "@/components/campaigns/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLeadsIfNeeded } from "@/store/slices/databaseSlice";

export interface ReplySuggestionItem {
  id: string;
  prospect: string;
  replyText: string;
  aiSuggestion: string;
  isNew: boolean;
}

export default function InboundAutomationPage() {
  const dispatch = useAppDispatch();
  const { items: leads, loading: storeLoading, loaded: storeLoaded } = useAppSelector(
    (state) => state.database.leads
  );
  const loading = storeLoading && !storeLoaded;

  const [disabledAutomationIds, setDisabledAutomationIds] = useState<string[]>(["a3"]);
  const [userFlows, setUserFlows] = useState<FlowItem[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewFlow, setPreviewFlow] = useState<FlowItem | null>(null);

  // Form state for creating Playwright automation
  const [preset, setPreset] = useState<"software_engineer" | "tech_lead" | "custom">("software_engineer");
  const [flowName, setFlowName] = useState("Software Engineer Outreach");
  const [flowDescription, setFlowDescription] = useState(
    "Playwright-automated sequence targeting software engineers with personalized connection notes, acceptance detection, and smart follow-ups."
  );

  // Playwright automation options
  const [profileVisitWarmup, setProfileVisitWarmup] = useState(true);
  const [connectNoteEnabled, setConnectNoteEnabled] = useState(true);
  const [connectTemplate, setConnectTemplate] = useState(
    "Hi {{firstName}}, came across your profile and was impressed by your tech background and work at {{company}}. Would love to connect and follow your engineering journey!"
  );
  const [waitDaysAfterConnect, setWaitDaysAfterConnect] = useState(2);
  const [followupMessage, setFollowupMessage] = useState(
    "Hey {{firstName}}, thanks for connecting! Always great to connect with fellow engineers in the {{title}} space. Are you and the team at {{company}} currently working on scaling your architecture or exploring new tooling this quarter?"
  );
  const [waitDaysAfterFollowup, setWaitDaysAfterFollowup] = useState(3);
  const [enableSecondFollowup, setEnableSecondFollowup] = useState(true);
  const [secondFollowupMessage, setSecondFollowupMessage] = useState(
    "Hi {{firstName}}, just floating this back up. If you're open to comparing notes on how other engineering teams handle pipeline automation, happy to share our quick overview."
  );
  const [stopOnReply, setStopOnReply] = useState(true);
  const [smartResponseEnabled, setSmartResponseEnabled] = useState(true);
  const [calendarUrl, setCalendarUrl] = useState("https://cal.com/meeting");
  const [dailyCap, setDailyCap] = useState(20);
  const [humanTypingJitter, setHumanTypingJitter] = useState(true);
  const [isSavingFlow, setIsSavingFlow] = useState(false);

  // Fetch flows from API
  const fetchUserFlows = async () => {
    setIsLoadingFlows(true);
    try {
      const res = await fetch("/api/flows");
      const data = await res.json();
      if (data.success && Array.isArray(data.flows)) {
        setUserFlows(data.flows);
      }
    } catch {
      toast.error("Failed to load custom flows");
    } finally {
      setIsLoadingFlows(false);
    }
  };

  useEffect(() => {
    dispatch(fetchLeadsIfNeeded());
    fetch("/api/flows")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.flows)) {
          setUserFlows(data.flows);
        }
      })
      .catch(() => {
        toast.error("Failed to load custom flows");
      })
      .finally(() => {
        setIsLoadingFlows(false);
      });
  }, [dispatch]);

  // Handle Preset Switching
  const applyPreset = (type: "software_engineer" | "tech_lead" | "custom") => {
    setPreset(type);
    if (type === "software_engineer") {
      setFlowName("Software Engineer Outreach");
      setFlowDescription(
        "Playwright-automated sequence targeting software engineers with personalized connection notes, acceptance detection, and smart follow-ups."
      );
      setConnectNoteEnabled(true);
      setConnectTemplate(
        "Hi {{firstName}}, came across your profile and was impressed by your tech background and work at {{company}}. Would love to connect and follow your engineering journey!"
      );
      setWaitDaysAfterConnect(2);
      setFollowupMessage(
        "Hey {{firstName}}, thanks for connecting! Always great to connect with fellow engineers in the {{title}} space. Are you and the team at {{company}} currently working on scaling your architecture or exploring new tooling this quarter?"
      );
      setWaitDaysAfterFollowup(3);
      setEnableSecondFollowup(true);
      setSecondFollowupMessage(
        "Hi {{firstName}}, just floating this back up. If you're open to comparing notes on how other engineering teams handle pipeline automation, happy to share our quick overview."
      );
      setProfileVisitWarmup(true);
      setStopOnReply(true);
      setSmartResponseEnabled(true);
      setDailyCap(20);
      setHumanTypingJitter(true);
    } else if (type === "tech_lead") {
      setFlowName("Tech Lead & Eng Manager Outreach");
      setFlowDescription(
        "Targeting technical leaders with architectural velocity and pipeline scalability angles."
      );
      setConnectNoteEnabled(true);
      setConnectTemplate(
        "Hi {{firstName}}, noticed your engineering leadership at {{company}}. Would love to connect and follow your team's technical milestones!"
      );
      setWaitDaysAfterConnect(2);
      setFollowupMessage(
        "Thanks for connecting, {{firstName}}! What's currently the bigger focus for your engineering team at {{company}}: reducing developer build times or optimizing deployment pipelines?"
      );
      setWaitDaysAfterFollowup(4);
      setEnableSecondFollowup(true);
      setSecondFollowupMessage(
        "Hey {{firstName}}, if you have 10 minutes next week, would love to share how similar engineering leaders streamlined their pipeline. No pressure at all!"
      );
      setProfileVisitWarmup(true);
      setStopOnReply(true);
      setSmartResponseEnabled(true);
      setDailyCap(20);
      setHumanTypingJitter(true);
    } else {
      setFlowName("");
      setFlowDescription("");
      setConnectTemplate("");
      setFollowupMessage("");
      setSecondFollowupMessage("");
    }
  };

  // Insert variable into active template
  const insertVariable = (tag: string, field: "connect" | "followup" | "secondFollowup") => {
    if (field === "connect") {
      setConnectTemplate((prev) => (prev ? `${prev} ${tag}` : tag));
    } else if (field === "followup") {
      setFollowupMessage((prev) => (prev ? `${prev} ${tag}` : tag));
    } else {
      setSecondFollowupMessage((prev) => (prev ? `${prev} ${tag}` : tag));
    }
    toast.success(`Inserted ${tag}`);
  };

  // Save Playwright Automation to MongoDB
  const handleSaveFlow = async () => {
    const trimmedName = flowName.trim();
    if (!trimmedName) {
      toast.error("Please enter an automation name");
      return;
    }

    if (connectNoteEnabled && !connectTemplate.trim()) {
      toast.error("Please provide a connection note template or disable it");
      return;
    }

    if (!followupMessage.trim()) {
      toast.error("Please provide a follow-up message template");
      return;
    }

    setIsSavingFlow(true);
    try {
      const steps = [
        {
          type: "connect",
          delayDays: 0,
          template: connectNoteEnabled ? connectTemplate.trim() : "",
        },
        {
          type: "wait",
          delayDays: Number(waitDaysAfterConnect) || 2,
          template: "",
        },
        {
          type: "message",
          delayDays: 0,
          template: followupMessage.trim(),
        },
      ];

      if (enableSecondFollowup && secondFollowupMessage.trim()) {
        steps.push({
          type: "wait",
          delayDays: Number(waitDaysAfterFollowup) || 3,
          template: "",
        });
        steps.push({
          type: "message",
          delayDays: 0,
          template: secondFollowupMessage.trim(),
        });
      }

      const payload = {
        name: trimmedName,
        description: flowDescription.trim(),
        steps,
        config: {
          engine: "playwright",
          profileVisitWarmup,
          stopOnReply,
          smartResponse: smartResponseEnabled,
          calendarUrl: calendarUrl.trim(),
          dailyCap,
          humanTypingJitter,
          detectAcceptance: true,
        },
      };

      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save automation");
      }

      toast.success(`Saved Playwright automation: "${trimmedName}"`);
      setShowCreateModal(false);
      await fetchUserFlows();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save automation";
      toast.error(msg);
    } finally {
      setIsSavingFlow(false);
    }
  };

  // Delete saved flow
  const handleDeleteFlow = async (flowId: string, flowTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${flowTitle}"?`)) return;

    try {
      const res = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete automation");
      }
      toast.success(`Deleted "${flowTitle}"`);
      setUserFlows((prev) => prev.filter((f) => f.id !== flowId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  };

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

  const replySuggestions = realReplySuggestions;

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Inbound automation
            </h2>
            <span className="text-[10px] bg-palm-leaf-100 text-palm-leaf-900 dark:bg-palm-leaf-950/60 dark:text-palm-leaf-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Bot className="h-3 w-3" />
              <span>Playwright Engine</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Create custom Playwright automations, turn profile visitors into warm pipeline, and import sequences directly into campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              applyPreset("software_engineer");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Create Custom Automation</span>
          </button>

          <button
            onClick={() => {
              dispatch(fetchLeadsIfNeeded({ force: true }));
              fetchUserFlows();
            }}
            disabled={loading || isLoadingFlows}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`h-4 w-4 ${loading || isLoadingFlows ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      {/* SECTION: Custom Playwright Automations */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-palm-leaf-100 dark:bg-palm-leaf-900/40 text-palm-leaf-700 dark:text-palm-leaf-300 flex items-center justify-center">
                <Code2 className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Your Custom Playwright Automations
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                {userFlows.length} saved
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Custom sequences configured with Playwright connection requests, response detection, and automated follow-ups. Ready to import in Campaign Wizard Step 2.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              applyPreset("software_engineer");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Sequence (e.g. Software Engineer Outreach)</span>
          </button>
        </div>

        {userFlows.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950/60 text-palm-leaf-700 dark:text-palm-leaf-400 flex items-center justify-center mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              No custom Playwright automations created yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-md mt-1 mb-4">
              Create your first automation named <strong>Software Engineer Outreach</strong> with connection request notes, acceptance waits, response handling, and human keystroke simulation.
            </p>
            <button
              type="button"
              onClick={() => {
                applyPreset("software_engineer");
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create &ldquo;Software Engineer Outreach&rdquo; Automation</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userFlows.map((flow) => {
              const touches = flow.steps.filter((s) => s.type !== "wait").length;
              const hasConnect = flow.steps.some((s) => s.type === "connect");
              const hasMessage = flow.steps.some((s) => s.type === "message");

              return (
                <div
                  key={flow.id}
                  className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/30 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-palm-leaf-700 dark:text-palm-leaf-400 flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        <span>Playwright Automation</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                        {touches} touchpoints
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {flow.name}
                    </h4>

                    {flow.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                        {flow.description}
                      </p>
                    )}

                    {/* Playwright Feature Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {hasConnect && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium px-2 py-0.5 rounded-md">
                          Auto-Connect Note
                        </span>
                      )}
                      {hasMessage && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-md">
                          Follow-up on Acceptance
                        </span>
                      )}
                      <span className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-medium px-2 py-0.5 rounded-md">
                        Stop on Reply
                      </span>
                      <span className="text-[10px] bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-medium px-2 py-0.5 rounded-md">
                        Keystroke Jitter
                      </span>
                    </div>

                    {/* Step Sequence Breakdown */}
                    <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                      {flow.steps.map((st, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 shrink-0" />
                          {st.type === "connect" ? (
                            <span>Step 1: Connection Request Note (300 char max)</span>
                          ) : st.type === "wait" ? (
                            <span className="text-neutral-400">
                              Wait {st.delayDays} day{st.delayDays > 1 ? "s" : ""} & detect acceptance
                            </span>
                          ) : (
                            <span>Follow-up Direct Message via Playwright</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFlow(flow)}
                      className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      Preview Sequence
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteFlow(flow.id, flow.name)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 hover:border-red-200 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete automation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <Link
                        href={`/dashboard/campaigns?create=true&flowName=${encodeURIComponent(flow.name)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-palm-leaf-600 text-white hover:bg-palm-leaf-700 transition-colors shadow-2xs"
                      >
                        <span>Use in Campaign</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Four Standard Inbound Triggers */}
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
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
              >
                <Database className="h-3.5 w-3.5" />
                <span>View Leads Database</span>
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

      {/* MODAL: Create Playwright Custom Automation */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-palm-leaf-100 dark:bg-palm-leaf-950/80 text-palm-leaf-700 dark:text-palm-leaf-400 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <span>Create Playwright Automation</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Chromium Residential
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Configure custom connection notes, human typing jitter, and follow-up sequences.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* 1. Quick Persona Presets */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block mb-2">
                    Target Persona Preset
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("software_engineer")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        preset === "software_engineer"
                          ? "border-palm-leaf-600 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 ring-1 ring-palm-leaf-500"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Software Engineer</span>
                        {preset === "software_engineer" && (
                          <Check className="h-3.5 w-3.5 text-palm-leaf-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                        Frontend, backend & full-stack engineers with tech stack personalization.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("tech_lead")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        preset === "tech_lead"
                          ? "border-palm-leaf-600 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 ring-1 ring-palm-leaf-500"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Tech Lead / Eng Mgr</span>
                        {preset === "tech_lead" && (
                          <Check className="h-3.5 w-3.5 text-palm-leaf-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                        Engineering directors and tech leads focused on velocity and architecture.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("custom")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        preset === "custom"
                          ? "border-palm-leaf-600 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 ring-1 ring-palm-leaf-500"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Custom Sequence</span>
                        {preset === "custom" && (
                          <Check className="h-3.5 w-3.5 text-palm-leaf-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                        Start from a blank canvas and build your own Playwright automation steps.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Automation Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Automation Name *
                    </label>
                    <input
                      type="text"
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      placeholder="e.g. Software Engineer Outreach"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-palm-leaf-500/20 focus:border-palm-leaf-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Strategy Description
                    </label>
                    <input
                      type="text"
                      value={flowDescription}
                      onChange={(e) => setFlowDescription(e.target.value)}
                      placeholder="e.g. High-converting cadence targeting software engineers"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-palm-leaf-500/20 focus:border-palm-leaf-600"
                    />
                  </div>
                </div>

                {/* 3. Playwright Sequence Options */}
                <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-palm-leaf-600" />
                      <span>Playwright Automation Options & Sequence</span>
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Step-by-step pipeline execution
                    </span>
                  </div>

                  {/* Option 1: Profile Visit Warmup */}
                  <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Pre-Invite Profile Visit Warmup
                        </span>
                        <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold px-1.5 py-0.2 rounded-sm">
                          Playwright Visit
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Playwright quietly visits prospect&apos;s profile 2-4 hours before sending connection note to create organic curiosity.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileVisitWarmup(!profileVisitWarmup)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        profileVisitWarmup ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          profileVisitWarmup ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Option 2: Step 1 - Connection Request Note */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-400 text-[11px] font-bold flex items-center justify-center">
                          1
                        </span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Send Connection Request Note (Playwright)
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          connectTemplate.length > 300 ? "text-red-600 font-bold" : "text-neutral-400"
                        }`}
                      >
                        {connectTemplate.length} / 300 chars
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500">
                      Dispatched using Playwright Chromium with real session cookies. Personalized note is typed with 150-350ms human keystroke delays.
                    </p>

                    {/* Variable Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-medium">Insert tags:</span>
                      {[
                        { label: "First Name", tag: "{{firstName}}" },
                        { label: "Company", tag: "{{company}}" },
                        { label: "Job Title", tag: "{{title}}" },
                        { label: "Location", tag: "{{location}}" },
                      ].map((chip) => (
                        <button
                          key={chip.tag}
                          type="button"
                          onClick={() => insertVariable(chip.tag, "connect")}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 transition-colors"
                        >
                          {chip.tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={connectTemplate}
                      onChange={(e) => setConnectTemplate(e.target.value)}
                      placeholder="Hi {{firstName}}, love what you're building at {{company}}..."
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-palm-leaf-500/20 focus:border-palm-leaf-600"
                    />
                  </div>

                  {/* Option 3: Step 2 - Wait & Detect Acceptance */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                          Wait & Detect Connection Acceptance
                        </span>
                        <p className="text-[11px] text-neutral-500">
                          Follow-up is triggered only after the prospect accepts your LinkedIn invite.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="text-xs text-neutral-500 mr-1">Wait:</span>
                      {[1, 2, 3, 5, 7].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setWaitDaysAfterConnect(days)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            waitDaysAfterConnect === days
                              ? "bg-palm-leaf-600 text-white shadow-2xs"
                              : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          {days}d{days === 2 ? " (rec)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 4: Step 3 - Follow-Up Direct Message */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-400 text-[11px] font-bold flex items-center justify-center">
                          3
                        </span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Follow-Up Direct Message (Playwright DM)
                        </span>
                      </div>
                      <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 font-semibold bg-palm-leaf-50 dark:bg-palm-leaf-950/60 px-2 py-0.5 rounded-full">
                        Keystroke simulation active
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500">
                      Sent directly to 1st-degree connection. Simulates realistic human typing speed with randomized typing pauses.
                    </p>

                    {/* Variable Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-medium">Insert tags:</span>
                      {[
                        { label: "First Name", tag: "{{firstName}}" },
                        { label: "Company", tag: "{{company}}" },
                        { label: "Job Title", tag: "{{title}}" },
                      ].map((chip) => (
                        <button
                          key={chip.tag}
                          type="button"
                          onClick={() => insertVariable(chip.tag, "followup")}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 transition-colors"
                        >
                          {chip.tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={followupMessage}
                      onChange={(e) => setFollowupMessage(e.target.value)}
                      placeholder="Hey {{firstName}}, thanks for connecting! Always great connecting with fellow engineers..."
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-palm-leaf-500/20 focus:border-palm-leaf-600"
                    />
                  </div>

                  {/* Option 5: Follow-Up on Response & Reply Handling */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-palm-leaf-600" />
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Follow-up on Response & Reply Handling
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        AI Classifier
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                            Stop sequence immediately on reply
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            Prevents embarrassing follow-ups if prospect already answered.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStopOnReply(!stopOnReply)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            stopOnReply ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              stopOnReply ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                        <div>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                            AI Meeting Request Classifier & Linker
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            Detects calendar interest in replies and auto-suggests your scheduling link.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSmartResponseEnabled(!smartResponseEnabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            smartResponseEnabled ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              smartResponseEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {smartResponseEnabled && (
                        <div className="pt-2">
                          <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                            Calendar Booking URL
                          </label>
                          <input
                            type="text"
                            value={calendarUrl}
                            onChange={(e) => setCalendarUrl(e.target.value)}
                            placeholder="https://cal.com/your-name"
                            className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Option 6: Step 4 - Optional 2nd Follow-up Touch (on no response) */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold flex items-center justify-center">
                          4
                        </span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Second Follow-Up Bump (If No Response)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableSecondFollowup(!enableSecondFollowup)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          enableSecondFollowup ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            enableSecondFollowup ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {enableSecondFollowup && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>Delay before second touch:</span>
                          {[2, 3, 4, 5].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setWaitDaysAfterFollowup(d)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                waitDaysAfterFollowup === d
                                  ? "bg-palm-leaf-600 text-white"
                                  : "border border-neutral-200 dark:border-neutral-800"
                              }`}
                            >
                              {d}d
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={2}
                          value={secondFollowupMessage}
                          onChange={(e) => setSecondFollowupMessage(e.target.value)}
                          placeholder="Hi {{firstName}}, just floating this back up..."
                          className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 text-xs text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    )}
                  </div>

                  {/* Option 7: Playwright Safety & Rate Controls */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Playwright Anti-Detection & Account Safety
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-500 block mb-1">Daily Cap:</span>
                        <div className="flex items-center gap-1.5">
                          {[15, 20, 25, 30].map((cap) => (
                            <button
                              key={cap}
                              type="button"
                              onClick={() => setDailyCap(cap)}
                              className={`px-2.5 py-1 rounded-lg font-semibold text-xs ${
                                dailyCap === cap
                                  ? "bg-palm-leaf-600 text-white"
                                  : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                              }`}
                            >
                              {cap}/day{cap === 20 ? " (rec)" : ""}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-neutral-500 block mb-1">Human Simulation:</span>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-700 dark:text-neutral-300 font-medium pt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>150-350ms delay jitter active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Lead Live Preview */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                      Live Preview for Sample Prospect (Alex Chen, Senior Software Engineer at Stripe)
                    </span>
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-xs text-neutral-700 dark:text-neutral-300 space-y-2 border border-neutral-100 dark:border-neutral-800">
                      <div>
                        <span className="text-[10px] font-bold text-palm-leaf-700 dark:text-palm-leaf-400 block">
                          Step 1: Connection Request Note
                        </span>
                        <p className="mt-0.5">
                          {connectTemplate
                            .replace(/\{\{\s*firstName\s*\}\}/g, "Alex")
                            .replace(/\{\{\s*company\s*\}\}/g, "Stripe")
                            .replace(/\{\{\s*title\s*\}\}/g, "Senior Software Engineer")
                            .replace(/\{\{\s*location\s*\}\}/g, "San Francisco, CA")}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-[10px] font-bold text-palm-leaf-700 dark:text-palm-leaf-400 block">
                          Step 2: Follow-up Direct Message ({waitDaysAfterConnect}d later)
                        </span>
                        <p className="mt-0.5">
                          {followupMessage
                            .replace(/\{\{\s*firstName\s*\}\}/g, "Alex")
                            .replace(/\{\{\s*company\s*\}\}/g, "Stripe")
                            .replace(/\{\{\s*title\s*\}\}/g, "Senior Software Engineer")
                            .replace(/\{\{\s*location\s*\}\}/g, "San Francisco, CA")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingFlow}
                  onClick={handleSaveFlow}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingFlow ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Automation...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Save Playwright Automation</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Preview Saved Sequence */}
      <AnimatePresence>
        {previewFlow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {previewFlow.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {previewFlow.description || "Playwright automated sequence"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFlow(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {previewFlow.steps.map((st, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-palm-leaf-700 dark:text-palm-leaf-400 uppercase text-[10px] tracking-wider">
                        Step {i + 1}: {st.type === "connect" ? "Connection Request Note" : st.type === "wait" ? `Wait ${st.delayDays} Day(s)` : "Follow-up Direct Message"}
                      </span>
                    </div>
                    {st.template && (
                      <p className="text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-wrap">
                        {st.template}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewFlow(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100"
                >
                  Close
                </button>
                <Link
                  href={`/dashboard/campaigns?create=true&flowName=${encodeURIComponent(previewFlow.name)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-palm-leaf-600 text-white hover:bg-palm-leaf-700 shadow-2xs"
                >
                  <span>Use in Campaign</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
