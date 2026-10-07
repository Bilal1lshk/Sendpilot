"use client";

import { useState } from "react";
import { FitLabel } from "./FitLabel";
import { DraftBox } from "./DraftBox";
import { SampleLead } from "@/lib/sample-leads";

interface LeadRowProps {
  lead: SampleLead;
  isFirst: boolean;
}

export function LeadRow({ lead, isFirst }: LeadRowProps) {
  const [isApproved, setIsApproved] = useState(lead.status === "Approved");
  const [status, setStatus] = useState(lead.status);

  const handleApprove = () => {
    setIsApproved(true);
    setStatus("Approved");
  };

  const handleEdit = () => {
    const nextMsg = prompt("Edit draft message:", lead.draftMessage);
    if (nextMsg !== null && nextMsg.trim()) {
      lead.draftMessage = nextMsg;
    }
  };

  return (
    <div
      tabIndex={0}
      className={`p-4 sm:p-5 rounded-[10px] border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#1F7A52] ${
        isApproved
          ? "border-[#E7E5E0]/70 dark:border-[#2A2E31]/70 bg-white/60 dark:bg-[#1B1E20]/60 opacity-90"
          : "border-[#E7E5E0] dark:border-[#2A2E31] bg-white dark:bg-[#1B1E20] hover:border-[#D6D3CC] dark:hover:border-[#383D41] shadow-[0_1px_2px_rgba(22,25,26,0.03)]"
      }`}
    >
      {/* 1. Header: Initials circle, name, role, company and fit label */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-[#EFECE6] dark:bg-[#2A2E31] text-[#16191A] dark:text-[#E6E8EA] font-medium text-xs flex items-center justify-center shrink-0">
            {lead.initials}
          </div>

          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold text-[#16191A] dark:text-[#F2F2F0] leading-tight truncate">
              {lead.name}
            </h4>
            <p className="text-[12px] text-[#626669] dark:text-[#9BA0A4] leading-tight truncate mt-0.5">
              {lead.role} · {lead.company}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <FitLabel fit={lead.fit} />
        </div>
      </div>

      {/* 2. One-line human reason for fit */}
      <p className="text-[12px] text-[#626669] dark:text-[#9BA0A4] leading-normal mt-2.5">
        {lead.fitReason}
      </p>

      {/* 3. Drafted opening message box */}
      <DraftBox
        message={lead.draftMessage}
        isFirst={isFirst}
        isApproved={isApproved}
        onApprove={handleApprove}
        onEdit={handleEdit}
      />
    </div>
  );
}
