"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { pageVariants, cardVariants } from "@/lib/motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLeadsIfNeeded,
  fetchCampaignsIfNeeded,
  fetchOverviewIfNeeded,
} from "@/store/slices/databaseSlice";
import { SendConnectionModal, SendConnectionTarget } from "@/components/dashboard/SendConnectionModal";
import { LeadGroupManager, LeadGroupItem } from "@/components/leads/LeadGroupManager";
import { LeadSearchAndFilters } from "@/components/leads/LeadSearchAndFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { LeadSelectionToolbar } from "@/components/leads/LeadSelectionToolbar";
import { LeadImportDialog } from "@/components/leads/LeadImportDialog";
import { LeadDetailsDrawer } from "@/components/leads/LeadDetailsDrawer";
import { Send, CheckCircle2, Loader2, Plus, Check, X } from "lucide-react";
import Link from "next/link";
import { PIPELINE_STAGES } from "@/types/pipeline";

export default function LeadDatabasePage() {
  const dispatch = useAppDispatch();
  const { items: storeLeads, loading: storeLoading, loaded: storeLoaded } = useAppSelector(
    (state) => state.database.leads
  );
  const { items: storeCampaigns } = useAppSelector((state) => state.database.campaigns);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Selection & UI modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [connectTarget, setConnectTarget] = useState<SendConnectionTarget | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<LeadGroupItem[]>([]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/leads/groups");
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    dispatch(fetchLeadsIfNeeded());
    dispatch(fetchCampaignsIfNeeded());
    fetchGroups();
  }, [dispatch, fetchGroups]);

  // Derived filtered leads
  const filteredLeads = useMemo(() => {
    return storeLeads.filter((lead) => {
      // Group filter
      if (selectedGroup !== null && lead.group !== selectedGroup) {
        return false;
      }

      // Stage filter
      if (stageFilter !== "All") {
        const leadStage = lead.status || "new";
        if (leadStage.toLowerCase() !== stageFilter.toLowerCase()) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`).toLowerCase();
        const company = (lead.company || "").toLowerCase();
        const title = (lead.title || lead.jobTitle || "").toLowerCase();
        const email = (lead.email || "").toLowerCase();
        if (!name.includes(q) && !company.includes(q) && !title.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [storeLeads, selectedGroup, stageFilter, search]);

  const availableGroupNames = useMemo(() => groups.map((g) => g.name), [groups]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected leads from database?`)) return;

    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${data.deletedCount} leads`);
        setSelectedIds([]);
        dispatch(fetchLeadsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
        fetchGroups();
      } else {
        toast.error(data.error || "Failed to delete leads");
      }
    } catch {
      toast.error("Network error while deleting leads");
    }
  };

  const handleEnrollSelectedLeads = async () => {
    if (!selectedCampaignId) {
      toast.error("Please select a target campaign");
      return;
    }
    if (selectedIds.length === 0) return;

    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Enrolled ${data.enrolled} leads!${
            data.alreadyEnrolled ? ` (${data.alreadyEnrolled} already enrolled)` : ""
          }`
        );
        setShowEnrollModal(false);
        setSelectedIds([]);
        dispatch(fetchLeadsIfNeeded({ force: true }));
        dispatch(fetchCampaignsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
      } else {
        toast.error(data.error || "Failed to enroll leads");
      }
    } catch {
      toast.error("Network error while enrolling leads");
    } finally {
      setIsEnrolling(false);
    }
  };

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
            Leads Database & Prospects
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Organize prospects into named groups and enroll them directly into multi-touch campaigns.
          </p>
        </div>
      </motion.div>

      {/* Named Lead Groups Manager */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
        <LeadGroupManager
          groups={groups}
          selectedGroup={selectedGroup}
          totalLeadsCount={storeLeads.length}
          onSelectGroup={(g) => setSelectedGroup(g)}
          onGroupsChanged={() => {
            fetchGroups();
            dispatch(fetchLeadsIfNeeded({ force: true }));
          }}
        />
      </motion.div>

      {/* Search, Pipeline Filters, and Action Bar */}
      <motion.div variants={cardVariants}>
        <LeadSearchAndFilters
          searchQuery={search}
          onSearchChange={setSearch}
          selectedStage={stageFilter}
          onStageChange={setStageFilter}
          stages={["New", "Contacted", "In Sequence", "Replied", "Meeting"]}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filteredCount={filteredLeads.length}
          totalCount={storeLeads.length}
          onOpenImportCsv={() => setShowImportDialog(true)}
        />
      </motion.div>

      {/* VIEW: Table with Sticky Header & Rows */}
      {viewMode === "table" && (
        <motion.div variants={cardVariants}>
          <LeadTable
            leads={filteredLeads}
            selectedIds={selectedIds}
            isLoading={storeLoading && !storeLoaded}
            searchQuery={search}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClickRow={(lead) => setActiveLead(lead)}
            onAssignGroupClick={(lead, e) => {
              e.stopPropagation();
              setActiveLead(lead);
            }}
            onOpenImportCsv={() => setShowImportDialog(true)}
          />
        </motion.div>
      )}

      {/* VIEW: Kanban Pipeline */}
      {viewMode === "kanban" && (
        <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {["New", "Contacted", "In Sequence", "Replied", "Meeting"].map((stage) => {
            const stageLeads = filteredLeads.filter(
              (l) => (l.status || "new").toLowerCase() === stage.toLowerCase()
            );

            return (
              <div
                key={stage}
                className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 p-3 flex flex-col min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200/60 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>{stage}</span>
                  <span className="text-[10px] font-normal text-neutral-400">{stageLeads.length}</span>
                </div>

                <div className="space-y-2 flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-[11px] text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setActiveLead(lead)}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-palm-leaf-400 cursor-pointer transition-all"
                      >
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Lead"}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {[lead.title || lead.jobTitle, lead.company].filter(Boolean).join(" • ")}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-palm-leaf-700 font-semibold">{lead.icpScore ?? 0}% ICP</span>
                          {lead.group && (
                            <span className="bg-palm-leaf-50 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 px-1.5 py-0.2 rounded font-medium truncate max-w-[100px]">
                              {lead.group}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Floating Bulk Action Bar */}
      <LeadSelectionToolbar
        selectedCount={selectedIds.length}
        availableGroups={availableGroupNames}
        selectedLeadIds={selectedIds}
        onEnrollInCampaign={() => {
          if (storeCampaigns.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(storeCampaigns[0].id);
          }
          setShowEnrollModal(true);
        }}
        onDeleteSelected={handleDeleteSelected}
        onClearSelection={() => setSelectedIds([])}
        onAssignGroupSuccess={() => {
          fetchGroups();
          dispatch(fetchLeadsIfNeeded({ force: true }));
        }}
      />

      {/* CSV Import Dialog */}
      <LeadImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        availableGroups={availableGroupNames}
        onImportSuccess={() => {
          fetchGroups();
          dispatch(fetchLeadsIfNeeded({ force: true }));
          dispatch(fetchOverviewIfNeeded({ force: true }));
        }}
      />

      {/* Lead Details Drawer */}
      <LeadDetailsDrawer
        lead={activeLead}
        onClose={() => setActiveLead(null)}
        availableGroups={availableGroupNames}
        onLeadUpdated={() => {
          fetchGroups();
          dispatch(fetchLeadsIfNeeded({ force: true }));
        }}
        onSendConnection={(lead) => {
          setConnectTarget({
            id: lead.id,
            name: lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
            title: lead.title || lead.jobTitle || "",
            company: lead.company || "",
            linkedinUrl: lead.linkedinUrl || "https://linkedin.com",
          });
        }}
      />

      {/* Send Connection Request Modal */}
      <SendConnectionModal
        isOpen={Boolean(connectTarget)}
        target={connectTarget}
        onClose={() => setConnectTarget(null)}
        senderAccountName="LinkedIn Connected Account"
        onSuccess={() => {
          toast.success("Connection request dispatched!");
          dispatch(fetchLeadsIfNeeded({ force: true }));
        }}
      />

      {/* Campaign Enrollment Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEnrollModal(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 flex items-center justify-center">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Enroll Prospects in Outreach Sequence
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Queue {selectedIds.length} selected prospects for automated touches.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Campaign Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Select Outreach Campaign:
                  </span>
                  <Link
                    href="/dashboard/campaigns"
                    className="text-[11px] font-medium text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                  >
                    + New Campaign
                  </Link>
                </div>

                {storeCampaigns.length === 0 ? (
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
                    <p className="text-xs text-neutral-500">No campaigns found yet.</p>
                    <Link
                      href="/dashboard/campaigns"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-600 text-white text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Outreach Campaign</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {storeCampaigns.map((camp) => {
                      const isSelected = selectedCampaignId === camp.id;
                      return (
                        <div
                          key={camp.id}
                          onClick={() => setSelectedCampaignId(camp.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-palm-leaf-600 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/40 ring-1 ring-palm-leaf-500/20"
                              : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-palm-leaf-600 bg-palm-leaf-600 text-white"
                                  : "border-neutral-300 dark:border-neutral-700"
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                {camp.name}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {camp.sentCount} / {camp.leadsCount} sent • {camp.acceptRate}% accept rate
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              camp.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                            }`}
                          >
                            {camp.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Leads will be enrolled into step 1 of the sequence and queued for sending according to daily account caps.
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isEnrolling || !selectedCampaignId || storeCampaigns.length === 0}
                  onClick={handleEnrollSelectedLeads}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enrolling Leads...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Enroll {selectedIds.length} Leads</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
