"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Building,
  ShieldAlert,
  Check,
  AlertTriangle,
  X,
  Loader2,
  UserPlus,
  Mail,
  Briefcase,
  Globe,
  Clock,
  Trash2,
  Pencil,
  ShieldCheck,
  Users,
  Database,
  Send,
} from "lucide-react";
import { pageVariants, cardVariants, modalVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";
import { toast } from "sonner";

type MemberRole = "Owner" | "Admin" | "Member" | "Viewer";

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  jobTitle: string;
  role: MemberRole;
  status: "Active" | "Joined" | "Pending";
  isOwner: boolean;
  isCurrentUser: boolean;
  invitedAt: string;
  connectedAccountsCount: number;
  totalAccountsCount: number;
}

interface MemberProfile {
  fullName: string;
  email: string;
  image: string | null;
  jobTitle: string;
  companyName: string;
  companyWebsite: string;
  offer: string;
}

interface WorkspaceStats {
  totalLeads: number;
  totalCampaigns: number;
  connectedAccounts: number;
  activeAccounts: number;
}

const TIMEZONE_OPTIONS = [
  "America/New_York (Eastern Time - US)",
  "America/Chicago (Central Time - US)",
  "America/Denver (Mountain Time - US)",
  "America/Los_Angeles (Pacific Time - US)",
  "Europe/London (GMT/BST)",
  "Europe/Berlin (Central European Time)",
  "Asia/Dubai (Gulf Standard Time)",
  "Asia/Karachi (Pakistan Standard Time)",
  "Asia/Singapore (Singapore Standard Time)",
  "Asia/Tokyo (Japan Standard Time)",
  "Australia/Sydney (Australian Eastern Time)",
];

const WORKING_HOURS_OPTIONS = [
  "9:00 AM - 5:00 PM (Monday - Friday)",
  "8:00 AM - 4:00 PM (Monday - Friday)",
  "10:00 AM - 6:00 PM (Monday - Friday)",
  "9:00 AM - 6:00 PM (Monday - Saturday)",
  "Flexible / Custom Hours",
];

export default function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "team" | "danger">("general");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const [dangerModalOpen, setDangerModalOpen] = useState<boolean>(false);

  // Invite / Edit Member modal states
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteJobTitle, setInviteJobTitle] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Member" | "Viewer">("Member");
  const [isInviting, setIsInviting] = useState<boolean>(false);

  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [editMemberName, setEditMemberName] = useState<string>("");
  const [editMemberJobTitle, setEditMemberJobTitle] = useState<string>("");
  const [editMemberRole, setEditMemberRole] = useState<"Admin" | "Member" | "Viewer">("Member");
  const [editMemberStatus, setEditMemberStatus] = useState<"Joined" | "Pending">("Joined");
  const [isUpdatingMember, setIsUpdatingMember] = useState<boolean>(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  // Workspace & Profile states synced with MongoDB
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [defaultDailyCap, setDefaultDailyCap] = useState<number>(20);
  const [timezone, setTimezone] = useState<string>("America/New_York (Eastern Time - US)");
  const [workingHours, setWorkingHours] = useState<string>("9:00 AM - 5:00 PM (Monday - Friday)");
  const [profile, setProfile] = useState<MemberProfile>({
    fullName: "",
    email: "",
    image: null,
    jobTitle: "",
    companyName: "",
    companyWebsite: "",
    offer: "",
  });
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({
    totalLeads: 0,
    totalCampaigns: 0,
    connectedAccounts: 0,
    activeAccounts: 0,
  });

  const applySettingsPayload = useCallback((settings: any) => {
    if (!settings) return;
    setWorkspaceName(settings.workspaceName || "My Workspace");
    setDefaultDailyCap(Number(settings.defaultDailyCap ?? 20));
    setTimezone(settings.timezone || "America/New_York (Eastern Time - US)");
    setWorkingHours(settings.workingHours || "9:00 AM - 5:00 PM (Monday - Friday)");
    if (settings.profile) {
      setProfile({
        fullName: settings.profile.fullName || "",
        email: settings.profile.email || "",
        image: settings.profile.image || null,
        jobTitle: settings.profile.jobTitle || "",
        companyName: settings.profile.companyName || "",
        companyWebsite: settings.profile.companyWebsite || "",
        offer: settings.profile.offer || "",
      });
    }
    if (Array.isArray(settings.members)) {
      setMembers(settings.members);
    }
    if (settings.stats) {
      setStats({
        totalLeads: settings.stats.totalLeads ?? 0,
        totalCampaigns: settings.stats.totalCampaigns ?? 0,
        connectedAccounts: settings.stats.connectedAccounts ?? 0,
        activeAccounts: settings.stats.activeAccounts ?? 0,
      });
    }
    if (typeof window !== "undefined" && settings.workspaceName) {
      localStorage.setItem("sendpilot_current_workspace", settings.workspaceName);
      window.dispatchEvent(
        new CustomEvent("sendpilot:workspace-updated", {
          detail: { name: settings.workspaceName },
        })
      );
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/settings", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load workspace settings from database.");
        return;
      }
      const data = await res.json();
      if (data?.success && data.settings) {
        applySettingsPayload(data.settings);
      }
    } catch {
      toast.error("Error connecting to server.");
    } finally {
      setIsLoading(false);
    }
  }, [applySettingsPayload]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceName: workspaceName.trim(),
          defaultDailyCap,
          timezone,
          workingHours,
          profile: {
            fullName: profile.fullName.trim(),
            jobTitle: profile.jobTitle.trim(),
            companyName: profile.companyName.trim(),
            companyWebsite: profile.companyWebsite.trim(),
            offer: profile.offer.trim(),
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Failed to save settings.");
        return;
      }

      applySettingsPayload(data.settings);
      setSaveStatus(true);
      toast.success("Workspace and member settings synced with database.");
      setTimeout(() => setSaveStatus(false), 2500);
    } catch {
      toast.error("Error saving workspace settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          jobTitle: inviteJobTitle.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Could not invite member.");
        return;
      }

      applySettingsPayload(data.settings);
      toast.success(`Added ${inviteEmail.trim().toLowerCase()} to workspace.`);
      setInviteEmail("");
      setInviteName("");
      setInviteJobTitle("");
      setInviteRole("Member");
      setInviteModalOpen(false);
    } catch {
      toast.error("Error inviting workspace member.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (member: WorkspaceMember, newRole: "Admin" | "Member" | "Viewer") => {
    if (member.isOwner) return;
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email,
          role: newRole,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Failed to update member role.");
        return;
      }
      applySettingsPayload(data.settings);
      toast.success(`Updated ${member.name}'s role to ${newRole}.`);
    } catch {
      toast.error("Error updating member role.");
    }
  };

  const openEditMemberModal = (member: WorkspaceMember) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberJobTitle(member.jobTitle || "");
    setEditMemberRole(
      member.role === "Admin" || member.role === "Viewer" ? member.role : "Member"
    );
    setEditMemberStatus(member.status === "Pending" ? "Pending" : "Joined");
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setIsUpdatingMember(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editingMember.email,
          isOwner: editingMember.isOwner,
          name: editMemberName.trim(),
          jobTitle: editMemberJobTitle.trim(),
          role: editingMember.isOwner ? undefined : editMemberRole,
          status: editingMember.isOwner ? undefined : editMemberStatus,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Failed to update member.");
        return;
      }

      applySettingsPayload(data.settings);
      toast.success(`Updated ${editMemberName.trim() || editingMember.name}.`);
      setEditingMember(null);
    } catch {
      toast.error("Error updating member details.");
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (member.isOwner) return;
    setRemovingEmail(member.email);
    try {
      const res = await fetch(
        `/api/workspace/settings?email=${encodeURIComponent(member.email)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Failed to remove member.");
        return;
      }
      applySettingsPayload(data.settings);
      toast.success(`Removed ${member.name} from workspace.`);
    } catch {
      toast.error("Error removing member.");
    } finally {
      setRemovingEmail(null);
    }
  };

  const TABS = [
    { id: "general", label: "General & Workspace" },
    { id: "team", label: `Members & Permissions (${members.length})` },
    { id: "danger", label: "Data & Danger Zone" },
  ];

  const timezoneOptions = TIMEZONE_OPTIONS.includes(timezone)
    ? TIMEZONE_OPTIONS
    : [timezone, ...TIMEZONE_OPTIONS].filter(Boolean);

  const workingHoursOptions = WORKING_HOURS_OPTIONS.includes(workingHours)
    ? WORKING_HOURS_OPTIONS
    : [workingHours, ...WORKING_HOURS_OPTIONS].filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-palm-leaf-600" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <motion.div
        variants={cardVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Workspace settings
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage sending limits, member profile, team permissions, and data controls.
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
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] disabled:opacity-60 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isSaving ? "Saving..." : "Save changes"}</span>
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
              onClick={() => setActiveTab(tab.id as "general" | "team" | "danger")}
              className={`relative pb-3 font-medium transition-colors cursor-pointer ${
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

      {/* TAB 1: General & Member Profile Form */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Workspace Configuration Card */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5"
          >
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Workspace configuration
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Core workspace identity, daily outreach pacing, and operating schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Workspace name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. SendPilot HQ"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Default daily requests cap (per account)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={defaultDailyCap}
                  onChange={(e) => setDefaultDailyCap(Number(e.target.value))}
                  className="w-32 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  We recommend 15 to 25 invites to preserve account reputation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Operating timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Working hours (pacing window)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <select
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                  >
                    {workingHoursOptions.map((wh) => (
                      <option key={wh} value={wh}>
                        {wh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Member Profile Card (Synced with User + Workspace.step1) */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Your member profile
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Synced directly with your user account and outreach personalization variables.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-palm-leaf-50 dark:bg-palm-leaf-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-300 border border-palm-leaf-200/60 dark:border-palm-leaf-800/40">
                <ShieldCheck className="h-3 w-3" />
                Workspace Owner
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Account email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 pl-8 pr-3 py-2 text-xs cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Job title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={profile.jobTitle}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, jobTitle: e.target.value }))
                    }
                    placeholder="e.g. Head of Growth"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Company name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={profile.companyName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    placeholder="e.g. SendPilot"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Company website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="url"
                    value={profile.companyWebsite}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, companyWebsite: e.target.value }))
                    }
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Short &quot;What we offer&quot; value proposition
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  {profile.offer.length}/160
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={160}
                value={profile.offer}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, offer: e.target.value }))
                }
                placeholder="We help B2B teams turn LinkedIn connections into qualified pipeline."
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 p-3 text-xs focus:outline-none focus:border-palm-leaf-500"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB 2: Team Members (Synced with Database) */}
      {activeTab === "team" && (
        <div className="space-y-5">
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Workspace members
                  </h3>
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Teammates can link their own LinkedIn profiles, collaborate on campaigns, and share lead lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite member</span>
              </button>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {members.map((member) => {
                const initials = (member.name || member.email || "U")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("");

                return (
                  <div
                    key={member.id || member.email}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-800 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-palm-leaf-300/40">
                        {member.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.image}
                            alt={member.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          initials || "U"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {member.name}
                            {member.isCurrentUser ? " (You)" : ""}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              member.status === "Active" || member.status === "Joined"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
                            }`}
                          >
                            {member.status}
                          </span>
                          {member.connectedAccountsCount > 0 && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                              {member.connectedAccountsCount} LinkedIn active
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span className="truncate">{member.email}</span>
                          {member.jobTitle && (
                            <>
                              <span>•</span>
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {member.jobTitle}
                              </span>
                            </>
                          )}
                          {member.invitedAt && (
                            <>
                              <span>•</span>
                              <span>
                                {member.isOwner
                                  ? `Joined ${member.invitedAt}`
                                  : `Invited ${member.invitedAt}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {member.isOwner ? (
                        <span className="text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-2.5 py-1 rounded-lg font-semibold">
                          Workspace Owner
                        </span>
                      ) : (
                        <select
                          aria-label={`Role for ${member.name}`}
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member,
                              e.target.value as "Admin" | "Member" | "Viewer"
                            )
                          }
                          className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-palm-leaf-500"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Member">Member</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditMemberModal(member)}
                        title="Edit member details"
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {!member.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingEmail === member.email}
                          title="Remove member from workspace"
                          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900/60 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {removingEmail === member.email ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Role permissions summary */}
          <motion.div
            variants={cardVariants}
            className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
          >
            <div className="space-y-1">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">Admin</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Full access to campaigns, lead imports, sender accounts, and member management.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">Member</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Can connect their own LinkedIn account, run assigned campaigns, and manage leads.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">Viewer</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Read-only access to campaign analytics, lead pipeline, and outreach performance.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB 3: Calm Danger Zone with Real DB Metrics & One-Sentence Confirm Dialog */}
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
              Inspect live workspace storage and permanently revoke or wipe workspace leads.
            </p>
          </div>

          {/* Live database snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 p-3.5 flex items-center gap-3">
              <Database className="h-4 w-4 text-palm-leaf-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.totalLeads}
                </p>
                <p className="text-[11px] text-neutral-400">Leads in database</p>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 p-3.5 flex items-center gap-3">
              <Send className="h-4 w-4 text-palm-leaf-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.totalCampaigns}
                </p>
                <p className="text-[11px] text-neutral-400">Campaigns configured</p>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 p-3.5 flex items-center gap-3">
              <Users className="h-4 w-4 text-palm-leaf-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {members.length}
                </p>
                <p className="text-[11px] text-neutral-400">Workspace members</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Wipe all imported leads ({stats.totalLeads})
              </p>
              <p className="text-[11px] text-neutral-400">
                Removes all prospects and history from this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDangerModalOpen(true)}
              className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
            >
              Wipe leads
            </button>
          </div>
        </motion.div>
      )}

      {/* Invite Member Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-palm-leaf-600" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Invite workspace member
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Email address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Jordan Lee"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Job title
                    </label>
                    <input
                      type="text"
                      value={inviteJobTitle}
                      onChange={(e) => setInviteJobTitle(e.target.value)}
                      placeholder="e.g. Account Executive"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Workspace role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "Admin" | "Member" | "Viewer")
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                  >
                    <option value="Admin">Admin — Full workspace & campaign access</option>
                    <option value="Member">Member — Manage own accounts, campaigns & leads</option>
                    <option value="Viewer">Viewer — Read-only reporting & lead access</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-50 text-white px-3.5 py-1.5 font-semibold cursor-pointer"
                  >
                    {isInviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{isInviting ? "Adding..." : "Send invitation"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-palm-leaf-600" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Edit member details
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateMember} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingMember.email}
                    disabled
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500 px-3 py-2 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Job title
                  </label>
                  <input
                    type="text"
                    value={editMemberJobTitle}
                    onChange={(e) => setEditMemberJobTitle(e.target.value)}
                    placeholder="e.g. Sales Director"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                  />
                </div>

                {!editingMember.isOwner && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Role
                      </label>
                      <select
                        value={editMemberRole}
                        onChange={(e) =>
                          setEditMemberRole(
                            e.target.value as "Admin" | "Member" | "Viewer"
                          )
                        }
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Invitation status
                      </label>
                      <select
                        value={editMemberStatus}
                        onChange={(e) =>
                          setEditMemberStatus(e.target.value as "Joined" | "Pending")
                        }
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 focus:outline-none focus:border-palm-leaf-500"
                      >
                        <option value="Joined">Joined</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingMember}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 disabled:opacity-50 text-white px-3.5 py-1.5 font-semibold cursor-pointer"
                  >
                    {isUpdatingMember && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save member</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                This will permanently delete all leads and their associated campaign history from your workspace database.
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
                  onClick={async () => {
                    setDangerModalOpen(false);
                    try {
                      const res = await fetch("/api/leads", { method: "DELETE" });
                      if (res.ok) {
                        setStats((prev) => ({ ...prev, totalLeads: 0 }));
                        toast.success("Lead database wiped successfully.");
                      } else {
                        toast.error("Failed to wipe leads.");
                      }
                    } catch {
                      toast.error("Error connecting to server.");
                    }
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 font-semibold cursor-pointer"
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
