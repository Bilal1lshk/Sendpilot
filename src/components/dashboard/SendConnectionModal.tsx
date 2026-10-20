"use client";

import { useState } from "react";
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
}

interface SendConnectionModalProps {
  target: SendConnectionTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
  senderAccountName?: string;
}

export function SendConnectionModal({
  target,
  isOpen,
  onClose,
  onSuccess,
  senderAccountName,
}: SendConnectionModalProps) {
  const [includeNote, setIncludeNote] = useState(true);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Initialize or reset note when modal opens for a new target
  const defaultNote = target
    ? `Hi ${target.firstName || target.name.split(" ")[0] || "there"}, I came across your profile and work at ${
        target.company || "your company"
      }. Would love to connect!`
    : "";

  const activeNote = note !== "" ? note : defaultNote;

  const handleSend = async (sendWithNote: boolean) => {
    if (!target) return;

    if (!target.linkedinUrl) {
      toast.error("This lead does not have a valid LinkedIn profile URL.");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/linkedin/send-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrl: target.linkedinUrl,
          leadId: target.id,
          note: sendWithNote ? activeNote.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.requiresAccountConnection || data.requiresReconnect || data.error?.toLowerCase().includes("reconnect")) {
          toast.error(
            data.error || "Your LinkedIn account authorization has expired. Please reconnect your account to continue.",
            {
              action: {
                label: "Reconnect Now",
                onClick: () => {
                  window.location.href = data.redirectUrl || "/dashboard/accounts?reconnect=true";
                },
              },
            }
          );
          setTimeout(() => {
            window.location.href = data.redirectUrl || "/dashboard/accounts?reconnect=true";
          }, 1500);
        } else {
          toast.error(data.error || "Failed to send connection request.");
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
      toast.error(
        err instanceof Error ? err.message : "Failed to connect to LinkedIn automation service."
      );
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

            {/* Note Options Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Personalized Invitation Note</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeNote(!includeNote)}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    {includeNote ? "Remove note" : "Add custom note"}
                  </button>
                </div>
              </div>

              {includeNote && (
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={activeNote}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={300}
                    placeholder="Add an optional personalized note to increase acceptance rate..."
                    className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 resize-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Profiles with custom notes have ~40% higher acceptance
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

              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={isSending}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
              >
                Send without note
              </button>

              <button
                type="button"
                onClick={() => handleSend(includeNote)}
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
                    <span>Send Connection Request</span>
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
