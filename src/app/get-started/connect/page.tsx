"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Laptop,
  Plus,
  Send,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { ProfileCard } from "@/components/onboarding/ProfileCard";
import { LinkedInAccount, TeammateInvite } from "@/types/onboarding";

export default function ConnectStepPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectedAccounts, setConnectedAccounts] = useState<LinkedInAccount[]>([]);
  const [invitedTeammates, setInvitedTeammates] = useState<TeammateInvite[]>([]);
  const [teammateEmail, setTeammateEmail] = useState<string>("");

  // Direct Extractor State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [headless, setHeadless] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Extracted cookies result state
  const [extractedData, setExtractedData] = useState<{
    li_at: string;
    jsessionId: string;
    profileName?: string;
    headline?: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const state = await fetchOnboardingState();
        if (state.step2.data?.connectedAccounts?.length) {
          setConnectedAccounts(state.step2.data.connectedAccounts);
        }
        if (state.step2.data?.invitedTeammates?.length) {
          setInvitedTeammates(state.step2.data.invitedTeammates);
        }
      } catch {
        // fallback
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleExtractAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter both your LinkedIn email and password.");
      return;
    }

    setIsExtracting(true);
    setProgressStage("Launching real browser session...");

    try {
      const stageTimer1 = setTimeout(() => setProgressStage("Loading LinkedIn login & submitting credentials..."), 3000);
      const stageTimer2 = setTimeout(() => setProgressStage("Bypassing bot defense & capturing li_at and JSESSIONID..."), 7000);
      const stageTimer3 = setTimeout(() => setProgressStage("Verifying session with LinkedIn Voyager API..."), 12000);

      const response = await fetch("/api/linkedin/extract-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          headless,
          saveAccount: true, // Automatically link connection in DB
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract LinkedIn session.");
      }

      const memberName = [data.profile?.firstName, data.profile?.lastName].filter(Boolean).join(" ") || email.trim();
      const headline = data.profile?.headline || "LinkedIn Profile";

      const newAccount: LinkedInAccount = {
        id: data.connectionId || `li_${Date.now()}`,
        name: memberName,
        headline,
        status: "Active",
        connectedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      const updated = [newAccount, ...connectedAccounts.filter((a) => a.id !== newAccount.id)];
      setConnectedAccounts(updated);

      await saveOnboardingStep("step2", "completed", {
        connectedAccounts: updated,
        invitedTeammates,
      });

      setExtractedData({
        li_at: data.li_at,
        jsessionId: data.jsessionId,
        profileName: memberName,
        headline,
      });

      setShowAddForm(false);
      setPassword("");
      toast.success(`${memberName} connected successfully with li_at & JSESSIONID!`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to extract cookies.";
      toast.error(errorMsg);
    } finally {
      setIsExtracting(false);
      setProgressStage("");
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDisconnect = async (id: string) => {
    const response = await fetch("/api/linkedin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "disconnect" }),
    });
    if (!response.ok) {
      toast.error("Could not disconnect LinkedIn account");
      return;
    }
    const updated = connectedAccounts.map((acc) =>
      acc.id === id ? { ...acc, status: "Disconnected" as const } : acc
    );
    setConnectedAccounts(updated);
    await saveOnboardingStep("step2", "completed", {
      connectedAccounts: updated,
      invitedTeammates,
    });
    toast.success("LinkedIn account disconnected successfully.");
  };

  const handleConnect = async (id: string) => {
    const response = await fetch("/api/linkedin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "connect" }),
    });
    if (!response.ok) {
      toast.error("Could not activate LinkedIn account");
      return;
    }
    const updated = connectedAccounts.map((acc) =>
      acc.id === id
        ? { ...acc, status: "Active" as const }
        : { ...acc, status: "Disconnected" as const }
    );
    setConnectedAccounts(updated);
    await saveOnboardingStep("step2", "completed", {
      connectedAccounts: updated,
      invitedTeammates,
    });
    toast.success("LinkedIn account activated.");
  };

  const handleRemove = async (id: string) => {
    const response = await fetch(`/api/linkedin/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete LinkedIn account");
      return;
    }
    const updated = connectedAccounts.filter((acc) => acc.id !== id);
    setConnectedAccounts(updated);
    await saveOnboardingStep("step2", updated.length > 0 ? "completed" : "in_progress", {
      connectedAccounts: updated,
      invitedTeammates,
    });
    toast.success("LinkedIn account removed successfully.");
  };

  const handleInviteTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teammateEmail.trim()) return;

    const newInvite: TeammateInvite = {
      email: teammateEmail.trim().toLowerCase(),
      invitedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status: "Pending",
    };

    const updated = [...invitedTeammates, newInvite];
    setInvitedTeammates(updated);
    setTeammateEmail("");

    await saveOnboardingStep("step2", "completed", {
      connectedAccounts,
      invitedTeammates: updated,
    });

    toast.success(`Invitation sent to ${newInvite.email}`);
  };

  const handleSkip = async () => {
    await saveOnboardingStep("step2", "skipped");
    router.push("/get-started/leads");
  };

  const handleContinue = async () => {
    await saveOnboardingStep("step2", "completed", {
      connectedAccounts,
      invitedTeammates,
    });
    router.push("/get-started/leads");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          href="/get-started"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Get Started</span>
        </Link>

        {/* Card Container */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                <span>Step 2 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <LinkedInIcon className="w-5 h-5" />
                </span>
                Direct LinkedIn Session Connection
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Authenticate with your LinkedIn credentials to automatically extract active <code className="text-blue-600 dark:text-blue-400 font-mono">li_at</code> & <code className="text-blue-600 dark:text-blue-400 font-mono">JSESSIONID</code> cookies.
              </p>
            </div>

            {connectedAccounts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {connectedAccounts.length} Connected
              </span>
            )}
          </div>

          {/* Connected Profiles List (If any exist) */}
          {connectedAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Active Senders
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showAddForm ? "Hide Form" : "Connect Another Account"}</span>
                </button>
              </div>

              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <ProfileCard
                    key={account.id}
                    account={account}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onReconnect={() => setShowAddForm(true)}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Extracted Cookies Card (Shown immediately upon successful extraction) */}
          <AnimatePresence>
            {extractedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cookies Extracted & Verified for {extractedData.profileName}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    200 OK Active
                  </span>
                </div>

                {/* li_at copy box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">li_at</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(extractedData.li_at, "li_at")}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === "li_at" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "li_at" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 break-all select-all">
                    {extractedData.li_at}
                  </div>
                </div>

                {/* JSESSIONID copy box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">JSESSIONID</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(extractedData.jsessionId, "JSESSIONID")}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === "JSESSIONID" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "JSESSIONID" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 break-all select-all">
                    {extractedData.jsessionId}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct Extractor Form (Shown when 0 accounts or when user clicks Connect Another) */}
          {(connectedAccounts.length === 0 || showAddForm) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800/80 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Sign In with LinkedIn
                </h3>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Real Playwright Engine
                </span>
              </div>

              <form onSubmit={handleExtractAndConnect} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    LinkedIn Email / Phone
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="your_linkedin_email@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isExtracting}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    LinkedIn Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isExtracting}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Interactive Window Option */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!headless}
                    onChange={(e) => setHeadless(!e.target.checked)}
                    disabled={isExtracting}
                    className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500/30"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-blue-500" />
                      Interactive Window (Recommended)
                    </span>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      Opens an Edge browser window so you can solve any 2FA email code or CAPTCHA puzzle if requested by LinkedIn.
                    </p>
                  </div>
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isExtracting}
                  className="w-full py-3 px-4 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Extracting Session...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-white" />
                      <span>Extract & Connect LinkedIn Profile</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-90" />
                    </>
                  )}
                </button>
              </form>

              {/* Realtime progress tracker */}
              {isExtracting && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-300 flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  <span>{progressStage || "Processing..."}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Safety First Guarantee Banner */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Zero Password Storage Guarantee
              </h5>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Your password is held strictly in memory by the local browser session to authenticate and generate your session cookie, and is discarded immediately. All extracted session tokens are encrypted using AES-256-GCM.
              </p>
            </div>
          </div>

          {/* Teammates Section */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50/50 dark:bg-neutral-950/30 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Invite Teammates
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                A profile is added only when its owner signs in and agrees.
              </p>
            </div>

            <form onSubmit={handleInviteTeammate} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={teammateEmail}
                  onChange={(e) => setTeammateEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-xs outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-neutral-400" />
                <span>Invite Teammate</span>
              </button>
            </form>

            {invitedTeammates.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-500 block">
                  Pending Invitations
                </span>
                <div className="space-y-1.5">
                  {invitedTeammates.map((inv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800"
                    >
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {inv.email}
                      </span>
                      <span className="text-[11px] text-amber-600 font-medium">
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
            >
              Skip this step
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Continue to Leads</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
