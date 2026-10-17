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
        setProgressStage("Authenticating with LinkedIn in the background...");
        payload = {
          method: "playwright",
          email: email.trim(),
          password,
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

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to authenticate LinkedIn account.");
      }

      setResult({
        profile: data.profile,
        saved: data.saved,
        connectionId: data.connectionId,
      });

      setPassword("");
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
              <span>Direct Connection</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <LinkedInIcon className="w-5 h-5" />
              </span>
              Connect LinkedIn Account
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Authenticate via automated background login or paste your active session cookie.
            </p>
          </div>
        </div>

        {/* Form or Result */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="form"
              variants={cardVariants}
              className="space-y-4"
            >
              {/* Mode Tabs */}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === "auto" ? (
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
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
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
                        placeholder='ajax:123456789... (or "ajax:...")'
                        value={jsessionId}
                        onChange={(e) => setJsessionId(e.target.value)}
                        disabled={loading}
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
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{progressStage || "Connecting Profile..."}</span>
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
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 text-center space-y-4"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  LinkedIn Connected!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.profile?.name || result.profile?.firstName || "Your profile"}
                  </span>{" "}
                  is now connected and verified for outreach.
                </p>
                {result.profile?.headline && (
                  <p className="text-[11px] text-neutral-400 italic">
                    {result.profile.headline}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/accounts")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>View in Accounts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-4 py-2.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>Connect Another Account</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
