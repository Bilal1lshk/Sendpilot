"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  Sparkles,
  Lock,
  Layers,
  AlertTriangle,
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
  const [connectMode, setConnectMode] = useState<"isolated" | "direct">("isolated");
  const [authCode, setAuthCode] = useState("");
  const [profileName, setProfileName] = useState(defaultUserName);
  const [accountType, setAccountType] = useState<"Sales Navigator" | "LinkedIn Premium" | "LinkedIn Free">("Sales Navigator");
  const [dailyCap, setDailyCap] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualAuthUrl, setManualAuthUrl] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setOpenedAt(Date.now());
      setManualAuthUrl(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && connectMode === "isolated" && !manualAuthUrl) {
      // Fetch pre-signed authorization URL with real callback URI
      fetch("/api/auth/linkedin/authorize?mode=manual&json=true")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.url) setManualAuthUrl(data.url);
        })
        .catch(() => {});
    }
  }, [isOpen, connectMode, manualAuthUrl]);

  // Poll /api/linkedin/accounts while modal is open so Incognito callback completion is detected automatically
  useEffect(() => {
    if (!isOpen || step !== "form" || !openedAt) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/linkedin/accounts", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const accounts: any[] = data?.accounts || [];
        const newlyVerified = accounts.find((acc) => {
          if (acc.status !== "active" || !acc.lastVerifiedAt) return false;
          const verifiedMs = new Date(acc.lastVerifiedAt).getTime();
          return verifiedMs >= openedAt - 2000;
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
          onConnected(mappedAccount);
          toast.success(`${mappedAccount.name} connected successfully!`);
        }
      } catch {
        // ignore polling error
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, step, openedAt, onConnected, profileName, accountType, dailyCap]);

  // Listen for popup callback messages if direct popup flow is used
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "LINKEDIN_AUTH_SUCCESS") {
        try {
          const res = await fetch("/api/linkedin/accounts");
          const data = await res.json().catch(() => null);
          const matched = data?.accounts?.find((a: any) => a.id === event.data?.id) || data?.accounts?.[0];
          if (matched) {
            onConnected({
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
            });
          }
        } catch {
          // ignore fallback
        }
        toast.success("LinkedIn account connected successfully!");
        onClose();
      } else if (event.data?.type === "LINKEDIN_AUTH_ERROR") {
        toast.error(event.data?.error || "LinkedIn authorization failed.");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose, onConnected, profileName, accountType, dailyCap]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    let targetUrl = manualAuthUrl;
    if (!targetUrl) {
      try {
        const r = await fetch("/api/auth/linkedin/authorize?mode=manual&json=true");
        const data = await r.json().catch(() => null);
        if (data?.url) {
          targetUrl = data.url;
          setManualAuthUrl(data.url);
        }
      } catch {
        // fallback below
      }
    }
    const finalUrl =
      targetUrl || `${window.location.origin}/api/auth/linkedin/authorize?mode=manual`;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      toast.success("Authorization link copied! Open in an Incognito window to protect your personal LinkedIn session.");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy link to clipboard");
    }
  };

  const handleOpenDirectPopup = () => {
    // Open /api/auth/linkedin/authorize directly in the popup so it sets a fresh li_oauth_state cookie and redirects cleanly
    const targetUrl = "/api/auth/linkedin/authorize";
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
    window.open(targetUrl, "linkedin_auth_direct", windowFeatures);
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
      let extractedRedirectUri: string | undefined = undefined;

      if (cleanCode.includes("http://") || cleanCode.includes("https://")) {
        try {
          const parsed = new URL(cleanCode);
          const codeParam = parsed.searchParams.get("code");
          if (codeParam) {
            cleanCode = codeParam;
            extractedRedirectUri = `${parsed.origin}${parsed.pathname}`;
          }
        } catch {
          const match = cleanCode.match(/[?&]code=([^&#]+)/);
          if (match) cleanCode = decodeURIComponent(match[1]);
        }
      } else if (cleanCode.includes("code=")) {
        const match = cleanCode.match(/(?:^|[?&])code=([^&#]+)/);
        if (match) cleanCode = decodeURIComponent(match[1]);
      }

      const res = await fetch("/api/linkedin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          redirectUri: extractedRedirectUri,
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

      const safeAccount = data.account;
      const mappedAccount: ConnectedAccountData = {
        id: safeAccount.id,
        name: safeAccount.linkedinName || profileName || "LinkedIn Account",
        headline: "LinkedIn Profile",
        type: accountType,
        photo: safeAccount.linkedinAvatar || "",
        status: "Active",
        connectedDate: new Date().toLocaleDateString(),
        usedToday: 0,
        dailyCap,
        warmupStage: 1,
      };

      setConnectedAccount(mappedAccount);
      setStep("success");
      onConnected(mappedAccount);

      if (data.alreadyConnected) {
        toast.info("This LinkedIn account is already connected to your workspace. Authorization refreshed!");
      } else {
        toast.success("LinkedIn account successfully connected to workspace!");
      }
    } catch {
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
                  Safely link outreach sender profiles without session collisions
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

          {/* Mode Switcher Tabs */}
          {step === "form" && (
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setConnectMode("isolated")}
                  className={`py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    connectMode === "isolated"
                      ? "bg-neutral-800 text-white shadow-xs font-semibold"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Isolated (Incognito)</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded font-mono">
                    Safe
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectMode("direct")}
                  className={`py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    connectMode === "direct"
                      ? "bg-neutral-800 text-white shadow-xs font-semibold"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span>Current Browser Profile</span>
                </button>
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {step === "form" ? (
              connectMode === "isolated" ? (
                /* ── Mode 1: Isolated / Incognito Flow (Safe for separate accounts) ── */
                <form onSubmit={handleConnect} className="space-y-4">
                  {/* Protection Notice Banner */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-start gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-emerald-300">
                        Zero Session Conflict Protection
                      </p>
                      <p className="text-neutral-300 leading-relaxed text-[11px]">
                        Authorizing in an Incognito window guarantees that your personal LinkedIn session in this browser is <strong className="text-white">never logged out or modified</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 1: Copy Link */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">
                        1. Sign In &amp; Paste Link in Incognito
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        Ctrl+Shift+N / ⌘+Shift+N
                      </span>
                    </div>

                    <ol className="text-xs text-neutral-300 leading-relaxed space-y-1.5 list-decimal list-inside">
                      <li>
                        Open an <strong className="text-white">Incognito window</strong> and sign in to <strong className="text-white">linkedin.com</strong> first (until you see your LinkedIn feed).
                      </li>
                      <li>
                        Copy the authorization link below and paste it into that <strong className="text-white">same Incognito tab&apos;s address bar</strong>:
                      </li>
                    </ol>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 text-white py-2.5 px-3 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied! Paste in your signed-in Incognito tab</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-neutral-300" />
                          <span>Copy Authorization Link for Incognito</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded-lg px-2.5 py-1.5 leading-relaxed">
                      <strong>Why did it go to linkedin.com/feed?</strong> LinkedIn drops OAuth redirects if you log in from a cold Incognito tab. Now that you&apos;re on <code className="font-mono">linkedin.com/feed</code> in Incognito, paste the copied link into that address bar once more and press Enter — it will connect automatically!
                    </p>
                  </div>

                  {/* Step 2: Auto-detect or Paste Code */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                        2. Auto-Detecting Connection (or Paste Callback URL)
                      </label>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Listening for authorization...
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Optional fallback: paste the callback URL or code here if not auto-detected..."
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-emerald-500 transition-colors"
                      required
                    />
                    <p className="text-[11px] text-neutral-400">
                      This window will automatically detect your account as soon as you approve on LinkedIn, or you can paste the callback URL above.
                    </p>
                  </div>

                  {/* Account Limits Configuration */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
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

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !authCode.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verifying &amp; Connecting Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect Account to SendPilot</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Mode 2: Direct Popup Flow (Current Browser Session) ── */
                <div className="space-y-4 py-2">
                  <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <span>Connect Active Browser Session</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      This will connect whichever LinkedIn profile is currently logged in on this browser. It will <strong className="text-white">not</strong> log you out of LinkedIn.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-3">
                    <p className="text-xs text-neutral-400">
                      Click below to open LinkedIn authorization in a secure popup window. Once approved, your account will be linked automatically.
                    </p>

                    <button
                      type="button"
                      onClick={handleOpenDirectPopup}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white py-3 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <LinkedInIcon className="h-4 w-4" />
                      <span>Open LinkedIn Authorization Popup</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              )
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
                  <span className="text-neutral-400">Session Status</span>
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
