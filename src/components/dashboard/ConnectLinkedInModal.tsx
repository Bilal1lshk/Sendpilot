"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  ExternalLink,
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
  const [accountType, setAccountType] = useState<"Sales Navigator" | "LinkedIn Premium" | "LinkedIn Free">("Sales Navigator");
  const [dailyCap, setDailyCap] = useState(25);

  // Auto method fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Manual method fields
  const [liAt, setLiAt] = useState("");
  const [jsessionId, setJsessionId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setProgressMsg("");
      setStep("form");
      setPassword("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === "auto") {
        if (!email.trim() || !password) {
          toast.error("Please enter both your LinkedIn email and password.");
          setIsSubmitting(false);
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

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to authenticate LinkedIn account.");
      }

      const memberName = data.profile?.name || data.profile?.firstName || defaultUserName;
      const mapped: ConnectedAccountData = {
        id: data.connectionId || `li_${Date.now()}`,
        name: memberName,
        headline: data.profile?.headline || "LinkedIn Profile",
        type: accountType,
        photo: "",
        status: "Active",
        connectedDate: new Date().toLocaleDateString(),
        usedToday: 0,
        dailyCap,
        warmupStage: 1,
      };

      setConnectedAccount(mapped);
      setStep("success");
      onConnected(mapped);
      setEmail("");
      setPassword("");
      setLiAt("");
      setJsessionId("");
      toast.success(`${memberName} connected successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setProgressMsg("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <LinkedInIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Connect LinkedIn
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Link an active profile for outreach campaigns
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === "form" ? (
            <div className="space-y-4">
              {/* Tabs */}
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

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {activeTab === "auto" ? (
                  <>
                    {/* Email Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        LinkedIn Email / Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          placeholder="your_linkedin@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
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
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-10 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* li_at cookie */}
                    <div className="space-y-1">
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
                        disabled={isSubmitting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    {/* JSESSIONID cookie */}
                    <div className="space-y-1">
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
                        disabled={isSubmitting}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800/60 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      💡 <strong>How to find it:</strong> On linkedin.com, press <kbd className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px]">F12</kbd> $\rightarrow$ <strong>Application</strong> $\rightarrow$ <strong>Cookies</strong> $\rightarrow$ copy the <code className="text-emerald-600 dark:text-emerald-400">li_at</code> value.
                    </div>
                  </>
                )}

                {/* Account Tier & Daily Cap */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Account Tier
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) =>
                        setAccountType(
                          e.target.value as
                            | "Sales Navigator"
                            | "LinkedIn Premium"
                            | "LinkedIn Free"
                        )
                      }
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                    >
                      <option value="Sales Navigator">Sales Navigator</option>
                      <option value="LinkedIn Premium">LinkedIn Premium</option>
                      <option value="LinkedIn Free">LinkedIn Free</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Daily Cap
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        max={50}
                        value={dailyCap}
                        onChange={(e) => setDailyCap(Number(e.target.value))}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                      />
                      <span className="text-[11px] text-neutral-400 shrink-0">req/day</span>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{progressMsg || "Connecting..."}</span>
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
            </div>
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
