"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { toast } from "sonner";

export interface ConnectedAccountData {
  id: string;
  name: string;
  headline: string;
  type: string;
  photo: string;
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
  defaultUserName = "LinkedIn User",
}: ConnectLinkedInModalProps) {
  const [authCode, setAuthCode] = useState("");
  const [profileName, setProfileName] = useState(defaultUserName);
  const [accountType, setAccountType] = useState<"Sales Navigator" | "LinkedIn Premium" | "LinkedIn Free">("Sales Navigator");
  const [dailyCap, setDailyCap] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);

  if (!isOpen) return null;

  const handleOpenAuthUrl = () => {
    window.open("/api/auth/linkedin/authorize", "_blank");
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      toast.error("Please paste the authorization code or redirect URL");
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract code if user pasted full redirect URL
      let cleanCode = authCode.trim();
      if (cleanCode.includes("code=")) {
        try {
          const parsed = new URL(cleanCode);
          cleanCode = parsed.searchParams.get("code") || cleanCode;
        } catch {
          const match = cleanCode.match(/[?&]code=([^&]+)/);
          if (match) cleanCode = match[1];
        }
      }

      const res = await fetch("/api/linkedin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          accountType,
          dailyCap,
          profileName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to exchange authorization code with LinkedIn");
        setIsSubmitting(false);
        return;
      }

      setConnectedAccount(data.account);
      setStep("success");
      onConnected(data.account);
      toast.success("LinkedIn account successfully connected!");
    } catch (err: any) {
      console.error("LinkedIn connect error:", err);
      toast.error("Network error while connecting LinkedIn account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setStep("form");
    setAuthCode("");
    setConnectedAccount(null);
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
                  OAuth 2.0 Secure Authorization
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {step === "form" ? (
              <form onSubmit={handleConnect} className="space-y-5">
                {/* Step 1: Open GET Request URL */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      1. LinkedIn GET Request
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      scope: w_member_social
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    This request opens LinkedIn authorization directly with your client credentials:
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenAuthUrl}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white py-3 text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <LinkedInIcon className="h-4 w-4" />
                    <span>Open LinkedIn Authorization (GET Request)</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </button>

                  <div className="pt-1">
                    <span className="text-[10px] font-mono text-neutral-400 break-all select-all block bg-black/40 p-2 rounded-lg border border-neutral-800/60">
                      Protected Endpoint: /api/auth/linkedin/authorize
                    </span>
                  </div>
                </div>

                {/* Step 2: Paste Code */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                    2. Paste Authorization Code or Redirect URL
                  </label>

                  <textarea
                    rows={2}
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste the code or redirected URL (e.g. AQRO... or https://www.linkedin.com/developers/tools/oauth/redirect?code=AQRO...)"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-neutral-600"
                    required
                  />
                  <p className="text-[11px] text-neutral-400">
                    LinkedIn will redirect to <code className="text-neutral-300">https://www.linkedin.com/developers/tools/oauth/redirect?code=...</code>. Copy either the <code className="text-emerald-400">code</code> parameter or the entire address bar URL and paste it here.
                  </p>
                </div>

                {/* Account Details & Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Account Tier
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      <option value="Sales Navigator">Sales Navigator</option>
                      <option value="LinkedIn Premium">LinkedIn Premium</option>
                      <option value="LinkedIn Free">LinkedIn Free</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Daily Safety Cap
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={50}
                        value={dailyCap}
                        onChange={(e) => setDailyCap(Number(e.target.value))}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white"
                      />
                      <span className="text-xs text-neutral-400 shrink-0">req/day</span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Connect Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !authCode.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Exchanging Code with LinkedIn...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish & Connect LinkedIn Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white">
                    LinkedIn Account Connected!
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    <span className="font-semibold text-neutral-200">{connectedAccount?.name || profileName}</span> is now active with safe warm-up protection ({dailyCap} daily requests limit).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 max-w-md mx-auto flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  View in Accounts Dashboard
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
