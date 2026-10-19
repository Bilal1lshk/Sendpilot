"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  ExternalLink,
  CheckCircle2,
  X,
  Tag,
  ArrowRight,
  Filter,
  Check,
  UserCheck,
  Sparkles,
  Download,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { LeadItem, EnrollmentMode, LeadGroupItem } from "./types";
import { toast } from "sonner";

interface Step1SelectLeadsProps {
  databaseLeads: LeadItem[];
  selectedLeadIds: string[];
  onSelectionChange: (ids: string[]) => void;
  enrollmentMode: EnrollmentMode;
  onEnrollmentModeChange: (mode: EnrollmentMode) => void;
  onProceed: () => void;
}

export function Step1SelectLeads({
  databaseLeads,
  selectedLeadIds,
  onSelectionChange,
  enrollmentMode,
  onEnrollmentModeChange,
  onProceed,
}: Step1SelectLeadsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [groups, setGroups] = useState<LeadGroupItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Fetch groups
  useEffect(() => {
    let isMounted = true;
    async function fetchGroups() {
      setIsLoadingGroups(true);
      try {
        const res = await fetch("/api/leads/groups");
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.groups)) {
          setGroups(data.groups);
        }
      } catch {
        // Fallback: derive groups from databaseLeads
      } finally {
        if (isMounted) setIsLoadingGroups(false);
      }
    }
    fetchGroups();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute available group counts including unassigned
  const groupStats = useMemo(() => {
    const counts: Record<string, number> = { all: databaseLeads.length, unassigned: 0 };
    databaseLeads.forEach((l) => {
      const g = (l.group || "").trim();
      if (!g) {
        counts.unassigned = (counts.unassigned || 0) + 1;
      } else {
        counts[g] = (counts[g] || 0) + 1;
      }
    });
    return counts;
  }, [databaseLeads]);

  // Distinct groups list
  const availableGroupNames = useMemo(() => {
    const names = new Set<string>();
    groups.forEach((g) => names.add(g.name));
    databaseLeads.forEach((l) => {
      if (l.group && l.group.trim()) names.add(l.group.trim());
    });
    return Array.from(names);
  }, [groups, databaseLeads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return databaseLeads.filter((lead) => {
      // Group filter
      if (selectedGroupFilter !== "all") {
        if (selectedGroupFilter === "unassigned") {
          if (lead.group && lead.group.trim()) return false;
        } else {
          if ((lead.group || "").trim().toLowerCase() !== selectedGroupFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // Stage filter
      if (stageFilter !== "all" && lead.stage) {
        if (lead.stage.toLowerCase() !== stageFilter.toLowerCase()) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`).toLowerCase();
        const company = (lead.company || "").toLowerCase();
        const title = (lead.title || lead.jobTitle || "").toLowerCase();
        const location = (lead.location || "").toLowerCase();
        const grp = (lead.group || "").toLowerCase();
        if (
          !name.includes(q) &&
          !company.includes(q) &&
          !title.includes(q) &&
          !location.includes(q) &&
          !grp.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [databaseLeads, selectedGroupFilter, stageFilter, searchQuery]);

  const selectedSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);

  // Handle toggling single lead
  const toggleLead = (id: string) => {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedLeadIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedLeadIds, id]);
    }
  };

  // Select all filtered leads
  const handleSelectAllFiltered = () => {
    const newIds = new Set(selectedLeadIds);
    filteredLeads.forEach((l) => newIds.add(l.id));
    onSelectionChange(Array.from(newIds));
    toast.success(`Selected ${filteredLeads.length} filtered leads`);
  };

  // Deselect all filtered leads
  const handleDeselectFiltered = () => {
    const filteredIdSet = new Set(filteredLeads.map((l) => l.id));
    const nextIds = selectedLeadIds.filter((id) => !filteredIdSet.has(id));
    onSelectionChange(nextIds);
    toast.success(`Removed ${filteredLeads.length} leads from selection`);
  };

  // Clear entire selection
  const handleClearAll = () => {
    onSelectionChange([]);
    toast.info("Cleared lead selection");
  };

  // Select all in current group
  const handleSelectGroup = (groupName: string) => {
    const groupLeads = databaseLeads.filter((l) => {
      if (groupName === "unassigned") return !l.group || !l.group.trim();
      return (l.group || "").trim().toLowerCase() === groupName.toLowerCase();
    });
    const newIds = new Set(selectedLeadIds);
    groupLeads.forEach((l) => newIds.add(l.id));
    onSelectionChange(Array.from(newIds));
    toast.success(`Added ${groupLeads.length} leads from "${groupName}" to campaign`);
  };

  // Check if all filtered are selected
  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedSet.has(l.id));

  // Validate on proceed
  const handleContinue = () => {
    if (enrollmentMode === "specific" && selectedLeadIds.length === 0) {
      toast.error("Please select at least 1 lead to enroll, or choose 'Enroll Later' to create a draft.");
      return;
    }
    onProceed();
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 uppercase font-bold tracking-wider">
            Step 1 of 3 • Prospect Targeting
          </span>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Select Leads for Campaign
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Choose which prospects will be enrolled into this automated outreach sequence.
          </p>
        </div>

        {/* Quick Database / Extractor links */}
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/extractor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs"
            title="Extract new prospects from LinkedIn in a new tab"
          >
            <Sparkles className="h-3 w-3 text-palm-leaf-600" />
            <span>Extract Leads</span>
            <ExternalLink className="h-2.5 w-2.5 text-neutral-400" />
          </a>
          <a
            href="/dashboard/leads"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors shadow-xs"
            title="Import CSV or manage database in a new tab"
          >
            <Download className="h-3 w-3 text-neutral-500" />
            <span>Import CSV</span>
            <ExternalLink className="h-2.5 w-2.5 text-neutral-400" />
          </a>
        </div>
      </div>

      {/* Enrollment Mode Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onEnrollmentModeChange("specific")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            enrollmentMode === "specific"
              ? "border-palm-leaf-600 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/20 text-palm-leaf-950 dark:text-palm-leaf-200 ring-2 ring-palm-leaf-500/20 shadow-xs"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">Specific Leads</span>
            {enrollmentMode === "specific" ? (
              <CheckCircle2 className="h-4 w-4 text-palm-leaf-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            Handpick targeted prospects ({selectedLeadIds.length} selected)
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            onEnrollmentModeChange("all");
            onSelectionChange(databaseLeads.map((l) => l.id));
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            enrollmentMode === "all"
              ? "border-palm-leaf-600 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/20 text-palm-leaf-950 dark:text-palm-leaf-200 ring-2 ring-palm-leaf-500/20 shadow-xs"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">All Database Leads</span>
            {enrollmentMode === "all" ? (
              <CheckCircle2 className="h-4 w-4 text-palm-leaf-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            Enroll all {databaseLeads.length} leads currently in database
          </p>
        </button>

        <button
          type="button"
          onClick={() => onEnrollmentModeChange("later")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            enrollmentMode === "later"
              ? "border-palm-leaf-600 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/20 text-palm-leaf-950 dark:text-palm-leaf-200 ring-2 ring-palm-leaf-500/20 shadow-xs"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">Enroll Later (Draft)</span>
            {enrollmentMode === "later" ? (
              <CheckCircle2 className="h-4 w-4 text-palm-leaf-600" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 leading-tight">
            Build sequence flow first, assign leads to campaign later
          </p>
        </button>
      </div>

      {enrollmentMode === "later" ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Campaign Will Be Created As Draft
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            You can proceed to design the automation flow steps. Once saved, you can enroll leads anytime from the Campaigns dashboard or Lead database.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Named Lead Groups Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-palm-leaf-600" />
                <span>Filter by Named Lead Group:</span>
              </span>
              {selectedGroupFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedGroupFilter("all")}
                  className="text-[11px] font-medium text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                >
                  View All Leads
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedGroupFilter === "all"
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                    : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-700"
                }`}
              >
                <span>All Leads</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 dark:bg-white/20">
                  {databaseLeads.length}
                </span>
              </button>

              {availableGroupNames.map((groupName) => {
                const isSelected = selectedGroupFilter.toLowerCase() === groupName.toLowerCase();
                const count = groupStats[groupName] || 0;
                return (
                  <button
                    key={groupName}
                    type="button"
                    onClick={() => setSelectedGroupFilter(groupName)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-palm-leaf-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700"
                    }`}
                  >
                    <span>{groupName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 dark:bg-white/20">
                      {count}
                    </span>
                  </button>
                );
              })}

              {groupStats.unassigned > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGroupFilter("unassigned")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedGroupFilter === "unassigned"
                      ? "bg-neutral-700 text-white dark:bg-neutral-300 dark:text-neutral-900 shadow-xs"
                      : "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500 hover:bg-neutral-200/60"
                  }`}
                >
                  <span>Unassigned</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                    {groupStats.unassigned}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar & Bulk Selection Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by name, job title, company, or location..."
                className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:border-palm-leaf-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Group quick add button if group is selected */}
              {selectedGroupFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => handleSelectGroup(selectedGroupFilter)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 bg-palm-leaf-50 dark:bg-palm-leaf-950/50 hover:bg-palm-leaf-100 px-2.5 py-1 rounded-lg border border-palm-leaf-200 dark:border-palm-leaf-800 transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Select All {selectedGroupFilter}</span>
                </button>
              )}

              <button
                type="button"
                onClick={allFilteredSelected ? handleDeselectFiltered : handleSelectAllFiltered}
                className="text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer"
              >
                {allFilteredSelected ? "Deselect Filtered" : `Select All Filtered (${filteredLeads.length})`}
              </button>

              <span className="text-neutral-300 dark:text-neutral-700">•</span>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={selectedLeadIds.length === 0}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 disabled:opacity-40 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Selection Status Banner */}
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-bold text-neutral-900 dark:text-neutral-100">
                <UserCheck className="h-3.5 w-3.5 text-palm-leaf-600" />
                <span>{selectedLeadIds.length}</span>
              </span>
              <span className="text-neutral-500">
                prospects selected for this campaign out of {databaseLeads.length} available
              </span>
            </div>

            {selectedLeadIds.length > 0 && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
                Ready to enroll
              </span>
            )}
          </div>

          {/* Leads Table / List */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
            {databaseLeads.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  No Leads in Your Database
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Extract prospects with the AI Lead Extractor or import a CSV file to begin your campaign.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href="/dashboard/extractor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Extract Leads</span>
                  </a>
                  <a
                    href="/dashboard/leads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span>Import CSV</span>
                  </a>
                </div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No prospects match your current search or group filters.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {filteredLeads.map((lead) => {
                  const isChecked = selectedSet.has(lead.id);
                  const displayName =
                    lead.name ||
                    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
                    "Lead";
                  const initial = (displayName || "L")[0].toUpperCase();

                  return (
                    <div
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={`flex items-center justify-between gap-3 p-3 transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-palm-leaf-50/30 dark:bg-palm-leaf-950/15"
                          : "hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by row onClick
                          className="rounded border-neutral-300 text-palm-leaf-600 focus:ring-palm-leaf-500 h-4 w-4 shrink-0"
                        />

                        <div className="h-8 w-8 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {displayName}
                            </span>
                            {lead.group && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-palm-leaf-50 text-palm-leaf-700 dark:bg-palm-leaf-950/60 dark:text-palm-leaf-300 px-2 py-0.2 rounded-full border border-palm-leaf-200/50 dark:border-palm-leaf-800/50">
                                <Tag className="h-2.5 w-2.5" />
                                {lead.group}
                              </span>
                            )}
                            {lead.linkedinUrl && (
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-neutral-400 hover:text-palm-leaf-600 transition-colors"
                                title="Open LinkedIn Profile"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          <p className="text-[11px] text-neutral-500 truncate">
                            {[lead.title || lead.jobTitle, lead.company, lead.location]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isChecked ? (
                          <span className="text-[11px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                            Click to select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
        <div className="text-xs text-neutral-500">
          {enrollmentMode === "specific" ? (
            <span>
              <strong className="text-neutral-900 dark:text-neutral-100">{selectedLeadIds.length}</strong>{" "}
              leads ready for enrollment
            </span>
          ) : enrollmentMode === "all" ? (
            <span>
              All <strong className="text-neutral-900 dark:text-neutral-100">{databaseLeads.length}</strong>{" "}
              database leads selected
            </span>
          ) : (
            <span>Creating draft sequence (0 leads)</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <span>Continue to Automation Flow</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
