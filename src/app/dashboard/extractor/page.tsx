"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Users,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";
import { microcopy } from "@/lib/microcopy";

export default function LeadExtractorPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "done">("idle");
  const [progress, setProgress] = useState(0);

  // Five source cards
  const SOURCES = [
    { name: "LinkedIn Search", desc: "Extract profiles directly from search results", icon: LinkedInIcon },
    { name: "Sales Navigator", desc: "Sync saved lead lists and account searches", icon: Search },
    { name: "CSV / Excel Upload", desc: "Import spreadsheets with names and companies", icon: FileSpreadsheet },
    { name: "Post Commenters", desc: "Pull leads who liked or commented on any post", icon: Sparkles },
    { name: "Event Attendees", desc: "Extract attendees from LinkedIn audio/live events", icon: Users },
  ];

  const handleStartImport = () => {
    setImportStatus("importing");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setImportStatus("done");
          return 100;
        }
        return prev + 25;
      });
    }, 120);
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
            Lead extractor
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Find and import verified prospects from LinkedIn and spreadsheets.
          </p>
        </div>
      </motion.div>

      {/* 5 Source Cards in Clean Grid (Lifts 2px on Hover) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {SOURCES.map((source, i) => {
          const Icon = source.icon;
          return (
            <motion.div
              key={source.name}
              variants={cardVariants}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs cursor-pointer hover:border-palm-leaf-400 dark:hover:border-palm-leaf-600 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {source.name}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {source.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upload Area: Dashed border with soft highlight when dragging */}
      <motion.div
        variants={cardVariants}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleStartImport();
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-palm-leaf-500 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/30"
            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mb-3">
          <Upload className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Drop your lead file here, or browse
        </h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
          Supports CSV and XLSX up to 10MB. We automatically map columns for names, job titles, and LinkedIn URLs.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleStartImport}
            className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold shadow-xs"
          >
            Upload CSV sample
          </button>
        </div>
      </motion.div>

      {/* Import Progress & Validation Results Animating as Three Friendly Lines */}
      {importStatus !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4"
        >
          {importStatus === "importing" ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span>Importing and verifying leads...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-palm-leaf-600 rounded-full"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-palm-leaf-700 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>{microcopy.feedback.leadsImportSuccess(270)}</span>
              </div>

              {/* 3 friendly validation lines */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">270 ready</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                  <Copy className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-700 dark:text-neutral-300">20 duplicates removed</span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300">10 need a look</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* History Table Rows */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
          Import history
        </h3>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
          {[
            { file: "Series-A-Founders.csv", date: "Today at 10:15 AM", count: 270, status: "Completed" },
            { file: "Fintech-Leads-Stockholm.xlsx", date: "Yesterday at 3:20 PM", count: 145, status: "Completed" },
          ].map((row, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">{row.file}</p>
                <p className="text-[11px] text-neutral-400">{row.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-neutral-600 dark:text-neutral-300">{row.count} leads</span>
                <span className="text-palm-leaf-700 font-semibold">{row.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
