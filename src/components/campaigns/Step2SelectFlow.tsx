"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  PenLine,
  Layers,
  Clock,
  Send,
  MessageSquare,
  Users,
  Check,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Copy,
  Eye,
  Loader2,
  X,
  FileCheck,
  Download,
  ExternalLink,
  Bot,
} from "lucide-react";
import { SequenceStepItem, FlowItem } from "./types";
import { toast } from "sonner";

export const INBOUND_AUTOMATIONS: FlowItem[] = [
  {
    id: "inbound_profile_visit",
    name: "Profile Visit Follow-up",
    description: "Queue a soft connection invite within 4 hours when a target persona views your profile.",
    isTemplate: true,
    steps: [
      {
        type: "connect",
        delayDays: 0,
        template:
          "Hi {{firstName}}, noticed you came across my profile recently. Thought I'd reach out and connect — would love to follow what you're building at {{company}}!",
      },
      {
        type: "wait",
        delayDays: 2,
        template: "",
      },
      {
        type: "message",
        delayDays: 0,
        template:
          "Hey {{firstName}}, thanks for connecting! Hope your week is off to a great start. Always keen to exchange notes with other leaders in {{title}} roles.",
      },
    ],
  },
  {
    id: "inbound_post_engagement",
    name: "Post Engagement Auto-Capture",
    description: "Capture and nurture prospects who liked or commented on your industry thought leadership posts.",
    isTemplate: true,
    steps: [
      {
        type: "connect",
        delayDays: 0,
        template:
          "Hi {{firstName}}, saw you caught my recent discussion on LinkedIn. Always great connecting with peers following similar industry trends at {{company}}!",
      },
      {
        type: "wait",
        delayDays: 1,
        template: "",
      },
      {
        type: "message",
        delayDays: 0,
        template:
          "Hey {{firstName}}, loved the perspectives on that thread. Curious what your team at {{company}} is prioritizing this quarter around this space?",
      },
    ],
  },
  {
    id: "inbound_instant_acceptance",
    name: "Instant Acceptance Welcome",
    description: "Send a friendly greeting within 30 minutes of a prospect accepting your connection request.",
    isTemplate: true,
    steps: [
      {
        type: "connect",
        delayDays: 0,
        template:
          "Hi {{firstName}}, would love to connect and keep in touch regarding what you're building at {{company}}.",
      },
      {
        type: "wait",
        delayDays: 1,
        template: "",
      },
      {
        type: "message",
        delayDays: 0,
        template:
          "Hi {{firstName}}, great to be connected! Appreciate you accepting. Let me know if I can ever be helpful or introduce you to anyone in my network.",
      },
    ],
  },
  {
    id: "inbound_meeting_scheduler",
    name: "Meeting Scheduler Linker",
    description: "Detect interest in outbound replies and automatically present your calendar booking link.",
    isTemplate: true,
    steps: [
      {
        type: "connect",
        delayDays: 0,
        template:
          "Hi {{firstName}}, noticed your work as {{title}} at {{company}}. Would love to share a few quick observations on pipeline acceleration.",
      },
      {
        type: "wait",
        delayDays: 2,
        template: "",
      },
      {
        type: "message",
        delayDays: 0,
        template:
          "Hey {{firstName}}, following up quickly. We helped similar teams boost outbound response rates by 3x. Do you have 10 mins this week to compare notes?",
      },
      {
        type: "wait",
        delayDays: 3,
        template: "",
      },
      {
        type: "message",
        delayDays: 0,
        template:
          "Hi {{firstName}}, just floating this to the top of your inbox. If convenient, feel free to grab a quick slot directly on my calendar here: https://cal.com/meeting",
      },
    ],
  },
];

interface Step2SelectFlowProps {
  steps: SequenceStepItem[];
  onStepsChange: (steps: SequenceStepItem[]) => void;
  selectedFlowId: string | null;
  selectedFlowName: string;
  onFlowSelect: (flow: FlowItem) => void;
  onProceed: () => void;
  onBack: () => void;
  targetAudience: string;
}

const VARIABLE_CHIPS = [
  { label: "First Name", tag: "{{firstName}}" },
  { label: "Last Name", tag: "{{lastName}}" },
  { label: "Company", tag: "{{company}}" },
  { label: "Job Title", tag: "{{title}}" },
  { label: "Location", tag: "{{location}}" },
];

const TONE_PRESETS = [
  {
    id: "friendly",
    label: "Friendly Observation",
    icon: "🤝",
    subtitle: "Warm, natural networking & shared curiosity",
  },
  {
    id: "direct",
    label: "Direct Tooling Pitch",
    icon: "⚡",
    subtitle: "Clear problem-solution with zero fluff",
  },
  {
    id: "consultative",
    label: "Consultative / Peer",
    icon: "💡",
    subtitle: "Advisory angle asking about team bottlenecks",
  },
  {
    id: "challenger",
    label: "Challenger / Value-First",
    icon: "🎯",
    subtitle: "Bold benchmark insights & counter-intuitive data",
  },
  {
    id: "custom",
    label: "Custom Tone...",
    icon: "✍️",
    subtitle: "Define your own brand voice, vibe & angle",
  },
];

function renderLeadPreview(text: string): string {
  return text
    .replace(/\{\{\s*firstName\s*\}\}/g, "Sarah")
    .replace(/\{\{\s*lastName\s*\}\}/g, "Jenkins")
    .replace(/\{\{\s*company\s*\}\}/g, "Stripe")
    .replace(/\{\{\s*title\s*\}\}/g, "VP of Engineering")
    .replace(/\{\{\s*location\s*\}\}/g, "San Francisco, CA")
    .replace(/\[Name\]/g, "Sarah");
}

export function Step2SelectFlow({
  steps,
  onStepsChange,
  selectedFlowId,
  selectedFlowName,
  onFlowSelect,
  onProceed,
  onBack,
  targetAudience,
}: Step2SelectFlowProps) {
  const [activeSubTab, setActiveSubTab] = useState<"inbound" | "library" | "editor" | "ai">("inbound");
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [templates, setTemplates] = useState<FlowItem[]>([]);
  const stepIdPrefix = useId();
  const [activeStepId, setActiveStepId] = useState<string>(steps[0]?.id || "step-1");
  const [previewSampleLead, setPreviewSampleLead] = useState(false);

  // AI Tone Generator state
  const [selectedTone, setSelectedTone] = useState<string>("friendly");
  const [customToneInput, setCustomToneInput] = useState<string>("");
  const [appliedCustomTone, setAppliedCustomTone] = useState<string>("");

  useEffect(() => {
    fetch("/api/flows")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFlows(Array.isArray(data.flows) ? data.flows : []);
          setTemplates(Array.isArray(data.templates) ? data.templates : []);
        }
      })
      .catch(() => {
        toast.error("Failed to load automation flows");
      });
  }, []);

  // Insert variable into active step
  const handleInsertVar = (tag: string) => {
    onStepsChange(
      steps.map((s) => {
        if (s.id === activeStepId && s.type !== "wait") {
          return {
            ...s,
            template: s.template ? `${s.template} ${tag}` : tag,
          };
        }
        return s;
      })
    );
    toast.success(`Inserted ${tag}`);
  };

  // Add a follow-up step pair (wait + message)
  const handleAddFollowUpStep = () => {
    const messageSteps = steps.filter((s) => s.type === "message");
    if (messageSteps.length >= 3) {
      toast.error("Maximum 3 follow-up message touchpoints allowed");
      return;
    }
    const newWaitId = `step-${Date.now()}-wait`;
    const newMsgId = `step-${Date.now()}-msg`;
    const newSteps: SequenceStepItem[] = [
      ...steps,
      { id: newWaitId, type: "wait", delayDays: 3, template: "" },
      {
        id: newMsgId,
        type: "message",
        delayDays: 0,
        template:
          "Hey {{firstName}}, just following up one last time before I close this thread. Happy to connect down the road!",
      },
    ];
    onStepsChange(newSteps);
    setActiveStepId(newMsgId);
    toast.success("Added new follow-up step");
  };

  // Remove a step
  const handleRemoveStep = (stepId: string) => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx === -1) return;
    const target = steps[idx];
    if (target.type === "connect" && steps.filter((s) => s.type === "connect").length <= 1) {
      toast.error("Connection request note cannot be removed");
      return;
    }

    const copy = [...steps];
    // If removing message step, check if preceded by wait step and remove both
    if (target.type === "message" && idx > 0 && copy[idx - 1].type === "wait") {
      copy.splice(idx - 1, 2);
    } else {
      copy.splice(idx, 1);
    }
    onStepsChange(copy);
    toast.success("Removed step from sequence");
  };

  // Reorder steps
  const handleMoveStep = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const copy = [...steps];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    onStepsChange(copy);
  };

  // Select a flow from library
  const handleSelectFlowFromLibrary = (flow: FlowItem) => {
    onFlowSelect(flow);
    // Convert flow steps to SequenceStepItem with unique ids
    const newSteps: SequenceStepItem[] = flow.steps.map((st, i) => ({
      id: `step-${Date.now()}-${i}`,
      type: st.type,
      delayDays: st.delayDays,
      template: st.template,
    }));
    onStepsChange(newSteps);
    toast.success(`Selected flow: "${flow.name}"`);
  };

  // Duplicate / customize a flow
  const handleCustomizeFlow = (flow: FlowItem) => {
    handleSelectFlowFromLibrary(flow);
    setActiveSubTab("editor");
    toast.info("Opened flow in Sequence Editor");
  };

  // Apply an Inbound Automation to the campaign sequence
  const handleApplyInboundFlow = (item: FlowItem) => {
    handleSelectFlowFromLibrary(item);
    setActiveSubTab("editor");
    toast.success(`Imported "${item.name}" from Inbound Automations!`);
  };

  // Apply Tone preset
  const handleApplyTone = (toneId: string, customText?: string) => {
    setSelectedTone(toneId);
    const audience = targetAudience || "B2B leaders";
    const stepId = (index: number) => `step-${stepIdPrefix}-${index}`;
    let newSteps: SequenceStepItem[] = [];

    if (toneId === "direct") {
      newSteps = [
        {
          id: stepId(1),
          type: "connect",
          delayDays: 0,
          template: `Hi {{firstName}}, we built a lightweight pipeline tool for ${audience} at {{company}} to scale qualified outbound conversations without spam. Open to connecting?`,
        },
        { id: stepId(2), type: "wait", delayDays: 2, template: "" },
        {
          id: stepId(3),
          type: "message",
          delayDays: 0,
          template: `Hey {{firstName}}, would adding 10-15 qualified meetings this month make a noticeable impact for {{company}}?`,
        },
        { id: stepId(4), type: "wait", delayDays: 3, template: "" },
        {
          id: stepId(5),
          type: "message",
          delayDays: 0,
          template: `{{firstName}}, happy to drop a 2-minute video walkthrough showing how similar teams double pipeline if you're curious.`,
        },
      ];
    } else if (toneId === "consultative") {
      newSteps = [
        {
          id: stepId(1),
          type: "connect",
          delayDays: 0,
          template: `Hi {{firstName}}, we've been tracking outbound conversion shifts across ${audience}. Noticed your work at {{company}} and would love to exchange perspectives!`,
        },
        { id: stepId(2), type: "wait", delayDays: 2, template: "" },
        {
          id: stepId(3),
          type: "message",
          delayDays: 0,
          template: `Thanks for connecting, {{firstName}}. What's the bigger priority for {{company}} right now: increasing lead volume or improving meeting show-up rates?`,
        },
      ];
    } else if (toneId === "challenger") {
      newSteps = [
        {
          id: stepId(1),
          type: "connect",
          delayDays: 0,
          template: `Most outreach in ${audience} gets ignored instantly. We helped teams at {{company}}'s stage 3x reply rates with AI personalization. Would love to connect!`,
        },
        { id: stepId(2), type: "wait", delayDays: 2, template: "" },
        {
          id: stepId(3),
          type: "message",
          delayDays: 0,
          template: `{{firstName}}, are you confident {{company}}'s outbound messaging is standing out against the dozens of messages your prospects receive daily?`,
        },
      ];
    } else if (toneId === "custom" && customText) {
      newSteps = [
        {
          id: stepId(1),
          type: "connect",
          delayDays: 0,
          template: `Hey {{firstName}}, noticed {{company}} navigating ${audience}. Reaching out with a ${customText.toLowerCase()} approach — love what you're building!`,
        },
        { id: stepId(2), type: "wait", delayDays: 2, template: "" },
        {
          id: stepId(3),
          type: "message",
          delayDays: 0,
          template: `Appreciate the connection, {{firstName}}. Following up on our recent chat — how is {{company}} approaching pipeline this quarter?`,
        },
      ];
    } else {
      // Friendly default
      newSteps = [
        {
          id: stepId(1),
          type: "connect",
          delayDays: 0,
          template: `Hey {{firstName}}, noticed your work with {{company}} in ${audience}. Really impressed by the momentum — would love to connect and follow along!`,
        },
        { id: stepId(2), type: "wait", delayDays: 2, template: "" },
        {
          id: stepId(3),
          type: "message",
          delayDays: 0,
          template: `Thanks for connecting, {{firstName}}! Curious how your team is thinking about outbound pipeline this quarter as you continue scaling?`,
        },
      ];
    }

    onStepsChange(newSteps);
    toast.success(`Generated sequence with "${TONE_PRESETS.find((t) => t.id === toneId)?.label || "Custom"}" tone!`);
  };

  // Validation before proceed
  const handleProceed = () => {
    const hasAction = steps.some((s) => s.type === "connect" || s.type === "message");
    if (!hasAction) {
      toast.error("Flow must have at least one connection request or message step");
      return;
    }
    const connectStep = steps.find((s) => s.type === "connect");
    if (connectStep && connectStep.template.length > 300) {
      toast.error("LinkedIn connection request notes cannot exceed 300 characters");
      return;
    }
    onProceed();
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 uppercase font-bold tracking-wider">
            Step 2 of 3 • Automation Sequence
          </span>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Select Automation Flow
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Import an automation from Inbound Automations or select from your flow library. Current: <strong className="text-neutral-800 dark:text-neutral-200">{selectedFlowName || "Custom Flow"}</strong> ({steps.filter((s) => s.type !== "wait").length} message touches)
          </p>
        </div>

        {/* Sub-Tab Selector */}
        <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200/80 dark:border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("inbound")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "inbound"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Download className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Inbound Automations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("library")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "library"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Flow Library</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("editor")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "editor"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>Sequence Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("ai")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "ai"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>AI Tone Presets</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 0: Inbound Automations Import */}
      {activeSubTab === "inbound" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Import Inbound Automations
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  Native Inbound Sync
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
                Select an automation below to import its verified multi-touch cadence into this campaign. To configure global trigger settings, visit your Inbound Automations center.
              </p>
            </div>
            <Link
              href="/dashboard/inbound"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline font-medium shrink-0"
            >
              <span>Manage Inbound Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Custom Saved Automations from Inbound */}
          {flows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-palm-leaf-600" />
                    <span>Your Custom Inbound & Playwright Automations</span>
                  </h4>
                  <span className="text-[10px] bg-palm-leaf-100 text-palm-leaf-900 dark:bg-palm-leaf-950/60 dark:text-palm-leaf-300 font-bold px-2 py-0.5 rounded-full">
                    {flows.length} available
                  </span>
                </div>
                <Link
                  href="/dashboard/inbound"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                >
                  <span>+ Create more on Inbound page</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flows.map((item) => {
                  const isSelected = selectedFlowName === item.name;
                  const touches = item.steps.filter((s) => s.type !== "wait").length;
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-palm-leaf-600 bg-palm-leaf-50/30 dark:bg-palm-leaf-950/20 ring-2 ring-palm-leaf-500/20 shadow-xs"
                          : "border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase text-palm-leaf-700 dark:text-palm-leaf-400 tracking-wider flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            <span>Playwright Sequence</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                            {touches} touches
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Step summary chips */}
                        <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                          {item.steps.map((st, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 shrink-0" />
                              {st.type === "connect" ? (
                                <span>Step 1: Connection Request Note</span>
                              ) : st.type === "wait" ? (
                                <span className="text-neutral-400">
                                  Wait {st.delayDays} day{st.delayDays > 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span>Follow-up Direct Message</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-400">
                          {isSelected ? "Currently imported" : "Ready to import"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyInboundFlow(item)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                            isSelected
                              ? "bg-palm-leaf-600 text-white hover:bg-palm-leaf-700"
                              : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Active in Campaign</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" />
                              <span>Import Sequence</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Platform Inbound Templates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Pre-built Inbound Trigger Automations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INBOUND_AUTOMATIONS.map((item) => {
                const isSelected = selectedFlowName === item.name;
                const touches = item.steps.filter((s) => s.type !== "wait").length;
                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-palm-leaf-600 bg-palm-leaf-50/30 dark:bg-palm-leaf-950/20 ring-2 ring-palm-leaf-500/20 shadow-xs"
                        : "border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase text-palm-leaf-700 dark:text-palm-leaf-400 tracking-wider">
                          Inbound Trigger
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                          {touches} touches
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </h3>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Step summary chips */}
                      <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                        {item.steps.map((st, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 shrink-0" />
                            {st.type === "connect" ? (
                              <span>Step 1: Connection Request Note</span>
                            ) : st.type === "wait" ? (
                              <span className="text-neutral-400">Wait {st.delayDays} day{st.delayDays > 1 ? "s" : ""}</span>
                            ) : (
                              <span>Follow-up Direct Message</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-400">
                        {isSelected ? "Currently imported" : "Ready to import"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyInboundFlow(item)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                          isSelected
                            ? "bg-palm-leaf-600 text-white hover:bg-palm-leaf-700"
                            : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>Active in Campaign</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            <span>Import Sequence</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: Flow Library (Saved Flows + Built-In Templates) */}
      {activeSubTab === "library" && (
        <div className="space-y-6">
          {/* User's Custom Saved Flows */}
          {flows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
                  <span>Your Saved Reusable Flows ({flows.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flows.map((flow) => {
                  const isSelected = selectedFlowId === flow.id;
                  const messageTouches = flow.steps.filter((s) => s.type !== "wait").length;
                  return (
                    <div
                      key={flow.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "border-palm-leaf-600 bg-palm-leaf-50/30 dark:bg-palm-leaf-950/20 ring-2 ring-palm-leaf-500/20 shadow-xs"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {flow.name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                            {flow.description || "Custom outreach flow"}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold shrink-0">
                          {messageTouches} touches
                        </span>
                      </div>

                      {/* Step preview snippet */}
                      <div className="my-2.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950/50 text-[11px] text-neutral-600 dark:text-neutral-400 font-sans italic line-clamp-2">
                        &quot;{flow.steps[0]?.template || "No connect note"}&quot;
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => handleCustomizeFlow(flow)}
                          className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Customize Steps
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectFlowFromLibrary(flow)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-palm-leaf-600 text-white shadow-xs"
                              : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Active Flow</span>
                            </>
                          ) : (
                            <span>Use Flow</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Built-in Templates */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
              <span>Recommended High-Converting Templates</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map((tpl) => {
                  const isSelected = selectedFlowName === tpl.name;
                  const messageTouches = tpl.steps.filter((s) => s.type !== "wait").length;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isSelected
                          ? "border-palm-leaf-600 bg-palm-leaf-50/30 dark:bg-palm-leaf-950/20 ring-2 ring-palm-leaf-500/20 shadow-xs"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase text-palm-leaf-700 dark:text-palm-leaf-400 tracking-wider">
                            Template
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                            {messageTouches} touches
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {tpl.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>

                        <div className="my-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300 italic line-clamp-3">
                          &quot;{tpl.steps[0]?.template}&quot;
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => handleCustomizeFlow(tpl)}
                          className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Customize
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectFlowFromLibrary(tpl)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-palm-leaf-600 text-white shadow-xs"
                              : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Active Flow</span>
                            </>
                          ) : (
                            <span>Use Flow</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick jump to editor */}
          <div
            onClick={() => setActiveSubTab("editor")}
            className="p-3.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-palm-leaf-500 bg-neutral-50/40 dark:bg-neutral-950/20 hover:bg-palm-leaf-50/20 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                <PenLine className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Open Visual Sequence Editor
                </p>
                <p className="text-[11px] text-neutral-500">
                  Add steps, adjust delays, insert dynamic prospect variables, and save reusable flows.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-palm-leaf-700 dark:text-palm-leaf-400">
              Edit steps →
            </span>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Sequence Editor */}
      {activeSubTab === "editor" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Multi-Touch Sequence Editor
              </h3>
              <p className="text-[11px] text-neutral-500">
                Configure every touchpoint in this outreach campaign. Reorder steps or adjust wait delays.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewSampleLead((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  previewSampleLead
                    ? "bg-palm-leaf-50 dark:bg-palm-leaf-950/40 border-palm-leaf-500 text-palm-leaf-800 dark:text-palm-leaf-300 font-semibold"
                    : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>{previewSampleLead ? "Hide sample" : "Preview with sample lead"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("inbound")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Import Inbound Flow</span>
              </button>

              <Link
                href="/dashboard/inbound"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <span>Inbound Page</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Variable Insertion Bar */}
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/50">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
              Insert dynamic variable into active message:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_CHIPS.map((chip) => (
                <button
                  key={chip.tag}
                  type="button"
                  onClick={() => handleInsertVar(chip.tag)}
                  className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-palm-leaf-400 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer font-mono shadow-xs"
                >
                  {chip.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sequence Steps List */}
          <div className="space-y-3">
            {steps.map((step, idx) => {
              if (step.type === "wait") {
                return (
                  <div
                    key={step.id}
                    className="flex items-center justify-between px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950/30 border border-dashed border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Wait</span>
                      <select
                        value={step.delayDays}
                        onChange={(e) => {
                          const days = Number(e.target.value);
                          onStepsChange(
                            steps.map((s) => (s.id === step.id ? { ...s, delayDays: days } : s))
                          );
                        }}
                        className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none"
                      >
                        <option value={1}>1 day</option>
                        <option value={2}>2 days</option>
                        <option value={3}>3 days</option>
                        <option value={4}>4 days</option>
                        <option value={5}>5 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                      </select>
                      <span>before sending the next message</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, "up")}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                          title="Move step up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                      )}
                      {idx < steps.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, "down")}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                          title="Move step down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const isConnect = step.type === "connect";
              const charCount = step.template.length;
              const isOverLimit = isConnect && charCount > 300;

              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border transition-all ${
                    activeStepId === step.id
                      ? "border-palm-leaf-500 bg-white dark:bg-neutral-900 shadow-xs ring-1 ring-palm-leaf-500/20"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isConnect ? "LinkedIn Connection Request Note" : "Follow-Up Message"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isConnect ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isOverLimit
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : charCount > 270
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {charCount}/300 chars
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove follow-up touchpoint"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Reorder controls */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, "up")}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                          title="Move step up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                      )}
                      {idx < steps.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, "down")}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                          title="Move step down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={step.template}
                    onFocus={() => setActiveStepId(step.id)}
                    onChange={(e) => {
                      const text = e.target.value;
                      onStepsChange(
                        steps.map((s) => (s.id === step.id ? { ...s, template: text } : s))
                      );
                    }}
                    placeholder={
                      isConnect
                        ? "Hi {{firstName}}, noticed your work at {{company}}..."
                        : "Thanks for connecting {{firstName}}! Wondering how {{company}} approaches..."
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 p-3 text-xs focus:outline-none focus:border-palm-leaf-500 font-sans leading-relaxed"
                  />

                  {isOverLimit && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>LinkedIn connection notes are strictly limited to 300 characters.</span>
                    </p>
                  )}

                  {previewSampleLead && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] text-neutral-700 dark:text-neutral-300">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                        Preview (Sarah Jenkins • Stripe):
                      </span>
                      {renderLeadPreview(step.template) || <span className="text-neutral-400 italic">Empty message</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Step Button */}
          {steps.filter((s) => s.type === "message").length < 3 && (
            <button
              type="button"
              onClick={handleAddFollowUpStep}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Follow-Up Touchpoint (Wait + Message)</span>
            </button>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: AI Tone Generator */}
      {activeSubTab === "ai" && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              AI Tone & Outreach Angles
            </h3>
            <p className="text-[11px] text-neutral-500">
              Select an angle to automatically rewrite the outreach sequence tailored for {targetAudience || "your ICP"}.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {TONE_PRESETS.map((preset) => {
              const isSelected = selectedTone === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyTone(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-palm-leaf-600 bg-palm-leaf-50/60 dark:bg-palm-leaf-950/40 text-palm-leaf-950 dark:text-palm-leaf-200 shadow-xs ring-2 ring-palm-leaf-500/20"
                      : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{preset.icon}</span>
                    <span className="text-xs font-semibold truncate">{preset.label}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {preset.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedTone === "custom" && (
            <div className="p-3.5 rounded-xl border border-palm-leaf-200 dark:border-palm-leaf-900/60 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 space-y-2">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Describe your custom brand voice & angle:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customToneInput}
                  onChange={(e) => setCustomToneInput(e.target.value)}
                  placeholder="e.g., Casual & witty, citing recent engineering blogs and asking about tech stack"
                  className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customToneInput.trim()) {
                      toast.error("Please enter a custom tone");
                      return;
                    }
                    setAppliedCustomTone(customToneInput.trim());
                    handleApplyTone("custom", customToneInput.trim());
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-2 text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          )}

          {/* Current Generated Cadence Snapshot */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Active Sequence Preview
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab("editor")}
                className="text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
              >
                Fine-tune in Editor →
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((st, i) => (
                <div
                  key={st.id || i}
                  className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-1.5 mb-1 font-semibold text-neutral-700 dark:text-neutral-300">
                    <span className="text-palm-leaf-600">•</span>
                    <span>{st.type === "connect" ? "Step 1: Connection Request" : st.type === "wait" ? `Wait ${st.delayDays} days` : "Follow-Up Message"}</span>
                  </div>
                  {st.type !== "wait" && (
                    <p className="text-neutral-600 dark:text-neutral-400 italic line-clamp-2">
                      &quot;{st.template}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Leads</span>
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <span>Review & Launch</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
