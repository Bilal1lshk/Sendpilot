"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  ArrowRight,
  UserCheck,
  Cookie,
  KeyRound,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { toast } from "sonner";
import { pageVariants, cardVariants } from "@/lib/motion";

export default function DirectLoginCookieExtractorPage() {
  const router = useRouter();

  // Mode: Auto (Playwright) vs Manual (li_at)
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Two-Factor Authentication options: "otp" (One-time code) | "app" (LinkedIn app)
  const [twoFactorMethod, setTwoFactorMethod] = useState<"otp" | "app">("otp");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | undefined>(undefined);
  const [challengeMessage, setChallengeMessage] = useState("");
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);

  const [liAt, setLiAt] = useState("");
  const [jsessionId, setJsessionId] = useState("");

  // Execution state
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");

  // Result state
  const [result, setResult] = useState<{
    profile?: {
      name?: string;
      firstName?: string;
      lastName?: string;
      headline?: string;
    };
    saved?: boolean;
    connectionId?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === "auto") {
        if (!email.trim() || !password) {
          toast.error("Please enter both your LinkedIn email and password.");
          setLoading(false);
          return;
        }
        if (awaitingTwoFactor && twoFactorMethod === "otp" && !verificationCode.trim()) {
          toast.error("Please enter the one-time code sent by LinkedIn.");
          setLoading(false);
          return;
        }

        setProgressStage(
          awaitingTwoFactor
            ? twoFactorMethod === "otp"
              ? "Verifying one-time code with LinkedIn..."
              : "Checking LinkedIn mobile app approval..."
            : twoFactorMethod === "app"
              ? "Signing in & waiting for LinkedIn app approval..."
              : "Authenticating with LinkedIn in the background..."
        );

        payload = {
          method: "playwright",
          email: email.trim(),
          password,
          twoFactorMethod,
          verificationCode: verificationCode.trim() || undefined,
          pendingChallengeToken,
        };
      } else {
        if (!liAt.trim()) {
          toast.error("Please enter your li_at session cookie.");
          setLoading(false);
          return;
        }
        setProgressStage("Verifying session cookie with LinkedIn...");
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

      if (response.status === 202 || data?.requiresTwoFactor) {
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
        setAwaitingTwoFactor(true);
        toast.info(
          twoFactorMethod === "app"
            ? "Check your LinkedIn mobile app to approve the sign-in."
            : "Enter the one-time verification code sent by LinkedIn."
        );
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to authenticate LinkedIn account.");
      }

      setResult({
        profile: data.profile,
        saved: data.saved,
        connectionId: data.connectionId,
      });

      setPassword("");
      setVerificationCode("");
      setPendingChallengeToken(undefined);
      setAwaitingTwoFactor(false);
      setLiAt("");
      setJsessionId("");
      toast.success("LinkedIn profile connected and verified successfully!");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect account.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setProgressStage("");
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-xl mx-auto space-y-5 pb-12 px-4 sm:px-0"
    >
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to LinkedIn Accounts</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              <span>{awaitingTwoFactor ? "Two-Factor Verification" : "Direct Connection"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <LinkedInIcon className="w-5 h-5" />
              </span>
              {awaitingTwoFactor ? "Complete Second Factor" : "Connect LinkedIn Account"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {awaitingTwoFactor
                ? "Verify with a one-time code (SMS or email) or approve in the LinkedIn mobile app."
                : "Authenticate via automated background login or paste your active session cookie."}
            </p>
          </div>
        </div>

        {/* Form or Result */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" variants={cardVariants} className="space-y-4">
              {!awaitingTwoFactor && (
                /* Mode Tabs */
                <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("auto")}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "auto"
                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Automatic Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "manual"
                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                    }`}
                  >
                    <Cookie className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Paste Cookies</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {awaitingTwoFactor ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                        If LinkedIn asks for a second factor
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("otp")}
                          disabled={loading}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "otp"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>One-time code</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            LinkedIn sends a code by SMS or email.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("app")}
                          disabled={loading}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "app"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>LinkedIn app</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
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

                    {twoFactorMethod === "otp" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          One-Time Verification Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          autoFocus
                          placeholder="Enter 6-digit code (e.g. 123456)"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={loading}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-2.5 text-sm font-mono tracking-widest text-center text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          With a one-time code, LinkedIn decides whether to send it by SMS or email.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Approve the sign-in in the mobile app
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          Open the LinkedIn app on your phone, tap <strong>Yes</strong> on the
                          notification, then click the button below to complete connection.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setAwaitingTwoFactor(false);
                          setVerificationCode("");
                        }}
                        className="py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{progressStage || "Verifying..."}</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {twoFactorMethod === "otp"
                                ? "Verify One-Time Code"
                                : "I Approved in App — Continue"}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : activeTab === "auto" ? (
                  <>
                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        LinkedIn Email / Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="your_linkedin_email@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
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
                          disabled={loading}
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

                    {/* If LinkedIn asks for a second factor */}
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                        If LinkedIn asks for a second factor
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("otp")}
                          disabled={loading}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "otp"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 hover:border-neutral-300 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>One-time code</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                            LinkedIn sends a code by SMS or email.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod("app")}
                          disabled={loading}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            twoFactorMethod === "app"
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/15"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 hover:border-neutral-300 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                          : "LinkedIn will send a push notification to your mobile app to approve the sign-in."}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* li_at cookie */}
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
                        disabled={loading}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* JSESSIONID cookie */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          JSESSIONID Cookie
                        </label>
                        <span className="text-[10px] text-neutral-400">Optional</span>
                      </div>
                      <input
                        type="text"
                        placeholder="ajax:123456789... (optional)"
                        value={jsessionId}
                        onChange={(e) => setJsessionId(e.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-2.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/70 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      <strong className="text-neutral-700 dark:text-neutral-300">How to get your cookie:</strong>{" "}
                      Open LinkedIn in your browser → press <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">F12</kbd> → go to{" "}
                      <strong>Application</strong> → <strong>Cookies</strong> →{" "}
                      <code className="text-emerald-600 dark:text-emerald-400">https://www.linkedin.com</code> and copy the{" "}
                      <code className="text-emerald-600 dark:text-emerald-400 font-semibold">li_at</code> value.
                    </div>
                  </>
                )}

                {!awaitingTwoFactor && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{progressStage || "Connecting..."}</span>
                      </>
                    ) : (
                      <>
                        <span>Connect LinkedIn Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </form>
            </motion.div>
          ) : (
            /* Success Screen */
            <motion.div
              key="result"
              variants={cardVariants}
              className="py-4 text-center space-y-5"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                  Account Connected & Verified
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Your LinkedIn session is encrypted and active for automated campaigns.
                </p>
              </div>

              {result.profile && (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3 text-left max-w-sm mx-auto">
                  <div className="h-10 w-10 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {result.profile.name ||
                        `${result.profile.firstName || ""} ${result.profile.lastName || ""}`.trim() ||
                        "LinkedIn Member"}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {result.profile.headline || "Connected Profile"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/accounts")}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Go to LinkedIn Accounts
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
