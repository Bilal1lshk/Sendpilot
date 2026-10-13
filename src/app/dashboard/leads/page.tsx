"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  X,
  Mail,
  ExternalLink,
  ChevronRight,
  Send,
  Trash2,
  Tag,
  CheckCircle2,
  Table as TableIcon,
  Kanban,
  Upload,
  Users,
  Loader2,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { pageVariants, cardVariants, drawerVariants, floatingBarVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

import { toast } from "sonner";

export interface LeadItem {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  score: "High" | "Medium" | "Low";
  icpScore: number;
  icpReason: string;
  pipeline: "New" | "Contacted" | "Accepted" | "Replied" | "Meeting";
  campaign: string;
  linkedinUrl?: string;
  timeline: Array<{ time: string; event: string }>;
}

const SAMPLE_DEMO_LEADS: LeadItem[] = [
  {
    id: "sample_1",
    name: "Marcus Vance",
    title: "VP of Product",
    company: "Linear Dynamics",
    email: "marcus@lineardynamics.io",
    score: "High",
    icpScore: 92,
    icpReason: "Matches Seed-stage B2B SaaS criteria with 15+ engineers.",
    pipeline: "Accepted",
    campaign: "SaaS Founders Seed & Series A",
    timeline: [
      { time: "Yesterday, 4:10 PM", event: "Connection request accepted by Marcus" },
      { time: "2 days ago, 9:30 AM", event: "Sent personalized icebreaker step 1" },
    ],
  },
  {
    id: "sample_2",
    name: "Sarah Chen",
    title: "Head of Growth",
    company: "Stripe",
    email: "sarah.chen@stripe.com",
    score: "High",
    icpScore: 95,
    icpReason: "Decision maker for outbound acquisition tooling.",
    pipeline: "Replied",
    campaign: "SaaS Founders Seed & Series A",
    timeline: [
      { time: "Today, 11:20 AM", event: "Replied: 'Would love to see a demo next week.'" },
      { time: "Yesterday, 2:00 PM", event: "Connection accepted" },
    ],
  },
  {
    id: "sample_3",
    name: "Devon Reed",
    title: "Head of Marketing",
    company: "Retool Apps",
    email: "devon@retoolapps.com",
    score: "Medium",
    icpScore: 78,
    icpReason: "Marketing leader, evaluating integration partners.",
    pipeline: "Contacted",
    campaign: "VP Sales & RevOps Q4",
    timeline: [
      { time: "Today, 10:32 AM", event: "Connection request sent via Elena's profile" },
    ],
  },
  {
    id: "sample_4",
    name: "Elena Rostova",
    title: "Director of RevOps",
    company: "Scale HQ",
    email: "elena@scalehq.io",
    score: "Low",
    icpScore: 64,
    icpReason: "Smaller outbound team size than ideal ICP.",
    pipeline: "New",
    campaign: "VP Sales & RevOps Q4",
    timeline: [
      { time: "3 days ago", event: "Imported via CSV file" },
    ],
  },
];

export default function LeadDatabasePage() {
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Real database leads
  const [leads, setLeads] = useState<LeadItem[]>([]);

  const fetchDatabaseLeads = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        const freshLeads: LeadItem[] = data.leads.map((l: any) => ({
          id: l.id,
          name: `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.name || "Prospect",
          title: l.jobTitle || l.title || "Decision Maker",
          company: l.company || "Enterprise",
          email: l.email || "",
          linkedinUrl: l.linkedinUrl || "",
          score: (Number(l.icpScore) >= 90 ? "High" : Number(l.icpScore) >= 75 ? "Medium" : "Low") as "High" | "Medium" | "Low",
          icpScore: Number(l.icpScore) || 85,
          icpReason: l.source ? `Imported via ${l.source}` : "Matches pipeline ICP qualification criteria.",
          pipeline: (l.status === "contacted" ? "Contacted" : l.status === "Accepted" ? "Accepted" : "New") as any,
          campaign: l.campaign || "Direct Import / LinkedIn",
          timeline: [
            { time: "Recently", event: "Saved to database" },
          ],
        }));
        setLeads(freshLeads);
      }
    } catch (err) {
      console.warn("Could not fetch database leads:", err);
      toast.error("Failed to load leads from database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseLeads();
  }, []);

  const handleClearAllLeads = async () => {
    if (!confirm("Are you sure you want to clear all leads from your database?")) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/leads", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLeads([]);
        setSelectedIds([]);
        setSelectedLead(null);
        toast.success("All leads removed from database");
      }
    } catch {
      toast.error("Failed to clear database leads");
    } finally {
      setIsClearing(false);
    }
  };

  const handleLoadSampleLeads = () => {
    setLeads(SAMPLE_DEMO_LEADS);
    toast.success("Loaded sample demo leads for preview");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase())
  );

  const PIPELINE_STAGES: ("New" | "Contacted" | "Accepted" | "Replied" | "Meeting")[] = [
    "New",
    "Contacted",
    "Accepted",
    "Replied",
    "Meeting",
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Lead database
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Unified contact profiles, qualification ICP scores, and stages.
          </p>
        </div>

        {/* View mode toggle & Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/extractor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Import / Scrape Leads</span>
          </Link>

          {leads.length > 0 ? (
            <button
              type="button"
              disabled={isClearing}
              onClick={handleClearAllLeads}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100/60 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isClearing ? "Clearing..." : "Clear Database"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLoadSampleLeads}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Load Demo Leads</span>
            </button>
          )}

          <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pipeline")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === "pipeline"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Pipeline</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:border-palm-leaf-500"
          />
        </div>
        <span className="text-xs text-neutral-400">
          {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* VIEW: Table with Sticky Header & Quiet Score Badges */}
      {viewMode === "table" && (
        <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={() => {
                        if (selectedIds.length === filteredLeads.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(filteredLeads.map((l) => l.id));
                        }
                      }}
                      className="rounded border-neutral-300"
                    />
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">ICP Score</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-palm-leaf-600" />
                        <span className="text-xs font-medium">Loading database leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3 px-4">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                          <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {search ? `No leads matching "${search}"` : "No Leads in Database Yet"}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {search
                            ? "Try checking your search terms or clearing the filter."
                            : "Your lead pipeline is currently clean. Extract real profiles from LinkedIn or import a CSV file to process real prospects."}
                        </p>
                        {!search && (
                          <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                            <Link
                              href="/dashboard/extractor"
                              className="px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs shadow-xs transition-colors"
                            >
                              Extract from LinkedIn
                            </Link>
                            <button
                              type="button"
                              onClick={handleLoadSampleLeads}
                              className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Load Demo Sample Leads
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isChecked = selectedIds.includes(lead.id);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                          isChecked ? "bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(lead.id)}
                            className="rounded border-neutral-300"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                            {lead.name}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {lead.title}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                          {lead.company}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              lead.score === "High"
                                ? "bg-palm-leaf-50 text-palm-leaf-800 dark:bg-palm-leaf-950 dark:text-palm-leaf-300"
                                : lead.score === "Medium"
                                ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {lead.score} ({lead.icpScore})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {lead.pipeline}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400">
                          {lead.campaign}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* VIEW: Pipeline Kanban View */}
      {viewMode === "pipeline" && (
        <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.pipeline === stage);

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
                      No leads in {stage}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <motion.div
                        key={lead.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-palm-leaf-400 cursor-pointer transition-all"
                      >
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {lead.name}
                        </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {lead.title} • {lead.company}
                      </p>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-palm-leaf-700 font-semibold">{lead.icpScore}% ICP</span>
                          <span className="text-neutral-400">{lead.score}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Floating Bulk Action Bar (Slides Up from Bottom) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            variants={floatingBarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-medium"
          >
            <span>{selectedIds.length} leads selected</span>
            <div className="h-4 w-px bg-neutral-700 dark:bg-neutral-300" />
            <button
              type="button"
              onClick={() => alert(`Enrolled ${selectedIds.length} leads into campaign`)}
              className="inline-flex items-center gap-1.5 text-palm-leaf-400 hover:text-palm-leaf-300"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enroll in campaign</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Drawer: Slides in from the right */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
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
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {selectedLead.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedLead.title} at {selectedLead.company}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Pipeline Horizontal Stepper with animated dot */}
                <div className="mt-5">
                  <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider block mb-2">
                    Pipeline Stage
                  </span>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 dark:bg-neutral-800 z-0" />
                    {PIPELINE_STAGES.map((st, i) => {
                      const isCurrent = selectedLead.pipeline === st;
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

                {/* ICP Score Arc & Plain Language Reason */}
                <div className="mt-6 p-4 rounded-xl border border-palm-leaf-200/80 dark:border-palm-leaf-900/40 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      ICP Qualification Match
                    </span>
                    <span className="text-base font-bold text-palm-leaf-800 dark:text-palm-leaf-300">
                      {selectedLead.icpScore}%
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                    {selectedLead.icpReason}
                  </p>
                </div>

                {/* Timeline fading in */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                    Activity Timeline
                  </h4>
                  <div className="space-y-3">
                    {selectedLead.timeline.map((item: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="text-xs border-l-2 border-palm-leaf-400 pl-3 py-0.5"
                      >
                        <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {item.event}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {item.time}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  <LinkedInIcon className="h-3.5 w-3.5 text-[#0a66c2]" />
                  <span>Open LinkedIn</span>
                  <ExternalLink className="h-3 w-3 text-neutral-400" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-1.5 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
