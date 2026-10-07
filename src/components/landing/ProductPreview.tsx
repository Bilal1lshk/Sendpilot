"use client";

import { motion } from "motion/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { LeadRow } from "./LeadRow";
import { SAMPLE_LEADS } from "@/lib/sample-leads";

export function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-[12px] border border-[#E7E5E0] dark:border-[#2A2E31] bg-[#FAF9F6] dark:bg-[#141718] p-3 sm:p-5 shadow-[0_1px_3px_0_rgba(22,25,26,0.04),0_12px_32px_-4px_rgba(22,25,26,0.06)]"
    >
      {/* 1. Quiet Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#E7E5E0] dark:border-[#2A2E31]">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {/* Search box with real estate search text */}
          <div className="relative flex-1 max-w-xs flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[#8C9196] dark:text-[#6E7377]" />
            <input
              type="text"
              readOnly
              value="Real estate owners, Lahore"
              aria-label="Search filter"
              className="w-full pl-8 pr-3 py-1.5 rounded-[8px] border border-[#E7E5E0] dark:border-[#2A2E31] bg-white dark:bg-[#1B1E20] text-[12px] text-[#16191A] dark:text-[#E6E8EA] focus:outline-none cursor-default select-none"
            />
          </div>

          {/* Filter chip */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[#E7E5E0] dark:border-[#2A2E31] bg-white dark:bg-[#1B1E20] text-[11px] font-medium text-[#16191A] dark:text-[#E6E8EA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A52]" />
            Strong fit
          </span>
        </div>

        {/* Muted count */}
        <span className="text-[12px] text-[#8C9196] dark:text-[#6E7377] shrink-0 font-normal">
          34 leads
        </span>
      </div>

      {/* 2. Three Lead Rows, varying in height and content */}
      <div className="mt-3.5 space-y-3">
        {SAMPLE_LEADS.map((lead, idx) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: idx * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            // On mobile, show only first 2 rows as requested
            className={idx === 2 ? "hidden sm:block" : "block"}
          >
            <LeadRow lead={lead} isFirst={idx === 0} />
          </motion.div>
        ))}
      </div>

      {/* 3. Quiet Bottom Bar */}
      <div className="mt-4 pt-3 border-t border-[#E7E5E0] dark:border-[#2A2E31] flex items-center justify-between text-[12px]">
        <span className="text-[#626669] dark:text-[#9BA0A4]">
          Nothing is sent until you approve it.
        </span>

        <Link
          href="/dashboard"
          className="text-[#1F7A52] dark:text-[#52C58F] hover:underline font-medium focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-sm"
        >
          Open today&apos;s list
        </Link>
      </div>
    </motion.div>
  );
}
