"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  RotateCw,
  Trash2,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Info,
  ExternalLink,
  Globe,
  ArrowRight,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { ConnectLinkedInModal } from "@/components/dashboard/ConnectLinkedInModal";
import { pageVariants, cardVariants, drawerVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";
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

interface SafeConnectionPayload {
  id: string;
  linkedinName: string;
  linkedinAvatar: string;
  status: "active" | "expired" | "revoked";
  lastVerifiedAt: string | null;
}

/** Toast message shown when the same LinkedIn member is reconnected. */
const ALREADY_CONNECTED_MSG =
  "This LinkedIn account is already connected. Authorization refreshed successfully.";

export default function LinkedInAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch accounts ──────────────────────────────────────────────
  const fetchAccounts = async (): Promise<ConnectedAccountData[]> => {
    try {
      const res = await fetch("/api/linkedin/accounts");
      if (res.status === 401) {
        router.replace("/login");
        return [];
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Failed to load accounts from database");
        return [];
      }
      if (data?.accounts) {
        const mapped = data.accounts.map((account: SafeConnectionPayload) => ({
          id: account.id,
          name: account.linkedinName,
          headline: "LinkedIn profile",
          type: "LinkedIn OAuth",
          photo: account.linkedinAvatar,
          status: account.status === "active" ? "Active" : account.status === "expired" ? "Expired" : "Disconnected",
          connectedDate: account.lastVerifiedAt ? new Date(account.lastVerifiedAt).toLocaleDateString() : "Not verified",
          usedToday: 0,
          dailyCap: 25,
          warmupStage: 1,
        } satisfies ConnectedAccountData));
        setAccounts(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error("Failed to load accounts:", err);
      toast.error("Failed to load accounts from database");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle OAuth redirect-back params ──────────────────────────
  const handleOAuthResult = useEffectEvent(async (
    status: string | null,
    connectionId: string | null,
    error: string | null
  ) => {
    const loadedAccounts = await fetchAccounts();
    if (status === "connected") {
      const connectedAccount = loadedAccounts.find((account) => account.id === connectionId);
      if (!connectedAccount) {
        toast.error("The verified LinkedIn account could not be loaded");
        router.replace("/dashboard/accounts");
        return;
      }

      const correctAccount = window.confirm(
        `Connected as ${connectedAccount.name}. Is this the right LinkedIn account?`
      );
      if (correctAccount) {
        const response = await fetch(`/api/linkedin/accounts/${encodeURIComponent(connectedAccount.id)}/confirm`, { method: "POST" });
        if (response.ok) toast.success(`Connected as ${connectedAccount.name}`);
        else toast.error("Could not confirm this LinkedIn account");
      } else {
        await fetch(`/api/linkedin/accounts?id=${encodeURIComponent(connectedAccount.id)}`, { method: "DELETE" });
        await fetchAccounts();
        toast.info("Account removed.");
      }
      router.replace("/dashboard/accounts");
    } else if (status === "already_connected") {
      toast.success(ALREADY_CONNECTED_MSG);
      router.replace("/dashboard/accounts");
    } else if (status === "verification_failed") {
      toast.error("LinkedIn could not verify this account. Please reconnect and try again.");
      router.replace("/dashboard/accounts");
    } else if (error) {
      toast.error(`LinkedIn connection error: ${decodeURIComponent(error)}`);
      router.replace("/dashboard/accounts");
    }
  });

  useEffect(() => {
    const task = window.setTimeout(() => {
      void handleOAuthResult(
        searchParams.get("status"),
        searchParams.get("id"),
        searchParams.get("error")
      );
    }, 0);
    return () => window.clearTimeout(task);
  }, [searchParams]);

  // ── Account actions ─────────────────────────────────────────────
  const verifyAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/linkedin/accounts/${encodeURIComponent(id)}/verify`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        await fetchAccounts();
        toast.error(data.error || "LinkedIn authorization expired. Reconnect this account.");
        return;
      }
      toast.success("LinkedIn account verified");
      await fetchAccounts();
    } catch {
      toast.error("Could not verify LinkedIn account");
    }
  };

  const reconnect = (_id: string) => {
    toast.loading("Redirecting to LinkedIn to reconnect...");
    window.location.href = "/api/auth/linkedin/authorize";
  };

  const removeAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this LinkedIn account?")) return;

    setAccounts((prev) => prev.filter((acc) => acc.id !== id));

    try {
      const res = await fetch(`/api/linkedin/accounts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove account");
      toast.success("LinkedIn account disconnected successfully.");
    } catch {
      toast.error("Failed to disconnect account");
      fetchAccounts();
    }
  };

  /** Directly opens the connect modal to add another LinkedIn account via redirect URL */
  const handleAddAccount = () => {
    setConnectModalOpen(true);
  };

  const disconnectedAccount = accounts.find((a) => a.status !== "Active");

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            LinkedIn accounts
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Sender profiles, safe daily caps, and warm-up progression.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSecurityPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-palm-leaf-400 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Security notes</span>
          </button>

          <button
            type="button"
            id="add-account-btn"
            onClick={handleAddAccount}
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{accounts.length > 0 ? "Add account" : "Connect account"}</span>
          </button>
        </div>
      </motion.div>

      {/* Disconnected account friendly banner */}
      {disconnectedAccount && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {microcopy.feedback.disconnectedNotice(disconnectedAccount.name)}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                LinkedIn sessions expire periodically. Reconnect to resume scheduled steps.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reconnect(disconnectedAccount.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 shadow-2xs shrink-0 self-start sm:self-center cursor-pointer"
          >
            <RotateCw className="h-3 w-3 text-palm-leaf-600" />
            <span>Reconnect</span>
          </button>
        </motion.div>
      )}

      {/* Accounts List / Loading / Empty State */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-palm-leaf-600 mx-auto" />
          <p className="text-xs text-neutral-500">Loading connected accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 text-center space-y-4 shadow-xs"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a66c2]/10 border border-[#0a66c2]/20 text-[#0a66c2]">
            <LinkedInIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              No LinkedIn accounts connected yet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Link your real LinkedIn profile to start safe, personalized outreach with AI assistance.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => { window.location.href = "/api/auth/linkedin/authorize"; }}
              className="inline-flex items-center gap-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect LinkedIn Account</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => {
            const usagePercent = Math.min((acc.usedToday / acc.dailyCap) * 100, 100);

            return (
              <motion.div
                key={acc.id}
                variants={cardVariants}
                className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs hover:border-neutral-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Avatar, Name, Status line */}
                  <div className="flex items-start gap-4">
                    <div className="relative h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0">
                      {acc.photo ? (
                        <img src={acc.photo} alt={acc.name} className="h-full w-full object-cover" />
                      ) : (
                        <LinkedInIcon className="h-6 w-6 text-[#0a66c2]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {acc.name}
                        </h3>
                        <span className="text-[11px] text-neutral-400">({acc.type})</span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                          {acc.status === "Active" ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-medium text-emerald-800 dark:text-emerald-300">Active</span>
                            </>
                          ) : acc.status === "Expired" ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span className="font-medium text-amber-700 dark:text-amber-400">Expired</span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              <span className="font-medium text-rose-700 dark:text-rose-400">Disconnected</span>
                            </>
                          )}
                          <span className="text-neutral-400">•</span>
                          <span>{acc.usedToday} of {acc.dailyCap} requests used today.</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-1">
                        Connected {acc.connectedDate}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Usage Progress & Warm-up steps */}
                  <div className="flex-1 max-w-sm space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                        <span>Daily requests</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {acc.usedToday} / {acc.dailyCap}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${usagePercent}%` }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full bg-palm-leaf-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                        <span>Warm-up progression</span>
                        <span className="font-medium text-neutral-600 dark:text-neutral-300">
                          Stage {acc.warmupStage} of 3
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((stage) => {
                          const isCurrent = acc.warmupStage === stage;
                          const isCompleted = acc.warmupStage > stage;
                          return (
                            <div
                              key={stage}
                              className={`h-1.5 rounded-full transition-colors ${
                                isCompleted
                                  ? "bg-palm-leaf-600"
                                  : isCurrent
                                  ? "bg-palm-leaf-400"
                                  : "bg-neutral-200 dark:bg-neutral-800"
                              }`}
                              title={`Stage ${stage}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    {acc.status !== "Active" ? (
                      <button
                        type="button"
                        onClick={() => reconnect(acc.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Reconnect</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => verifyAccount(acc.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        <RotateCw className="h-3 w-3 text-palm-leaf-600" />
                        <span>Verify</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeAccount(acc.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}



      {/* ── Connect LinkedIn Modal (Redirect URL / Code flow) ─────── */}
      <ConnectLinkedInModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onConnected={async () => {
          await fetchAccounts();
        }}
      />

      {/* ── Security Side Panel ───────────────────────────────────── */}
      <AnimatePresence>
        {securityPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSecurityPanelOpen(false)}
              className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs"
            />
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-palm-leaf-700 dark:text-palm-leaf-400">
                    <ShieldCheck className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Security &amp; Privacy
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecurityPanelOpen(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      What we store
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      We store your profile name and avatar with OAuth credentials encrypted on the server. Credentials are never included in account responses.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      What we never do
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      We never ask for your LinkedIn password, never scrape private inboxes without permission, and never send high-volume mass spam.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      Multiple accounts
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      You can connect multiple LinkedIn profiles. Each is tracked independently with its own daily cap, warm-up stage, and token. To add a different profile, you must be logged into that LinkedIn account in your browser first.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      Account safety limits
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Every connected profile is throttled to 15–25 connection requests per day with randomized intervals to protect your reputation.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      How to disconnect
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Click Remove on any card, or revoke SendPilot access directly from your LinkedIn Settings &gt; Data Privacy &gt; Other applications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSecurityPanelOpen(false)}
                  className="w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
