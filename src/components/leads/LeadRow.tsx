"use client";

import { ExternalLink, Tag } from "lucide-react";
import { RawLeadPayload } from "@/store/slices/databaseSlice";

interface LeadRowProps {
  lead: RawLeadPayload & {
    pipeline?: string;
    campaigns?: Array<{ campaignId: string; state: string }>;
  };
  isSelected: boolean;
  onToggleSelect: (leadId: string) => void;
  onClickRow: (lead: any) => void;
  onAssignGroupClick?: (lead: any, e: React.MouseEvent) => void;
}

export function LeadRow({
  lead,
  isSelected,
  onToggleSelect,
  onClickRow,
  onAssignGroupClick,
}: LeadRowProps) {
  const name =
    lead.name ||
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
    "Lead";
  const initials = (name[0] || "L").toUpperCase();
  const icp = lead.icpScore ?? 0;
  const stage = lead.pipeline || lead.status || "new";

  return (
    <tr
      onClick={() => onClickRow(lead)}
      className={`group hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
        isSelected ? "bg-palm-leaf-50/20 dark:bg-palm-leaf-950/20" : ""
      }`}
    >
      {/* Checkbox */}
      <td
        className="py-3.5 px-4 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(lead.id);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(lead.id)}
          className="rounded border-neutral-300 text-palm-leaf-600 focus:ring-palm-leaf-500 h-4 w-4 cursor-pointer"
        />
      </td>

      {/* Contact Profile */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-700 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {name}
              </span>
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
              {lead.title || lead.jobTitle || "Lead"}
            </p>
          </div>
        </div>
      </td>

      {/* Company & Location */}
      <td className="py-3.5 px-4">
        <div className="min-w-0">
          <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {lead.company || "—"}
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            {lead.location || "Remote"}
          </p>
        </div>
      </td>

      {/* Lead Group */}
      <td className="py-3.5 px-4">
        {lead.group ? (
          <span
            onClick={(e) => onAssignGroupClick && onAssignGroupClick(lead, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-700 dark:text-palm-leaf-300 border border-palm-leaf-200/60 dark:border-palm-leaf-800/60 hover:border-palm-leaf-400 transition-colors"
            title="Click to change group"
          >
            <Tag className="h-2.5 w-2.5" />
            <span>{lead.group}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => onAssignGroupClick && onAssignGroupClick(lead, e)}
            className="text-[10px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:underline"
          >
            + Add Group
          </button>
        )}
      </td>

      {/* ICP Score */}
      <td className="py-3.5 px-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            icp >= 85
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : icp >= 70
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              icp >= 85 ? "bg-emerald-500" : icp >= 70 ? "bg-amber-500" : "bg-neutral-400"
            }`}
          />
          {icp}% match
        </span>
      </td>

      {/* Stage */}
      <td className="py-3.5 px-4">
        <span className="capitalize text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {stage}
        </span>
      </td>

      {/* Campaign Association */}
      <td className="py-3.5 px-4">
        {lead.campaigns && lead.campaigns.length > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {lead.campaigns.length} sequence{lead.campaigns.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-[11px] text-neutral-400 italic">None</span>
        )}
      </td>
    </tr>
  );
}
