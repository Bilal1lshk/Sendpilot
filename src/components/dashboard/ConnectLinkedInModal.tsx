"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
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

interface SafeAccountItem {
  id: string;
  linkedinName?: string;
  linkedinAvatar?: string;
  status?: string;
  lastVerifiedAt?: string | null;
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
  const profileName = defaultUserName;
  const [accountType, setAccountType] = useState<"Sales Navigator" | "LinkedIn Premium" | "LinkedIn Free">("Sales Navigator");
  const [dailyCap, setDailyCap] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      setIsSubmitting(false);
      setStep("form");
    }
  }, [isOpen]);

  // Listen for popup callback message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "LINKEDIN_AUTH_SUCCESS") {
        try {
          const res = await fetch("/api/linkedin/accounts", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          const accounts: SafeAccountItem[] = data?.accounts || [];
          const matched = accounts.find((a) => a.id === event.data?.id) || accounts[0];
          if (matched) {
            const mappedAccount: ConnectedAccountData = {
              id: matched.id,
              name: matched.linkedinName || profileName || "LinkedIn Account",
              headline: "LinkedIn Profile",
              type: accountType,
              photo: matched.linkedinAvatar || "",
              status: "Active",
              connectedDate: new Date().toLocaleDateString(),
              usedToday: 0,
              dailyCap,
              warmupStage: 1,
            };
            setConnectedAccount(mappedAccount);
            setStep("success");
            onConnected(mappedAccount);
          }
        } catch {
          // ignore fallback
        }
        setIsSubmitting(false);
        toast.success("LinkedIn account connected successfully!");
      } else if (event.data?.type === "LINKEDIN_AUTH_ERROR") {
        setIsSubmitting(false);
        toast.error(event.data?.error || "LinkedIn authorization failed.");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onConnected, profileName, accountType, dailyCap]);

  // Poll /api/linkedin/accounts while modal is open so completion is detected automatically
  useEffect(() => {
    if (!isOpen || step !== "form") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/linkedin/accounts", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const accounts: SafeAccountItem[] = data?.accounts || [];
        const newlyVerified = accounts.find((acc) => {
          if (acc.status !== "active" || !acc.lastVerifiedAt) return false;
          const verifiedMs = new Date(acc.lastVerifiedAt).getTime();
          return verifiedMs >= openedAtRef.current - 2000;
        });
        if (newlyVerified) {
          const mappedAccount: ConnectedAccountData = {
            id: newlyVerified.id,
            name: newlyVerified.linkedinName || profileName || "LinkedIn Account",
            headline: "LinkedIn Profile",
            type: accountType,
            photo: newlyVerified.linkedinAvatar || "",
            status: "Active",
            connectedDate: new Date().toLocaleDateString(),
            usedToday: 0,
            dailyCap,
            warmupStage: 1,
          };
          setConnectedAccount(mappedAccount);
          setStep("success");
          setIsSubmitting(false);
          onConnected(mappedAccount);
          toast.success(`${mappedAccount.name} connected successfully!`);
        }
      } catch {
        // ignore polling error
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen, step, onConnected, profileName, accountType, dailyCap]);

  if (!isOpen) return null;

  const handleStartConnect = () => {
    setIsSubmitting(true);
    const returnTo = typeof window !== "undefined" ? window.location.pathname : "/dashboard/accounts";
    const targetUrl = `/api/auth/linkedin/authorize?returnTo=${encodeURIComponent(returnTo)}`;
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
    const popup = window.open(targetUrl, "linkedin_auth_direct", windowFeatures);
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      // Fallback if popup blocked by browser
      window.location.href = targetUrl;
    }
  };

  const handleFinish = () => {
    setStep("form");
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
          className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#121415] text-neutral-100 shadow-2xl overflow-hidden z-10"
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
                  Link your LinkedIn profile for personalized, AI-assisted outreach
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
              <div className="space-y-5">
                {/* Account Limits Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
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

                {/* Safety Guarantee Banner */}
                <div className="p-3.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-medium text-neutral-200 block">
                      Secure Official Authorization
                    </span>
                    <span className="text-[11px] text-neutral-400 block leading-relaxed">
                      SendPilot authenticates directly through LinkedIn&apos;s official OAuth. We never ask for or store your LinkedIn password.
                    </span>
                  </div>
                </div>

                {/* Primary Connect Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartConnect}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-50 text-white py-3.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting with LinkedIn...</span>
                      </>
                    ) : (
                      <>
                        <LinkedInIcon className="h-4 w-4" />
                        <span>Connect with LinkedIn</span>
                        <ArrowRight className="h-4 w-4 ml-0.5 opacity-90" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-neutral-400 text-center mt-2.5">
                    Opens LinkedIn to authorize your profile in one click.
                  </p>

                  <div className="pt-3 border-t border-neutral-800/80 text-center mt-3">
                    <a
                      href="/dashboard/accounts/direct-login"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <KeyRound className="h-3 w-3" />
                      <span>Or extract cookies directly via Email/Password</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Success Screen ── */
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white">
                    LinkedIn Account Connected!
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    <span className="font-semibold text-neutral-200">{connectedAccount?.name || profileName}</span> is now active in your workspace with a safe limit of {dailyCap} daily actions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 max-w-md mx-auto flex items-center justify-between">
                  <span className="text-neutral-400">Account Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active &amp; Verified
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
