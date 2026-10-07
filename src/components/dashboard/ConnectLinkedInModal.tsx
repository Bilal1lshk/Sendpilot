"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Loader2,
  KeyRound,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";

export interface ConnectedAccountData {
  id: string;
  name: string;
  headline: string;
  type: string;
  photo?: string;
  status: "Active" | "Paused" | "Disconnected";
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
  defaultUserName = "Alex Rivera",
}: ConnectLinkedInModalProps) {
  const [connectMethod, setConnectMethod] = useState<"oauth" | "cookie">("oauth");
  const [sessionCookie, setSessionCookie] = useState("");
  const [profileName, setProfileName] = useState(defaultUserName);
  const [profileHeadline, setProfileHeadline] = useState("Sales Director @ SendPilot");
  const [accountType, setAccountType] = useState<"Sales Navigator" | "LinkedIn Premium" | "LinkedIn Free">("Sales Navigator");
  const [dailyCap, setDailyCap] = useState(25);
  const [step, setStep] = useState<"method" | "connecting" | "success">("method");
  const [connectingProgress, setConnectingProgress] = useState(0);

  if (!isOpen) return null;

  const handleStartConnect = () => {
    setStep("connecting");
    setConnectingProgress(20);

    const interval = setInterval(() => {
      setConnectingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setStep("success");
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handleFinish = () => {
    const newAccount: ConnectedAccountData = {
      id: `acc_${Date.now()}`,
      name: profileName.trim() || defaultUserName,
      headline: profileHeadline.trim() || "Sales Director @ SendPilot",
      type: accountType,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      status: "Active",
      connectedDate: "Just now",
      usedToday: 0,
      dailyCap: dailyCap,
      warmupStage: 1,
    };
    onConnected(newAccount);
    // Reset state
    setStep("method");
    setConnectingProgress(0);
    setSessionCookie("");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-2xl border border-neutral-800 bg-[#121415] text-neutral-100 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0a66c2]/10 border border-[#0a66c2]/20 flex items-center justify-center text-[#0a66c2]">
                <LinkedInIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Connect LinkedIn Account
                </h3>
                <p className="text-xs text-neutral-400">
                  Safely link your sender profile to start personalized outreach
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {step === "method" && (
              <>
                {/* Method Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setConnectMethod("oauth")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      connectMethod === "oauth"
                        ? "bg-neutral-800 text-white shadow-xs"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>OAuth Official (Recommended)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectMethod("cookie")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      connectMethod === "cookie"
                        ? "bg-neutral-800 text-white shadow-xs"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5 text-palm-leaf-400" />
                    <span>Session Cookie (li_at)</span>
                  </button>
                </div>

                {connectMethod === "oauth" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/40">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-200">
                            Zero password sharing
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                            Sign in securely through LinkedIn’s official authentication modal. We never view or store your LinkedIn login credentials.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>OAuth 2.0 OIDC</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>Encrypted tokens</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>Revoke anytime</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Details Customization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Profile Display Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="e.g. Alex Rivera"
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Account Tier
                        </label>
                        <select
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value as any)}
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-600"
                        >
                          <option value="Sales Navigator">Sales Navigator (Recommended)</option>
                          <option value="LinkedIn Premium">LinkedIn Premium</option>
                          <option value="LinkedIn Free">LinkedIn Free</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Professional Headline
                      </label>
                      <input
                        type="text"
                        value={profileHeadline}
                        onChange={(e) => setProfileHeadline(e.target.value)}
                        placeholder="e.g. Head of Growth @ Acme SaaS"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-200">
                          Cookie Connection (<code className="text-emerald-400">li_at</code>)
                        </span>
                        <a
                          href="https://www.linkedin.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                        >
                          <span>Open LinkedIn</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        Copy the <code className="text-neutral-200 bg-neutral-800 px-1 py-0.5 rounded">li_at</code> cookie value from your browser DevTools (Application &gt; Cookies &gt; linkedin.com).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        LinkedIn <code className="text-palm-leaf-400">li_at</code> Cookie
                      </label>
                      <input
                        type="password"
                        value={sessionCookie}
                        onChange={(e) => setSessionCookie(e.target.value)}
                        placeholder="AQEDA..."
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-neutral-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="e.g. Elena Rostova"
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Account Tier
                        </label>
                        <select
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value as any)}
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-600"
                        >
                          <option value="Sales Navigator">Sales Navigator</option>
                          <option value="LinkedIn Premium">LinkedIn Premium</option>
                          <option value="LinkedIn Free">LinkedIn Free</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Safety Cap Setting */}
                <div className="p-3.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-neutral-200 block">
                      Daily Warm-Up Safety Cap
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      Recommended 15–25 requests during the initial 2-week period.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={40}
                      value={dailyCap}
                      onChange={(e) => setDailyCap(Number(e.target.value))}
                      className="w-16 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-white text-center font-semibold focus:outline-hidden"
                    />
                    <span className="text-xs text-neutral-400">req/day</span>
                  </div>
                </div>
              </>
            )}

            {step === "connecting" && (
              <div className="py-8 text-center space-y-4">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a66c2]/10 border border-[#0a66c2]/30">
                  <LinkedInIcon className="h-8 w-8 text-[#0a66c2]" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">
                    Establishing Safe Handshake...
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Verifying session token, establishing residential proxy envelope, and testing safety limits.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="max-w-xs mx-auto">
                  <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <motion.div
                      animate={{ width: `${connectingProgress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-2 block font-mono">
                    {connectingProgress}% verified
                  </span>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white">
                    LinkedIn Account Connected!
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    <span className="font-semibold text-neutral-200">{profileName}</span> is now active with Stage 1 warm-up protection ({dailyCap} daily requests limit).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 max-w-md mx-auto flex items-center justify-between">
                  <span className="text-neutral-400">Account status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active & Safe
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-neutral-800/80 px-6 py-4 bg-neutral-900/30">
            {step === "method" ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleStartConnect}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  <span>Authorize LinkedIn</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : step === "connecting" ? (
              <div className="w-full flex justify-center">
                <span className="text-xs text-neutral-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  Please wait while secure connection completes...
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-semibold shadow-xs transition-all"
              >
                Go to Accounts Dashboard
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
