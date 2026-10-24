"use client";

import { Loader2, Users, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { LeadListItem } from "@/store/slices/databaseSlice";
import { LeadRow } from "./LeadRow";

interface LeadTableProps {
  leads: LeadListItem[];
  selectedIds: string[];
  isLoading: boolean;
  searchQuery: string;
  onToggleSelect: (leadId: string) => void;
  onSelectAll: () => void;
  onClickRow: (lead: LeadListItem) => void;
  onAssignGroupClick?: (lead: LeadListItem, e: React.MouseEvent) => void;
  onOpenImportCsv?: () => void;
}

export function LeadTable({
  leads,
  selectedIds,
  isLoading,
  searchQuery,
  onToggleSelect,
  onSelectAll,
  onClickRow,
  onAssignGroupClick,
  onOpenImportCsv,
}: LeadTableProps) {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded border-neutral-300 text-palm-leaf-600 focus:ring-palm-leaf-500 h-4 w-4 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4">Group</th>
              <th className="py-3 px-4">ICP Qualification</th>
              <th className="py-3 px-4">Stage</th>
              <th className="py-3 px-4">Campaign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-neutral-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-palm-leaf-600" />
                    <span className="text-xs font-medium">Loading database leads...</span>
                  </div>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3 px-4">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {searchQuery ? `No leads matching "${searchQuery}"` : "No Leads in Database Yet"}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {searchQuery
                        ? "Try adjusting your search terms or clearing the active filters."
                        : "Your prospect pipeline is clean. Extract targeted profiles from LinkedIn or import a CSV file to begin automated outreach."}
                    </p>
                    {!searchQuery && (
                      <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                        {onOpenImportCsv && (
                          <button
                            type="button"
                            onClick={onOpenImportCsv}
                            className="px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Import CSV File</span>
                          </button>
                        )}
                        <Link
                          href="/dashboard/extractor"
                          className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-colors"
                        >
                          Extract from LinkedIn
                        </Link>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedIds.includes(lead.id)}
                  onToggleSelect={onToggleSelect}
                  onClickRow={onClickRow}
                  onAssignGroupClick={onAssignGroupClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
