"use client";

import { useState } from "react";
import { Plus, Tag, Edit2, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface LeadGroupItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  leadCount: number;
}

interface LeadGroupManagerProps {
  groups: LeadGroupItem[];
  selectedGroup: string | null;
  totalLeadsCount: number;
  onSelectGroup: (groupName: string | null) => void;
  onGroupsChanged: () => void;
}

export function LeadGroupManager({
  groups,
  selectedGroup,
  totalLeadsCount,
  onSelectGroup,
  onGroupsChanged,
}: LeadGroupManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingGroup, setEditingGroup] = useState<LeadGroupItem | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: newGroupDesc.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Created lead group "${name}"`);
        setNewGroupName("");
        setNewGroupDesc("");
        setShowCreateModal(false);
        onGroupsChanged();
        onSelectGroup(name);
      } else {
        toast.error(data.error || "Failed to create group");
      }
    } catch {
      toast.error("Network error while creating group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const nextName = editName.trim();
    if (!nextName || nextName === editingGroup.name) {
      setEditingGroup(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: editingGroup.name, newName: nextName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Renamed group to "${nextName}"`);
        if (selectedGroup === editingGroup.name) {
          onSelectGroup(nextName);
        }
        setEditingGroup(null);
        onGroupsChanged();
      } else {
        toast.error(data.error || "Failed to rename group");
      }
    } catch {
      toast.error("Network error while renaming group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: LeadGroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete group "${group.name}"? Leads will remain in your database but be unassigned.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads/groups?name=${encodeURIComponent(group.name)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted group "${group.name}"`);
        if (selectedGroup === group.name) {
          onSelectGroup(null);
        }
        onGroupsChanged();
      } else {
        toast.error(data.error || "Failed to delete group");
      }
    } catch {
      toast.error("Network error while deleting group");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <Tag className="h-3.5 w-3.5 text-palm-leaf-600" />
          <span>Lead Groups</span>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>New Group</span>
        </button>
      </div>

      {/* Pill selection row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectGroup(null)}
          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            selectedGroup === null
              ? "bg-palm-leaf-600 text-white shadow-xs"
              : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
          }`}
        >
          All Leads ({totalLeadsCount})
        </button>

        {groups.map((group) => {
          const isSelected = selectedGroup === group.name;
          return (
            <div
              key={group.id}
              onClick={() => onSelectGroup(isSelected ? null : group.name)}
              className={`group/pill inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-palm-leaf-600 text-white shadow-xs"
                  : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
              }`}
            >
              <span>{group.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {group.leadCount}
              </span>

              {/* Edit/Delete mini buttons on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingGroup(group);
                  setEditName(group.name);
                }}
                className={`p-0.5 rounded opacity-0 group-hover/pill:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 ${
                  isSelected ? "text-white" : "text-neutral-400 hover:text-neutral-700"
                }`}
                title="Rename group"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteGroup(group, e)}
                className={`p-0.5 rounded opacity-0 group-hover/pill:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 ${
                  isSelected ? "text-white" : "text-neutral-400 hover:text-red-500"
                }`}
                title="Delete group"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Create Named Lead Group</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. CEOs, Series A Founders, Marketing Directors"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Notes about this audience target"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newGroupName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Rename Group &quot;{editingGroup.name}&quot;
              </h3>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRenameGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  New Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950 px-3 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
