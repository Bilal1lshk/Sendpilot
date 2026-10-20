"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Mail, MapPin, Tag, UserPlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { drawerVariants } from "@/lib/motion";
import { PIPELINE_STAGES } from "@/types/pipeline";

interface LeadDetailsDrawerProps {
  lead: any | null;
  onClose: () => void;
  availableGroups: string[];
  onLeadUpdated: () => void;
  onSendConnection: (lead: any) => void;
}

export function LeadDetailsDrawer({
  lead,
  onClose,
  availableGroups,
  onLeadUpdated,
  onSendConnection,
}: LeadDetailsDrawerProps) {
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  if (!lead) return null;

  const name =
    lead.name ||
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
    "Lead";
  const initials = (name[0] || "L").toUpperCase();

  const handleUpdateGroup = async (groupName: string) => {
    setIsUpdatingGroup(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: groupName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(groupName ? `Assigned to "${groupName}"` : "Removed from group");
        setIsEditingGroup(false);
        onLeadUpdated();
      } else {
        toast.error(data.error || "Failed to update group");
      }
    } catch {
      toast.error("Network error while updating lead group");
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
        />

        <motion.div
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {[lead.title || lead.jobTitle, lead.company].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Details Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {lead.linkedinUrl && (
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[#0a66c2] hover:bg-neutral-50 dark:hover:bg-neutral-800 font-semibold"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>LinkedIn Profile</span>
                </a>
              )}

              {lead.email && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <Mail className="h-3 w-3" />
                  <span>{lead.email}</span>
                </div>
              )}

              {lead.location && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <MapPin className="h-3 w-3" />
                  <span>{lead.location}</span>
                </div>
              )}
            </div>

            {/* Named Lead Group section */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-palm-leaf-600" />
                  <span>Named Lead Group</span>
                </span>
                {!isEditingGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup(lead.group || "");
                      setIsEditingGroup(true);
                    }}
                    className="text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                  >
                    {lead.group ? "Change Group" : "+ Assign Group"}
                  </button>
                )}
              </div>

              {!isEditingGroup ? (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {lead.group ? (
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {lead.group}
                    </span>
                  ) : (
                    <span className="italic text-neutral-400">Not assigned to any group</span>
                  )}
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    list="drawer-groups"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    placeholder="Enter or select group name..."
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
                  />
                  <datalist id="drawer-groups">
                    {availableGroups.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingGroup(false)}
                      className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingGroup}
                      onClick={() => handleUpdateGroup(selectedGroup)}
                      className="px-3 py-1 rounded-lg bg-palm-leaf-600 text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {isUpdatingGroup ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Stage */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider block">
                Pipeline Stage
              </span>
              <div className="flex items-center justify-between relative py-2">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 dark:bg-neutral-800 z-0" />
                {PIPELINE_STAGES.map((st: string) => {
                  const isCurrent = (lead.pipeline || lead.status || "new") === st;
                  return (
                    <div key={st} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-palm-leaf-600 ring-4 ring-palm-leaf-100 dark:ring-palm-leaf-950"
                            : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                      />
                      <span className="text-[9px] text-neutral-400 mt-1">{st}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ICP Score Card */}
            <div className="p-4 rounded-xl border border-palm-leaf-200/80 dark:border-palm-leaf-900/40 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  ICP Qualification Score
                </span>
                <span className="text-sm font-bold text-palm-leaf-700 dark:text-palm-leaf-300">
                  {lead.icpScore ?? 0}%
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Match evaluated against high-growth B2B decision makers.
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onSendConnection(lead)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Send Connection Request</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
