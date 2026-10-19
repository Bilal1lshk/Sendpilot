"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Tag, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { floatingBarVariants } from "@/lib/motion";

interface LeadSelectionToolbarProps {
  selectedCount: number;
  availableGroups: string[];
  onEnrollInCampaign: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onAssignGroupSuccess: () => void;
  selectedLeadIds: string[];
}

export function LeadSelectionToolbar({
  selectedCount,
  availableGroups,
  onEnrollInCampaign,
  onDeleteSelected,
  onClearSelection,
  onAssignGroupSuccess,
  selectedLeadIds,
}: LeadSelectionToolbarProps) {
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignGroup = async (targetGroup: string) => {
    const groupName = targetGroup.trim();
    setIsAssigning(true);
    try {
      const res = await fetch("/api/leads/assign-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedLeadIds, group: groupName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Assigned leads to "${groupName}"`);
        setShowGroupPicker(false);
        setGroupInput("");
        onAssignGroupSuccess();
      } else {
        toast.error(data.error || "Failed to assign group");
      }
    } catch {
      toast.error("Network error while assigning group");
    } finally {
      setIsAssigning(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={floatingBarVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-medium"
      >
        <span className="font-semibold">{selectedCount} leads selected</span>
        <div className="h-4 w-px bg-neutral-700 dark:bg-neutral-300" />

        {/* Assign to Group */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGroupPicker((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white dark:text-neutral-600 dark:hover:text-neutral-900 font-semibold cursor-pointer transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Assign group</span>
          </button>

          {showGroupPicker && (
            <div className="absolute bottom-full mb-2 left-0 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 shadow-xl text-neutral-900 dark:text-neutral-100 z-50 space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Assign to Group
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder="Type group name..."
                  className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:outline-none focus:border-palm-leaf-500 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && groupInput.trim()) {
                      e.preventDefault();
                      handleAssignGroup(groupInput);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isAssigning || !groupInput.trim()}
                  onClick={() => handleAssignGroup(groupInput)}
                  className="px-2 py-1 rounded-lg bg-palm-leaf-600 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </button>
              </div>

              {availableGroups.length > 0 && (
                <div className="pt-1.5 border-t border-neutral-100 dark:border-neutral-800 space-y-1 max-h-32 overflow-y-auto">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Existing groups:</span>
                  {availableGroups.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleAssignGroup(g)}
                      className="w-full text-left px-2 py-1 rounded-md text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium flex items-center justify-between"
                    >
                      <span className="truncate">{g}</span>
                      <span className="text-[10px] text-neutral-400">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enroll in campaign */}
        <button
          type="button"
          onClick={onEnrollInCampaign}
          className="inline-flex items-center gap-1.5 text-palm-leaf-400 hover:text-palm-leaf-300 dark:text-palm-leaf-600 dark:hover:text-palm-leaf-700 cursor-pointer font-semibold transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Enroll in campaign</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDeleteSelected}
          className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="text-neutral-400 hover:text-white dark:hover:text-neutral-900 ml-1"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
