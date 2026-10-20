"use client";

import { Search, Filter, Table as TableIcon, Kanban, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";

interface LeadSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStage: string;
  onStageChange: (stage: string) => void;
  stages: string[];
  viewMode: "table" | "kanban";
  onViewModeChange: (mode: "table" | "kanban") => void;
  filteredCount: number;
  totalCount: number;
  onOpenImportCsv: () => void;
}

export function LeadSearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedStage,
  onStageChange,
  stages,
  viewMode,
  onViewModeChange,
  filteredCount,
  totalCount,
  onOpenImportCsv,
}: LeadSearchAndFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads by name, company, title, or email..."
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Table / Kanban view toggle */}
          <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200/80 dark:border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
              title="Table view"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("kanban")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
              title="Kanban pipeline view"
            >
              <Kanban className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenImportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Import CSV</span>
          </button>

          <Link
            href="/dashboard/extractor"
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Extract Leads</span>
          </Link>
        </div>
      </div>

      {/* Stage Filter Row */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {["All", ...stages].map((stage) => {
            const isSelected = selectedStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => onStageChange(stage)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                {stage}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-neutral-400 shrink-0">
          Showing {filteredCount} of {totalCount} leads
        </span>
      </div>
    </div>
  );
}
