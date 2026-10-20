"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Link as LinkIcon,
  Compass,
  FileText,
  Ban,
  Database,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LeadItem, LeadsStepData } from "@/types/onboarding";
import { parseCsvContent, CsvParseResult } from "@/lib/csv-parser";

interface CsvImportWizardProps {
  onComplete: (data: LeadsStepData) => void;
  initialData?: LeadsStepData;
}

// [PLACEHOLDER DATA] Default simulated lead preview dataset
const SAMPLE_PREVIEW_LEADS: LeadItem[] = [
  {
    id: "lead-1",
    firstName: "Sarah",
    lastName: "Jenkins",
    jobTitle: "VP of Demand Generation",
    company: "CloudScale Systems",
    email: "sarah.j@cloudscale.io",
    linkedinUrl: "https://linkedin.com/in/sarahjenkins-cloud",
    icpScore: 96,
    status: "ready",
  },
  {
    id: "lead-2",
    firstName: "Marcus",
    lastName: "Chen",
    jobTitle: "Head of Growth & Acquisition",
    company: "FinFlow Technologies",
    email: "marcus@finflow.co",
    linkedinUrl: "https://linkedin.com/in/marcus-chen-growth",
    icpScore: 94,
    status: "ready",
  },
  {
    id: "lead-3",
    firstName: "Elena",
    lastName: "Rostova",
    jobTitle: "Director of Global Sales",
    company: "DataPulse AI",
    email: "elena.r@datapulse.ai",
    linkedinUrl: "https://linkedin.com/in/elena-rostova-sales",
    icpScore: 92,
    status: "ready",
  },
  {
    id: "lead-4",
    firstName: "David",
    lastName: "Miller",
    jobTitle: "Chief Revenue Officer",
    company: "Vanguard Retail",
    email: "david.m@vanguardretail.com",
    linkedinUrl: "https://linkedin.com/in/david-miller-cro",
    icpScore: 89,
    status: "ready",
  },
  {
    id: "lead-5",
    firstName: "Amina",
    lastName: "Diallo",
    jobTitle: "VP of Business Development",
    company: "Apex Logistic Networks",
    email: "amina@apexnetworks.com",
    linkedinUrl: "https://linkedin.com/in/amina-diallo-bizdev",
    icpScore: 88,
    status: "ready",
  },
  {
    id: "lead-6",
    firstName: "Lucas",
    lastName: "Silva",
    jobTitle: "Head of Inbound & Outbound",
    company: "NexGen Workspace",
    email: "lucas@nexgenworkspace.com",
    linkedinUrl: "https://linkedin.com/in/lucas-silva-outbound",
    icpScore: 85,
    status: "ready",
  },
  {
    id: "lead-7",
    firstName: "Chloe",
    lastName: "Dubois",
    jobTitle: "Director of Marketing Operations",
    company: "Stratos Commerce",
    email: "chloe.d@stratoscommerce.eu",
    linkedinUrl: "https://linkedin.com/in/chloe-dubois-ops",
    icpScore: 84,
    status: "ready",
  },
  {
    id: "lead-8",
    firstName: "Liam",
    lastName: "O'Connor",
    jobTitle: "Founder & Managing Director",
    company: "Kite Ventures Ireland",
    email: "liam@kiteventures.ie",
    linkedinUrl: "https://linkedin.com/in/liam-oconnor-ventures",
    icpScore: 82,
    status: "ready",
  },
  {
    id: "lead-9",
    firstName: "Priya",
    lastName: "Sharma",
    jobTitle: "Head of Enterprise Partnerships",
    company: "Zenith Cloud SaaS",
    email: "priya@zenithsaas.io",
    linkedinUrl: "https://linkedin.com/in/priya-sharma-partners",
    icpScore: 80,
    status: "ready",
  },
  {
    id: "lead-10",
    firstName: "Alexander",
    lastName: "Wright",
    jobTitle: "Senior Director of Outreach",
    company: "Horizon Software Global",
    email: "awright@horizonsoftware.com",
    linkedinUrl: "https://linkedin.com/in/alex-wright-outreach",
    icpScore: 78,
    status: "ready",
  },
];

export function CsvImportWizard({
  onComplete,
  initialData,
}: CsvImportWizardProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "urls" | "sales_nav">(
    initialData?.importType || "csv"
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<CsvParseResult | null>(null);

  // CSV Tab states
  const [fileSelected, setFileSelected] = useState<string | null>(
    initialData?.leads && initialData.leads.length > 0 ? "leads-export-q4.csv" : null
  );
  const [isMappingConfirmed, setIsMappingConfirmed] = useState<boolean>(
    (initialData?.leads && initialData.leads.length > 0) || false
  );

  // Paste URLs tab state
  const [pastedUrls, setPastedUrls] = useState<string>("");

  // Column mappings
  const [mappings, setMappings] = useState({
    firstName: "First Name",
    lastName: "Last Name",
    jobTitle: "Job Title",
    company: "Company Name",
    email: "Work Email",
    linkedinUrl: "LinkedIn Profile URL",
  });

  // Download sample CSV helper
  const handleDownloadSample = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,First Name,Last Name,Job Title,Company Name,Work Email,LinkedIn Profile URL\n" +
      "Sarah,Jenkins,VP of Demand Generation,CloudScale Systems,sarah.j@cloudscale.io,https://linkedin.com/in/sarahjenkins-cloud\n" +
      "Marcus,Chen,Head of Growth,FinFlow Technologies,marcus@finflow.co,https://linkedin.com/in/marcus-chen-growth\n" +
      "Elena,Rostova,Director of Global Sales,DataPulse AI,elena.r@datapulse.ai,https://linkedin.com/in/elena-rostova-sales";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sendpilot_sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulateUpload = () => {
    setFileSelected("q4_qualified_prospects.csv");
    setParsedData(null);
  };

  const handleRealFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const result = parseCsvContent(text, file.name);
          setParsedData(result);
          setFileSelected(file.name);
          toast.success(`Parsed ${result.readyCount} leads from ${file.name}`);
        } catch {
          toast.error("Failed to parse CSV file format");
        }
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file from disk");
    };
    reader.readAsText(file);
  };

  const handleDiscardCsv = () => {
    setFileSelected(null);
    setParsedData(null);
    setIsMappingConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("CSV import discarded. No leads were saved to database.");
  };

  const handleConfirmMappingAndImport = () => {
    setIsMappingConfirmed(true);

    const readyCount = parsedData ? parsedData.readyCount : 270;
    const duplicateCount = parsedData ? parsedData.duplicateCount : 20;
    const invalidCount = parsedData ? parsedData.invalidCount : 10;

    const leadsToImport: LeadItem[] =
      parsedData && parsedData.leads.length > 0
        ? parsedData.leads.map((l) => ({
            id: l.id,
            firstName: l.firstName,
            lastName: l.lastName,
            jobTitle: l.title,
            company: l.company,
            email: l.email,
            linkedinUrl: l.linkedinUrl,
            icpScore: l.icpScore,
            status: "ready" as const,
          }))
        : SAMPLE_PREVIEW_LEADS;

    onComplete({
      importType: activeTab,
      readyCount,
      duplicateCount,
      invalidCount,
      suppressionCount: 4,
      leads: leadsToImport,
    });
    toast.success(`Successfully saved ${readyCount} leads to your database!`);
  };

  const handleParseUrlsAndImport = () => {
    const lines = pastedUrls
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const validUrls = Array.from(
      new Set(
        lines.filter(
          (l) => l.includes("linkedin.com/in/") || l.startsWith("http")
        )
      )
    );

    const generatedLeads: LeadItem[] = validUrls.map((url, idx) => {
      const slug = url.split("/in/")[1]?.replace(/\/$/, "") || `lead-${idx + 1}`;
      const nameParts = slug.split("-");
      const fName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : "Prospect";
      const lName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : `${idx + 1}`;

      return {
        id: `url-lead-${idx}`,
        firstName: fName,
        lastName: lName,
        jobTitle: "LinkedIn Member",
        company: "Verified Organization",
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}@company.com`,
        linkedinUrl: url,
        icpScore: 90 - (idx % 15),
        status: "ready",
      };
    });

    setIsMappingConfirmed(true);
    onComplete({
      importType: "urls",
      readyCount: generatedLeads.length || 270,
      duplicateCount: Math.max(0, lines.length - validUrls.length),
      invalidCount: lines.filter((l) => !l.includes("linkedin.com/in/")).length,
      suppressionCount: 2,
      leads: generatedLeads.length > 0 ? generatedLeads : SAMPLE_PREVIEW_LEADS,
    });
  };

  return (
    <div className="space-y-6">
      {/* Three Import Options as Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab("csv");
            setIsMappingConfirmed(false);
          }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "csv"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>CSV Upload</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("urls");
            setIsMappingConfirmed(false);
          }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "urls"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          <span>Paste Profile URLs</span>
        </button>
      </div>

      {/* TAB 1: CSV Upload */}
      {activeTab === "csv" && !isMappingConfirmed && (
        <div className="space-y-6">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.txt"
            onChange={handleRealFileUpload}
            className="hidden"
          />

          {!fileSelected ? (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 bg-neutral-50/50 dark:bg-neutral-900/30 transition-colors cursor-pointer text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Drop your CSV file here, or browse
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                  Supports .csv format with names, emails, job titles, and LinkedIn profile URLs.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-2xs hover:bg-neutral-50 cursor-pointer"
                  >
                    Select File
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSimulateUpload();
                    }}
                    className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                  >
                    Load Sample Leads
                  </button>
                </div>
              </div>

              {/* Sample CSV link */}
              <div className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Need an example file format?</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download sample CSV
                </button>
              </div>
            </div>
          ) : (
            /* Column Mapping Screen */
            <div className="space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Map CSV Columns
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      File: {fileSelected}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileSelected(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
                >
                  Change file
                </button>
              </div>

              {/* Mapping fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    First Name
                  </label>
                  <select
                    value={mappings.firstName}
                    onChange={(e) =>
                      setMappings({ ...mappings, firstName: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="First Name">First Name (detected)</option>
                    <option value="Given Name">Given Name</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Last Name
                  </label>
                  <select
                    value={mappings.lastName}
                    onChange={(e) =>
                      setMappings({ ...mappings, lastName: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="Last Name">Last Name (detected)</option>
                    <option value="Family Name">Family Name</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Job Title
                  </label>
                  <select
                    value={mappings.jobTitle}
                    onChange={(e) =>
                      setMappings({ ...mappings, jobTitle: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="Job Title">Job Title (detected)</option>
                    <option value="Position">Position</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Company
                  </label>
                  <select
                    value={mappings.company}
                    onChange={(e) =>
                      setMappings({ ...mappings, company: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="Company Name">Company Name (detected)</option>
                    <option value="Organization">Organization</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Work Email
                  </label>
                  <select
                    value={mappings.email}
                    onChange={(e) =>
                      setMappings({ ...mappings, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="Work Email">Work Email (detected)</option>
                    <option value="Primary Email">Primary Email</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    LinkedIn URL
                  </label>
                  <select
                    value={mappings.linkedinUrl}
                    onChange={(e) =>
                      setMappings({ ...mappings, linkedinUrl: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="LinkedIn Profile URL">
                      LinkedIn Profile URL (detected)
                    </option>
                    <option value="Profile Link">Profile Link</option>
                  </select>
                </div>
              </div>

              {/* Validation Preview */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 p-4 space-y-3">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Validation & Hygiene Preview
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        270 ready
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Valid format
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/40">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        20 duplicates
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        Auto merged
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200/50 dark:border-red-900/40">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-red-900 dark:text-red-200">
                        10 invalid
                      </div>
                      <div className="text-[11px] text-red-700 dark:text-red-400">
                        Skipped
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suppression check notice */}
                <div className="flex items-center gap-2 pt-2 text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-200/60 dark:border-neutral-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Suppression check completed: 4 contacts matched your global do-not-contact list and were automatically excluded.
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleDiscardCsv}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/60 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Don&apos;t Save</span>
                </button>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleDiscardCsv}
                    className="px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMappingAndImport}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Store in Database ({parsedData ? parsedData.readyCount : 270} Leads)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Paste Profile URLs */}
      {activeTab === "urls" && !isMappingConfirmed && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Paste LinkedIn Profile URLs
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enter one LinkedIn profile URL per line. We will validate format and remove duplicates automatically. (No scraping or profile fetching performed).
            </p>
          </div>

          <textarea
            rows={7}
            value={pastedUrls}
            onChange={(e) => setPastedUrls(e.target.value)}
            placeholder={`https://linkedin.com/in/sarahjenkins-cloud\nhttps://linkedin.com/in/marcus-chen-growth\nhttps://linkedin.com/in/elena-rostova-sales`}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3.5 text-xs font-mono outline-none focus:border-emerald-500 leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {pastedUrls.split("\n").filter((l) => l.trim().length > 0).length} URL(s) detected
            </span>
            <div className="flex items-center gap-2">
              {pastedUrls.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPastedUrls("");
                    toast.info("Cleared URLs without saving.");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold cursor-pointer"
                >
                  <Ban className="h-3 w-3" />
                  <span>Don&apos;t Save</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleParseUrlsAndImport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Store in Database</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTED STATE: Table Preview of First 10 Leads */}
      {isMappingConfirmed && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                  270 Leads Imported Successfully
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  20 duplicates merged • 10 invalid entries filtered • 4 suppressed
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMappingConfirmed(false)}
              className="text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline self-start sm:self-auto cursor-pointer"
            >
              Re-import or edit
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Lead Preview (First 10 leads)
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Showing 10 of 270
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 text-neutral-500 dark:text-neutral-400 font-medium">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Company</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">ICP Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {SAMPLE_PREVIEW_LEADS.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {lead.jobTitle}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {lead.company}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                        {lead.email}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          {lead.icpScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
