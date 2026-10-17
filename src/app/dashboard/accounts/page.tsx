"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Power,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { pageVariants, cardVariants, drawerVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";
import { toast } from "sonner";
import { ConnectLinkedInModal } from "@/components/dashboard/ConnectLinkedInModal";

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

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAccountsIfNeeded,
  fetchOverviewIfNeeded,
  removeAccountState,
} from "@/store/slices/databaseSlice";

export default function LinkedInAccountsPage() {
  const dispatch = useAppDispatch();
  const { items: accounts, loading: storeLoading, loaded: storeLoaded } = useAppSelector(
    (state) => state.database.accounts
  );
  const isLoading = storeLoading && !storeLoaded;

  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // ── Fetch accounts (cached via Redux unless force=true) ─────────
  const fetchAccounts = async (force = false): Promise<ConnectedAccountData[]> => {
    try {
      const result = await dispatch(fetchAccountsIfNeeded({ force })).unwrap();
      if (force) {
        dispatch(fetchOverviewIfNeeded({ force: true }));
      }
      return result;
    } catch {
      return accounts;
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // ── Account actions ─────────────────────────────────────────────
  const verifyAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/linkedin/accounts/${encodeURIComponent(id)}/verify`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        await fetchAccounts(true);
        toast.error(data.error || "LinkedIn authorization expired. Reconnect this account.");
        return;
      }
      toast.success("LinkedIn account verified");
      await fetchAccounts(true);
    } catch {
      toast.error("Could not verify LinkedIn account");
    }
  };

  const reconnect = (_id?: string) => {
    setConnectModalOpen(true);
  };

  const handleDisconnect = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/linkedin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "disconnect" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to disconnect account");
      }
      toast.success(`${name} disconnected successfully.`);
      await fetchAccounts(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to disconnect account";
      toast.error(msg);
      fetchAccounts(true);
    }
  };

  const handleConnect = async (id: string, name: string) => {
    toast.loading(`Connecting ${name}...`, { id: `connect-${id}` });
    try {
      const res = await fetch("/api/linkedin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "connect" }),
      });
      toast.dismiss(`connect-${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.requiresAuth) {
          toast.error("LinkedIn authorization expired. Please reconnect.");
          reconnect(id);
          return;
        }
        throw new Error(data?.error || "Failed to connect account");
      }
      toast.success(`Connected as ${name}. Other accounts have been disconnected.`);
      await fetchAccounts(true);
    } catch (err: unknown) {
      toast.dismiss(`connect-${id}`);
      const msg = err instanceof Error ? err.message : "Failed to connect account";
      toast.error(msg);
      fetchAccounts(true);
    }
  };

  const removeAccount = async (id: string, name?: string) => {
    const displayName = name || "this LinkedIn account";
    if (!confirm(`Are you sure you want to delete ${displayName} from your workspace?`)) return;

    dispatch(removeAccountState(id));

    try {
      const res = await fetch(`/api/linkedin/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      toast.success(`${displayName} removed successfully.`);
      fetchAccounts(true);
    } catch {
      toast.error("Failed to delete account");
      fetchAccounts(true);
    }
  };

  /** Opens LinkedIn connection modal */
  const handleAddAccount = () => {
    setConnectModalOpen(true);
  };

  const activeAccount = accounts.find((a) => a.status === "Active");
  const expiredAccount = accounts.find((a) => a.status === "Expired");
  const hasNoActiveAccount = accounts.length > 0 && !activeAccount;

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

      {/* Expired account notice */}
      {expiredAccount && (
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
                {microcopy.feedback.disconnectedNotice(expiredAccount.name)}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                LinkedIn sessions expire periodically. Reconnect to resume scheduled steps.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reconnect(expiredAccount.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 shadow-2xs shrink-0 self-start sm:self-center cursor-pointer"
          >
            <RotateCw className="h-3 w-3 text-palm-leaf-600" />
            <span>Reconnect</span>
          </button>
        </motion.div>
      )}

      {/* No active account notice */}
      {!expiredAccount && hasNoActiveAccount && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                No active LinkedIn account connected
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Click &ldquo;Connect&rdquo; on an account below to activate it for outreach campaigns.
              </p>
            </div>
          </div>
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
              onClick={handleAddAccount}
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
                    {acc.status === "Active" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => verifyAccount(acc.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                          title="Verify token status with LinkedIn"
                        >
                          <RotateCw className="h-3 w-3 text-palm-leaf-600" />
                          <span>Verify</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDisconnect(acc.id, acc.name)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                          title="Disconnect account"
                        >
                          <Power className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                          <span>Disconnect</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConnect(acc.id, acc.name)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                          title="Connect account (will disconnect other active accounts)"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Connect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => reconnect(acc.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                          title="Re-authorize with LinkedIn"
                        >
                          <RotateCw className="h-3 w-3 text-palm-leaf-600" />
                          <span>Reconnect</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => removeAccount(acc.id, acc.name)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete profile from workspace"
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
                      We store your profile name and avatar with session credentials encrypted on the server using AES-256-GCM. Credentials are never included in account responses.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      What we never do
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      We never store your LinkedIn password in plain text, never scrape private inboxes without permission, and never send high-volume mass spam.
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

      <ConnectLinkedInModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onConnected={() => {
          fetchAccounts(true);
        }}
      />
    </motion.div>
  );
}
