"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Plus,
  Send,
  Cookie,
  KeyRound,
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

  // Connect Mode: Auto (Playwright) vs Manual (li_at)
  const [connectMode, setConnectMode] = useState<"auto" | "manual">("auto");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [liAt, setLiAt] = useState("");
  const [jsessionId, setJsessionId] = useState("");

  const [isConnecting, setIsConnecting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

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

  const handleConnectProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);

    try {
      let payload: Record<string, unknown> = {};

      if (connectMode === "auto") {
        if (!email.trim() || !password) {
          toast.error("Please enter your LinkedIn email and password.");
          setIsConnecting(false);
          return;
        }
        setProgressMsg("Connecting to LinkedIn...");
        payload = {
          method: "playwright",
          email: email.trim(),
          password,
        };
      } else {
        if (!liAt.trim()) {
          toast.error("Please enter your li_at session cookie.");
          setIsConnecting(false);
          return;
        }
        setProgressMsg("Verifying session cookie with LinkedIn...");
        payload = {
          method: "manual",
          li_at: liAt.trim(),
          jsessionId: jsessionId.trim(),
        };
      }

      const response = await fetch("/api/linkedin/extract-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to authenticate LinkedIn account.");
      }

      const memberName = data.profile?.name || data.profile?.firstName || email.trim() || "LinkedIn Member";
      const headline = data.profile?.headline || "LinkedIn Member";

      const newAccount: LinkedInAccount = {
        id: data.connectionId || `li_${Date.now()}`,
        name: memberName,
        headline,
        status: "Active",
        connectedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };

      const updated = [newAccount, ...connectedAccounts.filter((a) => a.id !== newAccount.id)];
      setConnectedAccounts(updated);

      await saveOnboardingStep("step2", "completed", {
        connectedAccounts: updated,
        invitedTeammates,
      });

      setEmail("");
      setPassword("");
      setLiAt("");
      setJsessionId("");
      setShowAddForm(false);
      toast.success(`${memberName} connected successfully!`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Authentication error.";
      toast.error(errorMsg);
    } finally {
      setIsConnecting(false);
      setProgressMsg("");
    }
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
    toast.success("LinkedIn account disconnected.");
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
    const response = await fetch(`/api/linkedin/accounts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not remove LinkedIn account");
      return;
    }
    const updated = connectedAccounts.filter((acc) => acc.id !== id);
    setConnectedAccounts(updated);
    await saveOnboardingStep("step2", updated.length > 0 ? "completed" : "in_progress", {
      connectedAccounts: updated,
      invitedTeammates,
    });
    toast.success("LinkedIn account removed.");
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
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Back navigation */}
        <Link
          href="/get-started"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Get Started</span>
        </Link>

        {/* Main Card */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                <span>Step 2 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <LinkedInIcon className="w-5 h-5" />
                </span>
                Connect LinkedIn Profile
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Link your active profile to start outreach campaigns and automated messaging.
              </p>
            </div>

            {connectedAccounts.length > 0 && (
              <span className="inline-flex items-center gap-1 self-start sm:self-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {connectedAccounts.length} Connected
              </span>
            )}
          </div>

          {/* Connected Profiles List */}
          {connectedAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Active Senders
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showAddForm ? "Hide Form" : "Connect Another Account"}</span>
                </button>
              </div>

              <div className="space-y-2.5">
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

          {/* Connection Form */}
          {(connectedAccounts.length === 0 || showAddForm) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-1"
            >
              {/* Mode Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setConnectMode("auto")}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    connectMode === "auto"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Automatic Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConnectMode("manual")}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    connectMode === "manual"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <Cookie className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Paste Cookies</span>
                </button>
              </div>

              <form onSubmit={handleConnectProfile} className="space-y-3.5">
                {connectMode === "auto" ? (
                  <>
                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        LinkedIn Email / Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          placeholder="your_linkedin_email@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isConnecting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        LinkedIn Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isConnecting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-10 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* li_at Cookie */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          li_at Cookie <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-neutral-400">Required</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="AQEDAQ..."
                        value={liAt}
                        onChange={(e) => setLiAt(e.target.value)}
                        disabled={isConnecting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* JSESSIONID Cookie */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          JSESSIONID Cookie
                        </label>
                        <span className="text-[10px] text-neutral-400">Optional</span>
                      </div>
                      <input
                        type="text"
                        placeholder='ajax:123456789... (or "ajax:...")'
                        value={jsessionId}
                        onChange={(e) => setJsessionId(e.target.value)}
                        disabled={isConnecting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800/60 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      💡 <strong>How to find it:</strong> On linkedin.com, press <kbd className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">F12</kbd> $\rightarrow$ <strong>Application</strong> $\rightarrow$ <strong>Cookies</strong> $\rightarrow$ copy the <code className="text-emerald-600 dark:text-emerald-400">li_at</code> value.
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{progressMsg || "Connecting Profile..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Connect LinkedIn Account</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-90" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Teammates Section */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 bg-neutral-50/50 dark:bg-neutral-950/30 space-y-3.5">
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Invite Teammates
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Profiles are added only when the owner signs in and agrees.
              </p>
            </div>

            <form onSubmit={handleInviteTeammate} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={teammateEmail}
                  onChange={(e) => setTeammateEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-neutral-400" />
                <span>Invite Teammate</span>
              </button>
            </form>

            {invitedTeammates.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 space-y-1.5">
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
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Skip this step
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-5 sm:px-6 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
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
