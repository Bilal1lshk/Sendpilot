"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Check, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { parseCsvContent, CsvParseResult, getSampleCsvTemplate } from "@/lib/csv-parser";

interface LeadImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups: string[];
  onImportSuccess: (count: number) => void;
}

export function LeadImportDialog({
  isOpen,
  onClose,
  availableGroups,
  onImportSuccess,
}: LeadImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<CsvParseResult | null>(null);
  const [targetGroup, setTargetGroup] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCsvContent(text, file.name);
      setParsedResult(result);
      setIsParsing(false);
      if (result.readyCount > 0) {
        toast.success(`Parsed ${result.readyCount} valid leads from ${file.name}`);
      } else {
        toast.error("No valid leads found in CSV file");
      }
    };
    reader.onerror = () => {
      setIsParsing(false);
      toast.error("Failed to read CSV file");
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const csvContent = getSampleCsvTemplate();
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sendpilot_leads_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToDb = async () => {
    if (!parsedResult || parsedResult.leads.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: parsedResult.leads,
          importType: "csv_upload",
          group: targetGroup.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully imported ${data.importedCount} leads!`);
        onImportSuccess(data.importedCount);
        onClose();
      } else {
        toast.error(data.error || "Failed to import leads");
      }
    } catch {
      toast.error("Network error while saving leads");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Import Leads from CSV
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload spreadsheets with names, emails, companies, and LinkedIn URLs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Target Group Selector */}
          <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Assign to Named Lead Group (Optional)
            </label>
            <input
              type="text"
              list="import-dialog-groups"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              placeholder="e.g. CEOs, Founders, Marketing Directors"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-palm-leaf-500"
            />
            <datalist id="import-dialog-groups">
              {availableGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <p className="text-[11px] text-neutral-500">
              Leads will be tagged with this group for organized campaign enrollment.
            </p>
          </div>

          {/* Upload Area */}
          {!parsedResult ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-palm-leaf-500 bg-palm-leaf-50/30"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-palm-leaf-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-10 w-10 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-600 dark:text-palm-leaf-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Click or drag & drop CSV file here
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Supports Standard CSV with headers: Name, Title, Company, Email, LinkedIn URL
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSample();
                }}
                className="mt-3 text-[11px] text-palm-leaf-700 dark:text-palm-leaf-400 font-semibold hover:underline"
              >
                Download Sample CSV Template
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/40 border border-palm-leaf-200/80 dark:border-palm-leaf-800 text-xs">
                <div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                    {parsedResult.fileName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {parsedResult.readyCount} valid leads ready • {parsedResult.invalidCount} invalid rows
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setParsedResult(null)}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
                >
                  Change File
                </button>
              </div>

              {/* Sample preview table */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Company</th>
                      <th className="py-2 px-3">Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {parsedResult.leads.slice(0, 5).map((l, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-neutral-800 dark:text-neutral-200">
                          {l.firstName} {l.lastName}
                        </td>
                        <td className="py-2 px-3 text-neutral-600 dark:text-neutral-400">{l.company}</td>
                        <td className="py-2 px-3 text-neutral-500 truncate max-w-[150px]">{l.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parsedResult || parsedResult.readyCount === 0 || isSaving}
            onClick={handleSaveToDb}
            className="px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing Leads...</span>
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5" />
                <span>Import {parsedResult ? parsedResult.readyCount : ""} Leads</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
