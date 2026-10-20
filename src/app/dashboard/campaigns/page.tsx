"use client";

import { useState, useEffect, useMemo } from "react";
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
  Edit3,
  Trash2,
  Clock,
  MessageSquare,
  UserCheck,
  RefreshCw,
  Eye,
  CheckCircle2,
  PenLine,
  SlidersHorizontal,
  Rocket,
  Search,
  X,
  UserPlus,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";
import { Step1SelectLeads } from "@/components/campaigns/Step1SelectLeads";
import { Step2SelectFlow } from "@/components/campaigns/Step2SelectFlow";
import { Step3ReviewLaunch } from "@/components/campaigns/Step3ReviewLaunch";
import { SequenceStepItem, FlowItem, EnrollmentMode } from "@/components/campaigns/types";

export interface SequenceDraft {
  id: string;
  title: string;
  tag: string;
  preview: string;
  step1: string;
  step2Wait: number;
  step2Message: string;
  step3Wait: number;
  step3Message: string;
}

export interface CustomStepItem {
  id: string;
  type: "connect" | "wait" | "message";
  delayDays: number;
  template: string;
}

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

const VARIABLE_CHIPS = [
  { label: "First Name", tag: "{{firstName}}" },
  { label: "Last Name", tag: "{{lastName}}" },
  { label: "Company", tag: "{{company}}" },
  { label: "Job Title", tag: "{{title}}" },
  { label: "Location", tag: "{{location}}" },
];

function getAiDraftsForTone(
  toneId: string,
  customPrompt: string,
  audience: string
): SequenceDraft[] {
  const cleanAudience = audience.trim() || "B2B SaaS Leaders";

  if (toneId === "custom" && customPrompt.trim()) {
    const promptShort = customPrompt.trim();
    return [
      {
        id: "custom-opt-1",
        title: "Option 1 (Custom Tone Observation)",
        tag: `Custom: "${promptShort.slice(0, 20)}..."`,
        preview: `Hey {{firstName}}, noticed {{company}} navigating ${cleanAudience}. Reaching out with a ${promptShort.toLowerCase()} angle...`,
        step1: `Hey {{firstName}}, noticed {{company}} navigating ${cleanAudience}. Reaching out with a ${promptShort.toLowerCase()} angle — really love what you're building and would be great to connect!`,
        step2Wait: 2,
        step2Message: `Thanks for connecting, {{firstName}}! As a fellow leader in ${cleanAudience}, curious how {{company}} is tackling outbound pipelines right now?`,
        step3Wait: 3,
        step3Message: `Quick bump {{firstName}} — would you be open to a 10-minute chat later this week to compare playbooks? No pressure at all!`,
      },
      {
        id: "custom-opt-2",
        title: "Option 2 (Custom Value Pitch)",
        tag: `Custom: "${promptShort.slice(0, 20)}..."`,
        preview: `Hi {{firstName}}, we tailored our pipeline assistant for ${cleanAudience} with a ${promptShort.toLowerCase()} approach...`,
        step1: `Hi {{firstName}}, we tailored our pipeline assistant for ${cleanAudience} teams like {{company}}. Focusing on high-intent outbound without manual grind. Open to connecting?`,
        step2Wait: 2,
        step2Message: `Hey {{firstName}}, would adding 15+ qualified meetings every month move the needle for {{company}}'s outbound team?`,
        step3Wait: 3,
        step3Message: `{{firstName}}, happy to send a 2-min video walkthrough of how similar ${cleanAudience} teams run this if you're curious!`,
      },
      {
        id: "custom-opt-3",
        title: "Option 3 (Custom Peer Exchange)",
        tag: `Custom: "${promptShort.slice(0, 20)}..."`,
        preview: `{{firstName}}, curious how your outbound team in ${cleanAudience} is handling response qualification...`,
        step1: `{{firstName}}, came across your profile while researching forward-thinking teams in ${cleanAudience}. Would love to connect and follow {{company}}'s updates!`,
        step2Wait: 2,
        step2Message: `Appreciate the connection, {{firstName}}. What's been the biggest hurdle for {{company}} in outbound recently — deliverability or reply rates?`,
        step3Wait: 3,
        step3Message: `No worries if your schedule is packed, {{firstName}}. Just thought it'd make for a great peer discussion. Wishing you a great rest of the week!`,
      },
    ];
  }

  if (toneId === "direct") {
    return [
      {
        id: "direct-opt-1",
        title: "Option 1 (Direct Tooling Pitch)",
        tag: "Direct • Problem-Solution",
        preview: `Hi {{firstName}}, we built a lightweight pipeline assistant for ${cleanAudience} to automate outbound without spam...`,
        step1: `Hi {{firstName}}, we built a lightweight pipeline assistant for ${cleanAudience} teams like {{company}} to scale qualified meetings with zero spam. Open to connecting?`,
        step2Wait: 2,
        step2Message: `Hey {{firstName}}, appreciate the connection! Would 10-15 additional qualified meetings this month make a noticeable impact for {{company}}?`,
        step3Wait: 3,
        step3Message: `Quick follow-up {{firstName}} — if you have 5 mins later this week, I'd love to share the exact 3-step playbook other ${cleanAudience} teams are using.`,
      },
      {
        id: "direct-opt-2",
        title: "Option 2 (High-Converting Sequences)",
        tag: "Direct • Metric-Driven",
        preview: `{{firstName}}, noticed your leadership role at {{company}}. We help ${cleanAudience} companies boost outbound acceptance rates above 40%...`,
        step1: `{{firstName}}, noticed your leadership role at {{company}}. We help ${cleanAudience} companies boost outbound acceptance rates above 40%. Would love to connect!`,
        step2Wait: 2,
        step2Message: `Thanks for connecting, {{firstName}}. Are you currently testing AI-assisted sequence optimization at {{company}}?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, happy to drop a quick 2-minute summary of how we helped peers in ${cleanAudience} double response rates if you're interested.`,
      },
      {
        id: "direct-opt-3",
        title: "Option 3 (Admin Elimination)",
        tag: "Direct • Time-Saver",
        preview: `Hi {{firstName}}, quick intro — we help outbound leaders in ${cleanAudience} eliminate 4+ hours of manual prospecting tasks each week...`,
        step1: `Hi {{firstName}}, quick intro — we help outbound leaders in ${cleanAudience} eliminate 4+ hours of manual prospecting tasks each week. Thought this might resonate at {{company}}!`,
        step2Wait: 2,
        step2Message: `{{firstName}}, would you be open to a 5-minute look at how similar teams cut out manual LinkedIn tasks entirely?`,
        step3Wait: 3,
        step3Message: `If timing isn't right right now {{firstName}}, absolutely no worries. Glad to be connected here either way!`,
      },
    ];
  }

  if (toneId === "consultative") {
    return [
      {
        id: "consult-opt-1",
        title: "Option 1 (Market Shift Diagnostic)",
        tag: "Consultative • Benchmark",
        preview: `Hi {{firstName}}, tracking outbound conversion shifts across ${cleanAudience}. Noticed your work at {{company}}...`,
        step1: `Hi {{firstName}}, we've been tracking outbound conversion shifts across ${cleanAudience}. Noticed your work at {{company}} and would love to exchange perspectives!`,
        step2Wait: 2,
        step2Message: `Thanks for connecting, {{firstName}}. We're seeing reply rates drop on generic outreach in ${cleanAudience} — curious if {{company}} has noticed a similar trend?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, happy to share our latest conversion benchmarks across ${cleanAudience} if it helps your team's quarterly planning.`,
      },
      {
        id: "consult-opt-2",
        title: "Option 2 (Strategy Alignment)",
        tag: "Consultative • Strategy",
        preview: `{{firstName}}, came across your profile while researching leaders in ${cleanAudience}...`,
        step1: `{{firstName}}, came across your profile while researching forward-thinking leaders in ${cleanAudience}. Really impressive background with {{company}}!`,
        step2Wait: 2,
        step2Message: `Appreciate the connect, {{firstName}}. What's the bigger priority for {{company}} right now: increasing lead volume or improving meeting show-up rates?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, if you have 10 minutes next week, I'd love to share what similar ${cleanAudience} teams are testing right now.`,
      },
      {
        id: "consult-opt-3",
        title: "Option 3 (Peer Discussion)",
        tag: "Consultative • Peer Exchange",
        preview: `{{firstName}}, curious how your outbound team is handling reply qualification across ${cleanAudience}...`,
        step1: `{{firstName}}, curious how your outbound team is handling reply qualification across ${cleanAudience} right now? Thought I'd connect!`,
        step2Wait: 2,
        step2Message: `Thanks for the connection {{firstName}}! When {{company}} reaches out to prospects, what's been your highest-converting channel so far?`,
        step3Wait: 3,
        step3Message: `No rush at all {{firstName}} — just thought it would make for an interesting peer discussion. Wishing you a great week!`,
      },
    ];
  }

  if (toneId === "challenger") {
    return [
      {
        id: "chal-opt-1",
        title: "Option 1 (The Generic Outreach Problem)",
        tag: "Challenger • Insight-Led",
        preview: `Most outreach in ${cleanAudience} gets ignored instantly. We helped teams at {{company}}'s stage 3x reply rates...`,
        step1: `Most outreach in ${cleanAudience} gets ignored instantly. We helped teams at {{company}}'s stage 3x reply rates with AI personalization. Would love to connect!`,
        step2Wait: 2,
        step2Message: `{{firstName}}, are you confident {{company}}'s outbound messaging is standing out against the dozens of messages your prospects receive daily?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, if you have 5 mins, I'd love to share 3 simple tweaks that doubled meeting conversion for another ${cleanAudience} team.`,
      },
      {
        id: "chal-opt-2",
        title: "Option 2 (Multi-Touch Warming)",
        tag: "Challenger • Playbook",
        preview: `Hi {{firstName}}, noticed {{company}} scaling in ${cleanAudience}. If you're relying purely on email, you're missing 60% of buyers...`,
        step1: `Hi {{firstName}}, noticed {{company}} scaling in ${cleanAudience}. If you're relying purely on cold email, you might be missing 60% of buyers. Let's connect!`,
        step2Wait: 2,
        step2Message: `Thanks for connecting, {{firstName}}. Have you tested automated LinkedIn profile warming before pitching your ICP at {{company}}?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, happy to send over our multi-touch cadence breakdown if you want to see how top ${cleanAudience} teams structure it.`,
      },
      {
        id: "chal-opt-3",
        title: "Option 3 (Cadence Diagnostic)",
        tag: "Challenger • Bold CTA",
        preview: `{{firstName}}, 8 out of 10 ${cleanAudience} outreach campaigns fail due to poor follow-up timing...`,
        step1: `{{firstName}}, 8 out of 10 ${cleanAudience} outreach campaigns fail due to poor follow-up timing. We fixed this for teams like {{company}} — happy to connect!`,
        step2Wait: 2,
        step2Message: `{{firstName}}, how many touchpoints does your team currently average before a prospect responds?`,
        step3Wait: 3,
        step3Message: `Hey {{firstName}}, let me know if you'd like a copy of our high-converting ${cleanAudience} sequence audit. Have a great week!`,
      },
    ];
  }

  // Default: friendly
  return [
    {
      id: "friendly-opt-1",
      title: "Option 1 (Friendly Observation)",
      tag: "Friendly • Expansion",
      preview: `Hey {{firstName}}, noticed your team expanding into EMEA...`,
      step1: `Hey {{firstName}}, noticed your team at {{company}} expanding into EMEA and scaling across ${cleanAudience}. Really impressed by the momentum — would love to connect and follow along!`,
      step2Wait: 2,
      step2Message: `Thanks for connecting, {{firstName}}! Curious how your team is thinking about outbound pipeline this quarter as you continue scaling?`,
      step3Wait: 3,
      step3Message: `Hey {{firstName}}, just floating this back up. If you're open to sharing notes on ${cleanAudience} outreach best practices, let me know!`,
    },
    {
      id: "friendly-opt-2",
      title: "Option 2 (Direct Tooling Pitch)",
      tag: "Friendly • Lightweight Pitch",
      preview: `Hi {{firstName}}, we built a lightweight pipeline assistant...`,
      step1: `Hi {{firstName}}, we built a lightweight pipeline assistant for teams like {{company}} to scale qualified outbound conversations without spam. Open to connecting?`,
      step2Wait: 2,
      step2Message: `Hey {{firstName}}, thanks for connecting! We recently helped similar teams in ${cleanAudience} book 2x more meetings. Curious if outbound is a priority currently?`,
      step3Wait: 3,
      step3Message: `Quick follow-up {{firstName}} — would you be open to a 10-min chat later this week? If not, no worries at all!`,
    },
    {
      id: "friendly-opt-3",
      title: "Option 3 (Peer Discussion)",
      tag: "Friendly • Peer Discussion",
      preview: `{{firstName}}, curious how your outbound team is handling reply qualification...`,
      step1: `{{firstName}}, curious how your outbound team is handling reply qualification across ${cleanAudience}? Love what you're building at {{company}} — thought I'd connect!`,
      step2Wait: 2,
      step2Message: `Thanks for connecting {{firstName}}! Always great to connect with peers in ${cleanAudience}. How's the quarter shaping up for {{company}}?`,
      step3Wait: 3,
      step3Message: `No pressure at all {{firstName}}, just curious if this is top of mind right now. Have a productive rest of the week!`,
    },
  ];
}

function renderLeadPreview(text: string): string {
  return text
    .replace(/\{\{\s*firstName\s*\}\}/g, "Sarah")
    .replace(/\{\{\s*lastName\s*\}\}/g, "Jenkins")
    .replace(/\{\{\s*company\s*\}\}/g, "Stripe")
    .replace(/\{\{\s*title\s*\}\}/g, "VP of Engineering")
    .replace(/\{\{\s*location\s*\}\}/g, "San Francisco, CA")
    .replace(/\[Name\]/g, "Sarah");
}

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

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCampaignsIfNeeded,
  fetchOverviewIfNeeded,
  fetchLeadsIfNeeded,
  updateCampaignStatusState,
  setCampaignDetailState,
} from "@/store/slices/databaseSlice";

export default function CampaignsPage() {
  const dispatch = useAppDispatch();
  const {
    items: storeCampaigns,
    availableLeadsCount,
    availableAccountsCount,
    detailsById,
    loading: storeLoading,
    loaded: storeLoaded,
  } = useAppSelector((state) => state.database.campaigns);
  const { items: databaseLeads } = useAppSelector((state) => state.database.leads);

  const [activeTab, setActiveTab] = useState<"list" | "wizard" | "detail">("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const isLoading = storeLoading && !storeLoaded;
  const campaigns = storeCampaigns;

  // 3-Step Campaign Creation Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [campaignName, setCampaignName] = useState("Targeted Outreach Sequence #1");
  const [targetAudience, setTargetAudience] = useState("B2B SaaS Decision Makers");
  const [dailyCap, setDailyCap] = useState(20);
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("specific");
  const [selectedWizardLeadIds, setSelectedWizardLeadIds] = useState<string[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowItem | null>(null);
  const [wizardSteps, setWizardSteps] = useState<SequenceStepItem[]>([
    {
      id: "step-1",
      type: "connect",
      delayDays: 0,
      template:
        "Hey {{firstName}}, noticed your team expanding into EMEA and scaling across B2B SaaS. Really impressed by the momentum — would love to connect and follow along!",
    },
    {
      id: "step-2",
      type: "wait",
      delayDays: 2,
      template: "",
    },
    {
      id: "step-3",
      type: "message",
      delayDays: 0,
      template:
        "Thanks for connecting, {{firstName}}! Curious how your team is thinking about outbound pipeline this quarter as you continue scaling?",
    },
    {
      id: "step-4",
      type: "wait",
      delayDays: 3,
      template: "",
    },
    {
      id: "step-5",
      type: "message",
      delayDays: 0,
      template:
        "Hey {{firstName}}, just floating this back up. If you're open to sharing notes on outbound best practices, let me know!",
    },
  ]);

  // Campaign Detail Enrolled Leads state
  const [enrolledLeads, setEnrolledLeads] = useState<any[]>([]);
  const [isLoadingEnrolledLeads, setIsLoadingEnrolledLeads] = useState<boolean>(false);
  const [enrolledFilterTab, setEnrolledFilterTab] = useState<string>("all");
  const [showAddLeadsModal, setShowAddLeadsModal] = useState<boolean>(false);
  const [selectedAddLeadIds, setSelectedAddLeadIds] = useState<string[]>([]);
  const [addLeadSearch, setAddLeadSearch] = useState<string>("");
  const [isEnrollingAddLeads, setIsEnrollingAddLeads] = useState<boolean>(false);
  const [isSendingStep, setIsSendingStep] = useState<string | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});

  const filteredAddLeads = useMemo(() => {
    if (!addLeadSearch.trim()) return databaseLeads;
    const q = addLeadSearch.toLowerCase();
    return databaseLeads.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.firstName && l.firstName.toLowerCase().includes(q)) ||
        (l.lastName && l.lastName.toLowerCase().includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.jobTitle && l.jobTitle.toLowerCase().includes(q))
    );
  }, [databaseLeads, addLeadSearch]);

  const filteredEnrolledLeads = useMemo(() => {
    if (enrolledFilterTab === "all") return enrolledLeads;
    return enrolledLeads.filter((item) => item.state === enrolledFilterTab);
  }, [enrolledLeads, enrolledFilterTab]);

  useEffect(() => {
    if (databaseLeads.length > 0 && selectedWizardLeadIds.length === 0) {
      setSelectedWizardLeadIds(databaseLeads.slice(0, 10).map((l) => l.id));
    }
  }, [databaseLeads, selectedWizardLeadIds.length]);

  // Support 1-click transition from Inbound automations page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setActiveTab("wizard");
        const paramFlowName = params.get("flowName");
        if (paramFlowName) {
          setCampaignName(`${paramFlowName} Campaign`);
          toast.info(`Campaign initialized for "${paramFlowName}"`);
        }
      }
    }
  }, []);

  const handleLaunchCampaign = async (launchNow: boolean) => {
    setIsLaunching(true);
    const stepsPayload = wizardSteps.map((s) => ({
      type: s.type,
      delayDays: s.delayDays,
      template: s.template,
    }));

    const finalLeadIds =
      enrollmentMode === "later"
        ? []
        : enrollmentMode === "all"
        ? databaseLeads.map((l) => l.id)
        : selectedWizardLeadIds;

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          description: targetAudience.trim()
            ? `Target: ${targetAudience.trim()} • Flow: ${selectedFlow?.name || "Custom"}`
            : `Flow: ${selectedFlow?.name || "Custom"}`,
          steps: stepsPayload,
          dailyCap,
          leadIds: finalLeadIds,
          flowId: selectedFlow?.id,
          flowName: selectedFlow?.name,
          launch: launchNow,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          launchNow
            ? `Campaign launched with ${finalLeadIds.length} enrolled leads!`
            : "Campaign saved as Draft!"
        );
        await dispatch(fetchCampaignsIfNeeded({ force: true }));
        await dispatch(fetchLeadsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
        setActiveTab("list");
        setWizardStep(1);
      } else {
        toast.error(data.error || "Failed to create campaign");
      }
    } catch {
      toast.error("Network error while creating campaign");
    } finally {
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    dispatch(fetchCampaignsIfNeeded());
    dispatch(fetchLeadsIfNeeded());
  }, [dispatch]);

  const toggleStatus = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "Paused" : "Active";

    dispatch(updateCampaignStatusState({ id, status: nextStatus }));

    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus.toLowerCase() }),
      });
      toast.success(`Campaign marked as ${nextStatus}`);
    } catch {
      toast.error("Failed to update campaign status");
      dispatch(fetchCampaignsIfNeeded({ force: true }));
    }
  };

  const fetchEnrolledLeads = async (campaignId: string) => {
    setIsLoadingEnrolledLeads(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads?limit=100`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setEnrolledLeads(data.items);
      } else {
        setEnrolledLeads([]);
      }
    } catch {
      setEnrolledLeads([]);
    } finally {
      setIsLoadingEnrolledLeads(false);
    }
  };

  const fetchCampaignDetail = async (id: string) => {
    fetchEnrolledLeads(id);
    const cached = detailsById[id];
    if (cached) {
      setCampaignDetail(cached);
      return;
    }
    setIsLoadingDetail(true);
    setCampaignDetail(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) {
        const detail: CampaignDetail = {
          id,
          name: data.campaign.name,
          status: data.campaign.status,
          dailyCap: data.campaign.dailyCap ?? 20,
          sentToday: data.sentToday ?? 0,
          remainingToday: data.remainingToday ?? 0,
          funnel: data.funnel || [],
        };
        setCampaignDetail(detail);
        dispatch(setCampaignDetailState(detail));
      } else {
        toast.error(data.error || "Failed to load campaign details");
      }
    } catch {
      toast.error("Failed to load campaign details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleEnrollAddLeads = async () => {
    if (!selectedCampaignId) return;
    if (selectedAddLeadIds.length === 0) {
      toast.error("Please select at least one lead to enroll");
      return;
    }

    setIsEnrollingAddLeads(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedAddLeadIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Enrolled ${data.enrolled} leads!${
            data.alreadyEnrolled ? ` (${data.alreadyEnrolled} already enrolled)` : ""
          }`
        );
        setShowAddLeadsModal(false);
        setSelectedAddLeadIds([]);
        fetchEnrolledLeads(selectedCampaignId);
        fetchCampaignDetail(selectedCampaignId);
        await dispatch(fetchCampaignsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
      } else {
        toast.error(data.error || "Failed to enroll leads");
      }
    } catch {
      toast.error("Network error while enrolling leads");
    } finally {
      setIsEnrollingAddLeads(false);
    }
  };

  const handleSendQueuedLeadStep = async (leadRow: any) => {
    const enrollmentId = leadRow.enrollmentId;
    setIsSendingStep(enrollmentId);
    setCampaignError(null);
    try {
      const profileUrl = leadRow.lead?.linkedinUrl;
      const note = leadRow.nextAction?.message || "";
      const stepType = leadRow.nextAction?.type || (leadRow.state === "queued" ? "connect" : "message");

      if (!profileUrl || typeof profileUrl !== "string" || !profileUrl.trim()) {
        const errMsg = `Cannot dispatch to ${leadRow.lead?.name || "prospect"}: Missing or invalid LinkedIn profile URL.`;
        toast.error(errMsg);
        setCampaignError(errMsg);
        setLeadErrors((prev) => ({ ...prev, [enrollmentId]: errMsg }));
        return;
      }

      let sendSuccess = false;

      if (stepType === "connect") {
        // Real LinkedIn connection request with Playwright
        const sendRes = await fetch("/api/linkedin/send-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileUrl: profileUrl.trim(),
            note,
            leadId: leadRow.lead?.id || leadRow.lead?._id,
          }),
        });

        const sendData = await sendRes.json().catch(() => ({}));

        if (!sendRes.ok || !sendData.success) {
          const errMsg = sendData.error || "Failed to dispatch connection request via Playwright.";
          toast.error(errMsg);
          setCampaignError(errMsg);
          setLeadErrors((prev) => ({ ...prev, [enrollmentId]: errMsg }));
          return;
        }

        sendSuccess = true;
      } else {
        // Direct follow-up message with Playwright
        const sendRes = await fetch("/api/linkedin/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileUrl: profileUrl.trim(),
            message: note || "Hey, thanks for connecting!",
            leadId: leadRow.lead?.id || leadRow.lead?._id,
            campaignId: selectedCampaignId,
          }),
        });

        const sendData = await sendRes.json().catch(() => ({}));

        if (!sendRes.ok || !sendData.success) {
          const errMsg = sendData.error || "Failed to dispatch follow-up message via Playwright.";
          toast.error(errMsg);
          setCampaignError(errMsg);
          setLeadErrors((prev) => ({ ...prev, [enrollmentId]: errMsg }));
          return;
        }

        sendSuccess = true;
      }

      if (sendSuccess) {
        // Clear lead error
        setLeadErrors((prev) => {
          const copy = { ...prev };
          delete copy[enrollmentId];
          return copy;
        });

        const eventRes = await fetch(`/api/campaigns/${selectedCampaignId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "sent",
            enrollmentIds: [enrollmentId],
          }),
        });
        const eventData = await eventRes.json();
        if (eventData.success) {
          toast.success(
            `Successfully sent ${stepType === "connect" ? "connection request" : "follow-up message"} to ${
              leadRow.lead?.name || "prospect"
            }!`
          );
          fetchEnrolledLeads(selectedCampaignId);
          fetchCampaignDetail(selectedCampaignId);
        } else {
          toast.error(eventData.error || "Failed to advance sequence step");
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Network error while dispatching touchpoint";
      toast.error(errMsg);
      setCampaignError(errMsg);
      setLeadErrors((prev) => ({ ...prev, [enrollmentId]: errMsg }));
    } finally {
      setIsSendingStep(null);
    }
  };

  const handleRemoveEnrolledLead = async (enrollmentId: string) => {
    if (!confirm("Remove this prospect from the campaign sequence?")) return;
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentIds: [enrollmentId] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Prospect removed from sequence");
        fetchEnrolledLeads(selectedCampaignId);
        fetchCampaignDetail(selectedCampaignId);
      }
    } catch {
      toast.error("Failed to remove lead");
    }
  };



  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || null;

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
                        <div className="flex items-center justify-center pt-2">
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
        !selectedCampaign ? (
          <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">No Campaign Selected</h3>
            <p className="text-xs text-neutral-500">Please choose a campaign from the list or create a new campaign.</p>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Back to Campaigns
            </button>
          </motion.div>
        ) : (
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddLeadIds([]);
                    setAddLeadSearch("");
                    setShowAddLeadsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Leads to Campaign</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(selectedCampaign.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {selectedCampaign.status === "Active" ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-palm-leaf-600" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedCampaign.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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

          {/* Campaign Execution Error Banner */}
          {campaignError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 flex items-start justify-between gap-3 text-xs text-red-900 dark:text-red-200 shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">Connection Request / Sequence Error</span>
                  <p className="mt-0.5 text-neutral-600 dark:text-neutral-300 leading-relaxed">{campaignError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCampaignError(null)}
                className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                title="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Enrolled Prospects Section */}
          <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Enrolled Prospects ({enrolledLeads.length})
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Prospects actively advancing through this campaign sequence.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter pills */}
                <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200/80 dark:border-neutral-800 text-xs">
                  {["all", "queued", "invited", "accepted", "replied"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEnrolledFilterTab(tab)}
                      className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                        enrolledFilterTab === tab
                          ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    fetchEnrolledLeads(selectedCampaign.id);
                    fetchCampaignDetail(selectedCampaign.id);
                  }}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
                  title="Refresh prospects list"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingEnrolledLeads ? "animate-spin text-palm-leaf-600" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddLeadIds([]);
                    setAddLeadSearch("");
                    setShowAddLeadsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Leads</span>
                </button>
              </div>
            </div>

            {/* Prospects Table / Empty state */}
            {isLoadingEnrolledLeads ? (
              <div className="py-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-palm-leaf-600" />
                <span>Loading enrolled prospects...</span>
              </div>
            ) : filteredEnrolledLeads.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                  <Users className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {enrolledFilterTab === "all" ? "No Prospects Enrolled Yet" : `No ${enrolledFilterTab} prospects found`}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  {enrolledFilterTab === "all"
                    ? "Add leads from your database to start sending connection requests and follow-ups automatically."
                    : `No prospects currently in ${enrolledFilterTab} state for this campaign.`}
                </p>
                {enrolledFilterTab === "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddLeadIds([]);
                      setAddLeadSearch("");
                      setShowAddLeadsModal(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Add Leads from Database</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-medium">
                      <th className="py-3 px-6">Prospect</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Step Progress</th>
                      <th className="py-3 px-4">Next Action / Cadence</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {filteredEnrolledLeads.map((item) => {
                      const lead = item.lead || {};
                      const initials = (lead.name || lead.firstName || "L")[0].toUpperCase();
                      const isSending = isSendingStep === item.enrollmentId;
                      const leadError = leadErrors[item.enrollmentId];

                      const stateBadgeClass =
                        item.state === "queued"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60"
                          : item.state === "invited"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60"
                          : item.state === "accepted"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60"
                          : item.state === "replied"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60"
                          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200";

                      return (
                        <tr key={item.enrollmentId} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                    {lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Prospect"}
                                  </span>
                                  {lead.linkedinUrl && (
                                    <a
                                      href={lead.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-neutral-400 hover:text-palm-leaf-600 transition-colors"
                                      title="Open LinkedIn Profile"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-500 truncate">
                                  {[lead.title || lead.jobTitle, lead.company].filter(Boolean).join(" • ")}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {leadError ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/60">
                                  <AlertCircle className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                                  <span>Failed</span>
                                </span>
                                <p className="text-[10px] text-red-600 dark:text-red-400 font-medium line-clamp-1 max-w-[140px]" title={leadError}>
                                  {leadError}
                                </p>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${stateBadgeClass}`}>
                                {item.state === "queued" && <Clock className="h-2.5 w-2.5" />}
                                {item.state === "invited" && <Send className="h-2.5 w-2.5" />}
                                {item.state === "accepted" && <Check className="h-2.5 w-2.5" />}
                                {item.state === "replied" && <MessageSquare className="h-2.5 w-2.5" />}
                                <span className="capitalize">{item.state}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                              Step {item.currentStep + 1} of {item.totalSteps || 1}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            {item.nextAction ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  {item.nextAction.waitingForAcceptance ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Waiting for connect accept
                                    </span>
                                  ) : item.nextAction.due ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Ready to send now
                                    </span>
                                  ) : (
                                    <span className="text-neutral-500 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Cadence scheduled
                                    </span>
                                  )}
                                </div>
                                {item.nextAction.message && (
                                  <p className="text-[11px] text-neutral-500 truncate italic">
                                    &quot;{item.nextAction.message}&quot;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">Cadence completed</span>
                            )}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {leadError ? (
                                <button
                                  type="button"
                                  disabled={isSending}
                                  onClick={() => handleSendQueuedLeadStep(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                  title="Retry dispatching this step"
                                >
                                  {isSending ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Retrying...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      <span>Retry Send</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                (item.state === "queued" || (item.state === "accepted" && item.nextAction?.due)) && (
                                  <button
                                    type="button"
                                    disabled={isSending}
                                    onClick={() => handleSendQueuedLeadStep(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                  >
                                    {isSending ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-3 w-3" />
                                        <span>Send Now</span>
                                      </>
                                    )}
                                  </button>
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveEnrolledLead(item.enrollmentId)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Remove from sequence"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Add Leads Modal */}
          <AnimatePresence>
            {showAddLeadsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddLeadsModal(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="relative w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                >
                  {/* Modal Header */}
                  <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Add Leads to Campaign
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Enroll prospects from your leads database into {selectedCampaign.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddLeadsModal(false)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Search and Quick Selection */}
                  <div className="p-4 bg-neutral-50/50 dark:bg-neutral-950/30 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={addLeadSearch}
                        onChange={(e) => setAddLeadSearch(e.target.value)}
                        placeholder="Search leads by name, company, title..."
                        className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:border-palm-leaf-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const enrolledLeadIds = new Set(enrolledLeads.map((e) => e.lead?.id));
                          const eligible = databaseLeads
                            .filter((l) => !enrolledLeadIds.has(l.id))
                            .map((l) => l.id);
                          setSelectedAddLeadIds(eligible);
                        }}
                        className="text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer"
                      >
                        Select Eligible
                      </button>
                      <span className="text-neutral-300 dark:text-neutral-700">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedAddLeadIds([])}
                        className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Leads List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 p-2">
                    {filteredAddLeads.length === 0 ? (
                      <div className="py-12 text-center text-xs text-neutral-400">
                        No leads found in database matching your search.
                      </div>
                    ) : (
                      filteredAddLeads.map((lead) => {
                        const isAlreadyEnrolled = enrolledLeads.some((e) => e.lead?.id === lead.id);
                        const isChecked = selectedAddLeadIds.includes(lead.id);

                        return (
                          <label
                            key={lead.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              isAlreadyEnrolled
                                ? "opacity-60 bg-neutral-50/50 dark:bg-neutral-950/20 cursor-not-allowed"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isAlreadyEnrolled}
                              checked={isAlreadyEnrolled || isChecked}
                              onChange={(e) => {
                                if (isAlreadyEnrolled) return;
                                if (e.target.checked) {
                                  setSelectedAddLeadIds((prev) => [...prev, lead.id]);
                                } else {
                                  setSelectedAddLeadIds((prev) => prev.filter((id) => id !== lead.id));
                                }
                              }}
                              className="rounded border-neutral-300 text-palm-leaf-600 focus:ring-palm-leaf-500 h-4 w-4"
                            />
                            <div className="h-8 w-8 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {(lead.name || lead.firstName || "L")[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                  {lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Lead"}
                                </p>
                                {isAlreadyEnrolled && (
                                  <span className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">
                                    Already enrolled
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {[lead.title || lead.jobTitle, lead.company, lead.location].filter(Boolean).join(" • ")}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {selectedAddLeadIds.length} leads selected
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddLeadsModal(false)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={selectedAddLeadIds.length === 0 || isEnrollingAddLeads}
                        onClick={handleEnrollAddLeads}
                        className="px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {isEnrollingAddLeads ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Enrolling...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Enroll {selectedAddLeadIds.length} Leads</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
        )
      )}

      {/* VIEW 3: 3-Step Campaign Creation Wizard */}
      {activeTab === "wizard" && (
        <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-7 shadow-xs max-w-4xl mx-auto">
          {/* Stepper Progress Bar */}
          <div className="mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2.5">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${
                  wizardStep === 1
                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                    : "hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    wizardStep >= 1
                      ? "bg-palm-leaf-600 text-white"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600"
                  }`}
                >
                  1
                </span>
                <span>1. Select Leads</span>
              </button>

              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${
                  wizardStep === 2
                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                    : "hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    wizardStep >= 2
                      ? "bg-palm-leaf-600 text-white"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600"
                  }`}
                >
                  2
                </span>
                <span>2. Automation Flow</span>
              </button>

              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${
                  wizardStep === 3
                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                    : "hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    wizardStep >= 3
                      ? "bg-palm-leaf-600 text-white"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600"
                  }`}
                >
                  3
                </span>
                <span>3. Review & Launch</span>
              </button>
            </div>

            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <motion.div
                animate={{ width: `${(wizardStep / 3) * 100}%` }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-palm-leaf-600 rounded-full"
              />
            </div>
          </div>

          {/* Step 1: Select Leads */}
          {wizardStep === 1 && (
            <Step1SelectLeads
              databaseLeads={databaseLeads as any}
              selectedLeadIds={selectedWizardLeadIds}
              onSelectionChange={setSelectedWizardLeadIds}
              enrollmentMode={enrollmentMode}
              onEnrollmentModeChange={setEnrollmentMode}
              onProceed={() => setWizardStep(2)}
            />
          )}

          {/* Step 2: Select or Create Automation Flow */}
          {wizardStep === 2 && (
            <Step2SelectFlow
              steps={wizardSteps}
              onStepsChange={setWizardSteps}
              selectedFlowId={selectedFlow?.id || null}
              selectedFlowName={selectedFlow?.name || ""}
              onFlowSelect={(flow) => setSelectedFlow(flow)}
              onProceed={() => setWizardStep(3)}
              onBack={() => setWizardStep(1)}
              targetAudience={targetAudience}
            />
          )}

          {/* Step 3: Review and Launch Campaign */}
          {wizardStep === 3 && (
            <Step3ReviewLaunch
              campaignName={campaignName}
              onCampaignNameChange={setCampaignName}
              targetAudience={targetAudience}
              onTargetAudienceChange={setTargetAudience}
              dailyCap={dailyCap}
              onDailyCapChange={setDailyCap}
              selectedLeadIds={selectedWizardLeadIds}
              enrollmentMode={enrollmentMode}
              totalDatabaseLeads={databaseLeads.length}
              databaseLeads={databaseLeads as any}
              steps={wizardSteps}
              flowName={selectedFlow?.name || "Custom Flow"}
              availableAccountsCount={availableAccountsCount}
              isLaunching={isLaunching}
              onLaunch={handleLaunchCampaign}
              onBack={() => setWizardStep(2)}
              onEditStep={(stepNum) => setWizardStep(stepNum)}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
