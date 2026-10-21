"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  UserPlus,
  X,
  Send,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";

export interface SendConnectionTarget {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  linkedinUrl: string;
  avatar?: string;
  enrollmentId?: string;
  campaignId?: string;
}

interface SendConnectionModalProps {
  target: SendConnectionTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
  senderAccountName?: string;
  initialNote?: string;
}

export function SendConnectionModal({
  target,
  isOpen,
  onClose,
  onSuccess,
  senderAccountName,
  initialNote,
}: SendConnectionModalProps) {
  const [includeNote, setIncludeNote] = useState(Boolean(initialNote));
  const [note, setNote] = useState(initialNote ? initialNote.slice(0, 300) : "");
  const [isSending, setIsSending] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    isSessionExpired: boolean;
    message: string;
    redirectUrl?: string;
  } | null>(null);

  // Reset errors and sync note when target or initialNote changes
  useEffect(() => {
    if (isOpen) {
      setErrorInfo(null);
    }
    if (target) {
      if (typeof initialNote === "string" && initialNote.trim()) {
        setNote(initialNote.slice(0, 300));
        setIncludeNote(true);
      } else {
        const defaultNote = `Hi ${target.firstName || target.name.split(" ")[0] || "there"}, I came across your profile and work at ${
          target.company || "your company"
        }. Would love to connect!`;
        setNote(defaultNote.slice(0, 300));
        setIncludeNote(false); // Default to simple connection request without a note
      }
    }
  }, [target, initialNote]);

  const activeNote = note;

  const handleSend = async (sendWithNote: boolean) => {
    if (!target) return;

    if (!target.linkedinUrl) {
      toast.error("This lead does not have a valid LinkedIn profile URL.");
      return;
    }

    setIsSending(true);
    setErrorInfo(null);

    try {
      const res = await fetch("/api/linkedin/send-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrl: target.linkedinUrl,
          leadId: target.id,
          enrollmentId: target.enrollmentId,
          campaignId: target.campaignId,
          note: sendWithNote ? activeNote.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const isAuthError =
          data.requiresAccountConnection === true || data.requiresReconnect === true;

        const errorMessage = data.error || (
          isAuthError
            ? "LinkedIn rejected the current account session. Reconnect your account to refresh credentials."
            : "Connection request sending failed. Please check the profile or try again."
        );

        setErrorInfo({
          isSessionExpired: isAuthError,
          message: errorMessage,
          redirectUrl: isAuthError
            ? data.redirectUrl || "/dashboard/accounts?reconnect=true"
            : undefined,
        });

        if (isAuthError) {
          toast.error(errorMessage, {
            duration: 8000,
            action: {
              label: "Reconnect Now",
              onClick: () => {
                window.location.href = data.redirectUrl || "/dashboard/accounts?reconnect=true";
              },
            },
          });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      if (data.status === "already_connected") {
        toast.info(data.message || `You are already connected with ${target.name}.`);
      } else if (data.status === "already_pending") {
        toast.info(data.message || `Connection request is already pending for ${target.name}.`);
      } else {
        toast.success(`Connection request sent to ${target.name}!`, {
          description: data.senderAccountName
            ? `Sent from ${data.senderAccountName}`
            : undefined,
        });
      }

      onSuccess?.(target.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to LinkedIn automation service.";
      setErrorInfo({
        isSessionExpired: false,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSending ? onClose : undefined}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>Send Connection Request</span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Connect directly on LinkedIn from your account
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {target.firstName?.[0] || target.name?.[0] || "L"}
                  {target.lastName?.[0] || ""}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {target.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {target.title} {target.company ? `• ${target.company}` : ""}
                  </p>
                </div>
              </div>

              <a
                href={target.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0a66c2] hover:underline shrink-0"
              >
                <span>Profile</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Account Sender Note */}
            {senderAccountName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Sending from connected account: <strong>{senderAccountName}</strong>
                </span>
              </div>
            )}

            {/* Error Message Banners */}
            {errorInfo?.isSessionExpired && (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                      LinkedIn Account Needs Reconnection
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
                      {errorInfo.message}
                    </p>
                    <p className="text-[11px] text-red-600/80 dark:text-red-400/80 leading-normal pt-0.5">
                      Reconnect using the <strong>Paste Cookies</strong> tab to refresh your LinkedIn credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 pl-11">
                  <a
                    href={errorInfo.redirectUrl || "/dashboard/accounts?reconnect=true"}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reconnect LinkedIn Account</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setErrorInfo(null)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/40 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {errorInfo && !errorInfo.isSessionExpired && (
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Connection Request Sending Failed
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      {errorInfo.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setErrorInfo(null)}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    Dismiss & Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Note Options Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNote}
                    onChange={(e) => setIncludeNote(e.target.checked)}
                    className="rounded border-neutral-300 text-[#0a66c2] focus:ring-[#0a66c2] h-3.5 w-3.5"
                  />
                  <MessageSquare className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Add personalized invitation note</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIncludeNote(!includeNote)}
                  className="text-[11px] text-[#0a66c2] dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  {includeNote ? "Send without note" : "Add note"}
                </button>
              </div>

              {includeNote && (
                <div className="space-y-1.5 pt-1">
                  <textarea
                    rows={3}
                    value={activeNote}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={300}
                    placeholder="Add an optional personalized note to introduce yourself..."
                    className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 resize-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Keep notes under 300 characters
                    </span>
                    <span>{activeNote.length} / 300</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              {includeNote && (
                <button
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={isSending}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
                >
                  Skip Note
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSend(includeNote && Boolean(activeNote.trim()))}
                disabled={isSending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {includeNote && activeNote.trim()
                        ? "Send with Note"
                        : "Send Connection Request"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
