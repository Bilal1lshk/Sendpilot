"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
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
  ExternalLink,
  Laptop,
  Terminal,
  RefreshCw,
  UserCheck
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { toast } from "sonner";
import { pageVariants, cardVariants } from "@/lib/motion";

export default function DirectLoginCookieExtractorPage() {
  const router = useRouter();

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [headless, setHeadless] = useState(false);
  const [saveAccount, setSaveAccount] = useState(true);

  // Execution state
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<{
    li_at: string;
    jsessionId: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      headline?: string;
    };
    saved?: boolean;
    connectionId?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter both your LinkedIn email and password.");
      return;
    }

    setLoading(true);
    setResult(null);
    setProgressStage("Launching real browser session...");

    try {
      // Periodic progress messages while waiting
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
          saveAccount,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract LinkedIn session.");
      }

      setResult({
        li_at: data.li_at,
        jsessionId: data.jsessionId,
        profile: data.profile,
        saved: data.saved,
        connectionId: data.connectionId,
      });

      toast.success("Successfully extracted and verified LinkedIn session!");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to extract cookies.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setProgressStage("");
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to LinkedIn Accounts
        </Link>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Playwright Browser Automation
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <LinkedInIcon className="w-6 h-6" />
              </span>
              Direct Session & Cookie Extractor
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Enter your credentials to launch an authentic browser instance that safely logs in, bypasses anti-bot defenses, extracts your active <code className="text-blue-300 font-mono">li_at</code> & <code className="text-blue-300 font-mono">JSESSIONID</code> cookies, and connects your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              LinkedIn Credentials
            </h2>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Local in-memory execution
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">LinkedIn Email / Phone</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="your_linkedin_email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">LinkedIn Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options Toggle Section */}
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 space-y-3">
              {/* Visible Mode vs Headless */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!headless}
                  onChange={(e) => setHeadless(!e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 rounded border-zinc-700 text-blue-600 focus:ring-blue-500/30"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    Interactive Visible Window (Recommended)
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Opens Edge on your desktop. If LinkedIn sends a 2FA code or CAPTCHA puzzle, you can complete it directly.
                  </p>
                </div>
              </label>

              {/* Auto Save Account */}
              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-zinc-800/60">
                <input
                  type="checkbox"
                  checked={saveAccount}
                  onChange={(e) => setSaveAccount(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 rounded border-zinc-700 text-blue-600 focus:ring-blue-500/30"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Connect & Save to Workspace
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Automatically encrypts and adds this account to your active SendPilot LinkedIn Accounts list.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Extracting Session...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span>Extract & Verify Session Cookies</span>
                </>
              )}
            </button>
          </form>

          {/* Realtime progress tracker */}
          {loading && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
              <span>{progressStage || "Processing..."}</span>
            </div>
          )}
        </motion.div>

        {/* Right Column: Security Guarantees & Extracted Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security Notice Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
              <Shield className="w-4 h-4" />
              Zero Password Storage Guarantee
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              SendPilot never stores your LinkedIn password on our database. The credentials are passed strictly in memory to your local Playwright browser process to authenticate once, retrieve the <code className="text-zinc-200">li_at</code> session cookie, and are immediately discarded.
            </p>
            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              AES-256-GCM encryption on session tokens
            </div>
          </div>

          {/* Results Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl shadow-emerald-500/5"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Session Successfully Extracted!
                </div>

                {/* Profile info if returned */}
                {result.profile?.firstName && (
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                      {result.profile.firstName[0]}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-white truncate">
                        {result.profile.firstName} {result.profile.lastName}
                      </div>
                      {result.profile.headline && (
                        <div className="text-xs text-zinc-400 truncate">
                          {result.profile.headline}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* li_at box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-300 font-medium">li_at cookie</span>
                    <button
                      onClick={() => copyToClipboard(result.li_at, "li_at")}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedField === "li_at" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "li_at" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 break-all select-all">
                    {result.li_at}
                  </div>
                </div>

                {/* JSESSIONID box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-300 font-medium">JSESSIONID cookie</span>
                    <button
                      onClick={() => copyToClipboard(result.jsessionId, "JSESSIONID")}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedField === "JSESSIONID" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "JSESSIONID" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 break-all select-all">
                    {result.jsessionId}
                  </div>
                </div>

                {/* Next Steps Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  {result.saved ? (
                    <button
                      onClick={() => router.push("/dashboard/accounts")}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      View in Connected Accounts
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push("/dashboard/accounts")}
                      className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
