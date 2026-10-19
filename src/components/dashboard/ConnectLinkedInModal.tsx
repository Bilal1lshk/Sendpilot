"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Cookie,
  KeyRound,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { toast } from "sonner";

export interface ConnectedAccountData {
  id: string;
  name: string;
  headline: string;
  type: string;
  photo: string;
  status: "Active" | "Expired" | "Disconnected";
  connectedDate: string;
  usedToday: number;
  dailyCap: number;
  warmupStage: number;
}

interface ConnectLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (account: ConnectedAccountData) => void;
  defaultUserName?: string;
}

export function ConnectLinkedInModal({
  isOpen,
  onClose,
  onConnected,
  defaultUserName = "LinkedIn User",
}: ConnectLinkedInModalProps) {
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");

  // Auto method fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Two-Factor Authentication options: "otp" (One-time code) | "app" (LinkedIn app)
  const [twoFactorMethod, setTwoFactorMethod] = useState<"otp" | "app">("otp");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | undefined>(undefined);
  const [challengeMessage, setChallengeMessage] = useState("");
  const [proxyError, setProxyError] = useState<{
    code: string;
    stage: string;
    message: string;
    hint: string;
  } | null>(null);

  // Manual method fields
  const [liAt, setLiAt] = useState("");
  const [jsessionId, setJsessionId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [step, setStep] = useState<"form" | "two_factor" | "success">("form");
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);

  // Local runner URL override (persisted in localStorage)
  const [workerUrl, setWorkerUrl] = useState("");
  const [showRunnerConfig, setShowRunnerConfig] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sendpilot_worker_url");
      if (saved) setWorkerUrl(saved);
    } catch {}
  }, []);

  const handleWorkerUrlChange = (val: string) => {
    setWorkerUrl(val);
    try {
      if (val.trim()) {
        localStorage.setItem("sendpilot_worker_url", val.trim());
      } else {
        localStorage.removeItem("sendpilot_worker_url");
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setProgressMsg("");
      setStep("form");
      setPassword("");
      setVerificationCode("");
      setPendingChallengeToken(undefined);
      setChallengeMessage("");
      setProxyError(null);
      setFormError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === "auto") {
        if (!email.trim() || !password) {
          toast.error("Please enter both your LinkedIn email and password.");
          setIsSubmitting(false);
          return;
        }
        if (step === "two_factor" && twoFactorMethod === "otp" && !verificationCode.trim()) {
          toast.error("Please enter the one-time code sent by LinkedIn.");
          setIsSubmitting(false);
          return;
        }

        setProgressMsg(
          step === "two_factor"
            ? twoFactorMethod === "otp"
              ? "Verifying one-time code with LinkedIn..."
              : "Checking LinkedIn mobile app approval..."
            : twoFactorMethod === "app"
              ? "Signing in & waiting for LinkedIn app approval..."
              : "Connecting to LinkedIn..."
        );

        payload = {
          method: "playwright",
          email: email.trim(),
          password,
          twoFactorMethod,
          verificationCode: verificationCode.trim() || undefined,
          pendingChallengeToken,
          workerUrl: workerUrl.trim() || undefined,
        };
      } else {
        if (!liAt.trim()) {
          toast.error("Please enter your li_at session cookie.");
          setIsSubmitting(false);
          return;
        }
        setProgressMsg("Verifying session cookie with LinkedIn...");
        payload = {
          method: "manual",
          li_at: liAt.trim(),
          jsessionId: jsessionId.trim(),
        };
      }

      const res = await fetch("/api/linkedin/extract-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 202 || data?.requiresTwoFactor) {
        if (data?.twoFactorMethod === "app" || data?.twoFactorMethod === "otp") {
          setTwoFactorMethod(data.twoFactorMethod);
        }
        setPendingChallengeToken(data?.pendingChallengeToken);
        setChallengeMessage(
          data?.challengeMessage ||
            (twoFactorMethod === "app"
              ? "Approve the sign-in in the LinkedIn mobile app."
              : "LinkedIn sent a one-time code by SMS or email.")
        );
        setStep("two_factor");
        toast.info(
          twoFactorMethod === "app"
            ? "Check your LinkedIn mobile app to approve the sign-in."
            : "Enter the one-time verification code sent by LinkedIn."
        );
        return;
      }

      if (!res.ok || !data?.success) {
        if (data?.proxyError || data?.code) {
          const pErr = {
            code: data.code || data.proxyError?.code || "PROXY_ERROR",
            stage: data.stage || data.proxyError?.stage || "execution",
            message: data.proxyError?.message || data.error || "Residential proxy failed.",
            hint: data.hint || data.proxyError?.hint || "Check proxy settings in environment variables.",
          };
          setProxyError(pErr);
          toast.error(`Proxy Error [${pErr.code}]: ${pErr.hint}`);
          return;
        }
        throw new Error(data?.error || "Failed to authenticate LinkedIn account.");
      }

      const memberName = data.profile?.name || data.profile?.firstName || defaultUserName;
      const mapped: ConnectedAccountData = {
        id: data.connectionId || `li_${Date.now()}`,
        name: memberName,
        headline: data.profile?.headline || "LinkedIn Profile",
        type: "Sales Navigator",
        photo: "",
        status: "Active",
        connectedDate: new Date().toLocaleDateString(),
        usedToday: 0,
        dailyCap: 25,
        warmupStage: 1,
      };

      setConnectedAccount(mapped);
      setStep("success");
      onConnected(mapped);
      setEmail("");
      setPassword("");
      setVerificationCode("");
      setPendingChallengeToken(undefined);
      setLiAt("");
      setJsessionId("");
      toast.success(`${memberName} connected successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setProgressMsg("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg max-h-[min(90dvh,760px)] flex flex-col rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <LinkedInIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {step === "two_factor" ? "Two-Factor Verification" : "Connect LinkedIn"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {step === "two_factor"
                  ? "Complete LinkedIn's second factor check to finish connecting"
                  : "Link an active profile for outreach campaigns"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 pb-6 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] flex-1">
          {step === "form" ? (
            <div className="space-y-4">
              {/* Segmented Control / Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("auto")}
                  className={`py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === "auto"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Automatic Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === "manual"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <Cookie className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Paste Cookies</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {activeTab === "auto" ? (
                  <>
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        LinkedIn Email or Phone
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        LinkedIn Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60 pl-10 pr-10 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
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

                    {/* Second Factor (2FA) Preference */}
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                        If LinkedIn asks for a second factor
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("otp")}
                          disabled={isSubmitting}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "otp"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 hover:border-neutral-300 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>One-time code</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                            LinkedIn sends a code by SMS or email.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("app")}
                          disabled={isSubmitting}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "app"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 hover:border-neutral-300 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>LinkedIn app</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                            Approve the sign-in in the mobile app.
                          </p>
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {twoFactorMethod === "otp"
                          ? "With a one-time code, LinkedIn decides whether to send it by SMS or email."
                          : "LinkedIn will send a push notification to your signed-in mobile app for approval."}
                      </p>
                    </div>

                    {/* Local Runner URL Configuration */}
                    <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => setShowRunnerConfig(!showRunnerConfig)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center justify-between w-full py-1 font-medium transition-colors cursor-pointer"
                      >
                        <span>⚙️ Local Runner Tunnel URL</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {workerUrl ? "Configured ✓" : "Configure (Optional)"}
                        </span>
                      </button>

                      {showRunnerConfig && (
                        <div className="mt-2 p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                          <label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 block">
                            Active Tunnel URL (from terminal)
                          </label>
                          <input
                            type="url"
                            placeholder="https://07d1c59b...serveousercontent.com"
                            value={workerUrl}
                            onChange={(e) => handleWorkerUrlChange(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500"
                          />
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                            Paste the tunnel URL from your <code className="text-emerald-600 font-mono">npm run worker</code> terminal. Saved in your browser so you don&apos;t have to update Vercel environment variables.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* li_at cookie */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          li_at Cookie
                        </label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Required
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="AQEDAQ..."
                        value={liAt}
                        onChange={(e) => setLiAt(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60 px-3.5 py-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* JSESSIONID cookie */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          JSESSIONID Cookie
                        </label>
                        <span className="text-[10px] text-neutral-400">Optional</span>
                      </div>
                      <input
                        type="text"
                        placeholder="ajax:123456789... (optional)"
                        value={jsessionId}
                        onChange={(e) => setJsessionId(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60 px-3.5 py-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/70 dark:border-neutral-800/60 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                        Tip:
                      </span>
                      <span>
                        On LinkedIn, press{" "}
                        <kbd className="px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-neutral-800 font-mono text-[10px] text-neutral-800 dark:text-neutral-200">
                          F12
                        </kbd>{" "}
                        → <strong>Application</strong> → <strong>Cookies</strong> → copy the{" "}
                        <code className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          li_at
                        </code>{" "}
                        value.
                      </span>
                    </div>
                  </>
                )}

                {proxyError && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-[10px] uppercase">
                        {proxyError.code}
                      </span>
                      <span>Proxy Error (Stage: {proxyError.stage})</span>
                    </div>
                    <p className="leading-snug">{proxyError.message}</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      💡 Hint: {proxyError.hint}
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-900 dark:text-red-200 text-xs space-y-2">
                    <p className="leading-snug">{formError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setStep("two_factor");
                        setTwoFactorMethod("otp");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Already received a LinkedIn code? Enter OTP now →</span>
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{progressMsg || "Connecting..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Connect LinkedIn Account</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-90" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("two_factor");
                      setTwoFactorMethod("otp");
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Already received a verification code? Click here to enter OTP
                  </button>
                </div>
              </form>
            </div>
          ) : step === "two_factor" ? (
            /* Two-Factor Challenge Step */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Switch between One-time code and LinkedIn app */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Choose second factor method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTwoFactorMethod("otp")}
                    disabled={isSubmitting}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      twoFactorMethod === "otp"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>One-time code</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                      LinkedIn sends a code by SMS or email.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTwoFactorMethod("app")}
                    disabled={isSubmitting}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      twoFactorMethod === "app"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                        : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>LinkedIn app</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                      Approve the sign-in in the mobile app.
                    </p>
                  </button>
                </div>
              </div>

              {challengeMessage && (
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200">
                  {challengeMessage}
                </div>
              )}

              {(!email || !password) && (
                <div className="space-y-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800">
                  <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    LinkedIn Account Credentials (needed to resume session)
                  </p>
                  <input
                    type="email"
                    required
                    placeholder="LinkedIn Email or Phone"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="password"
                    required
                    placeholder="LinkedIn Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {twoFactorMethod === "otp" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    One-Time Verification Code (SMS or Email)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    required
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60 px-3.5 py-2.5 text-sm font-mono tracking-widest text-center text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    With a one-time code, LinkedIn decides whether to send it by SMS or email.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Approve in your LinkedIn mobile app
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Open the LinkedIn app on your phone, tap <strong>Yes</strong> on the sign-in
                    notification, then click the button below to complete connection.
                  </p>
                </div>
              )}

              {/* Local Runner URL Configuration */}
              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setShowRunnerConfig(!showRunnerConfig)}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center justify-between w-full py-1 font-medium transition-colors cursor-pointer"
                >
                  <span>⚙️ Local Runner Tunnel URL</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {workerUrl ? "Configured ✓" : "Configure (Optional)"}
                  </span>
                </button>

                {showRunnerConfig && (
                  <div className="mt-2 p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 block">
                      Active Tunnel URL (from terminal)
                    </label>
                    <input
                      type="url"
                      placeholder="https://07d1c59b...serveousercontent.com"
                      value={workerUrl}
                      onChange={(e) => handleWorkerUrlChange(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                      Paste the tunnel URL from your <code className="text-emerald-600 font-mono">npm run worker</code> terminal. Saved in your browser so you don&apos;t have to update Vercel environment variables.
                    </p>
                  </div>
                )}
              </div>

              {proxyError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-[10px] uppercase">
                      {proxyError.code}
                    </span>
                    <span>Proxy Error (Stage: {proxyError.stage})</span>
                  </div>
                  <p className="leading-snug">{proxyError.message}</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    💡 Hint: {proxyError.hint}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep("form");
                    setVerificationCode("");
                  }}
                  className="py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{progressMsg || "Verifying..."}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {twoFactorMethod === "otp"
                          ? "Verify One-Time Code"
                          : "I Approved in App — Continue"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-90" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success Screen */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  LinkedIn Connected!
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {connectedAccount?.name}
                  </span>{" "}
                  is now connected and verified for outreach.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
