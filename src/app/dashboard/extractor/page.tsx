"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { toast } from "sonner";
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
  Download,
  Database,
  ExternalLink,
  Loader2,
  Check,
  Play,
  Ban,
  X,
  FileText,
  RefreshCw,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { pageVariants, cardVariants } from "@/lib/motion";
import { parseCsvContent, getSampleCsvTemplate, CsvParseResult, ParsedCsvLead } from "@/lib/csv-parser";

interface ExtractedLead {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedinUrl: string;
  icpScore: number;
  status?: string;
  source?: string;
}

export interface ScrapedProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  jobTitle?: string;
  headline?: string;
  company: string;
  location: string;
  about: string;
  experience?: string[];
  education?: string;
  skills?: string[];
  email: string;
  linkedinUrl: string;
  avatar?: string;
  icpScore: number;
  status: string;
  source: string;
  authwall_detected?: boolean;
}

import { useAppDispatch } from "@/store/hooks";
import { fetchLeadsIfNeeded, fetchOverviewIfNeeded } from "@/store/slices/databaseSlice";

export default function LeadExtractorPage() {
  const dispatch = useAppDispatch();
  const [activeSource, setActiveSource] = useState<string>("LinkedIn Search");

  // LinkedIn Search URL Input
  const [searchUrlInput, setSearchUrlInput] = useState<string>(
    "https://www.linkedin.com/search/results/people/?keywords=ai%20engineer&origin=FACETED_SEARCH&geoUrn=%5B%22103644278%22%5D"
  );
  const [connectedAccountName, setConnectedAccountName] = useState<string>("");
  const [maxLeads, setMaxLeads] = useState<number>(10);
  const [extractedQueryLabel, setExtractedQueryLabel] = useState<string>("ai engineer");

  // Ensure no credentials are kept in localStorage and check active LinkedIn connection status
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sendpilot_li_at_cookie");
      localStorage.removeItem("sendpilot_jsession_id");
    }

    let cancelled = false;
    fetch("/api/extractor/linkedin")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data) return;
        if (data.linkedinName) {
          setConnectedAccountName(data.linkedinName);
        }
      })
      .catch(() => {
        // ignore network error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // LinkedIn Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState<string>("");
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Real CSV Upload & Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedCsvResult, setParsedCsvResult] = useState<CsvParseResult | null>(null);
  const [isSavingCsvToDb, setIsSavingCsvToDb] = useState(false);
  const [csvSavedSuccess, setCsvSavedSuccess] = useState(false);
  const [showCsvSaveDecisionModal, setShowCsvSaveDecisionModal] = useState(false);

  // History list state
  const [importHistory, setImportHistory] = useState<
    Array<{ file: string; date: string; count: number; status: string }>
  >([]);

  // Sources Cards (single unified LinkedIn Search URL extractor)
  const SOURCES = [
    {
      name: "LinkedIn Search",
      desc: "Paste any LinkedIn people search URL to extract leads via Playwright",
      icon: LinkedInIcon,
    },
    { name: "Sales Navigator", desc: "Sync saved lead lists and account searches", icon: Search },
    { name: "CSV / Excel Upload", desc: "Import spreadsheets with names, emails, and titles", icon: FileSpreadsheet },
    { name: "Post Commenters", desc: "Pull leads who liked or commented on any post", icon: Sparkles },
    { name: "Event Attendees", desc: "Extract attendees from LinkedIn audio/live events", icon: Users },
  ];

  const SEARCH_URL_PRESETS = [
    {
      label: "AI Engineer (United States)",
      url: "https://www.linkedin.com/search/results/people/?keywords=ai%20engineer&origin=FACETED_SEARCH&geoUrn=%5B%22103644278%22%5D",
    },
    {
      label: "Full Stack Developer",
      url: "https://www.linkedin.com/search/results/people/?keywords=full%20stack%20developer&origin=FACETED_SEARCH&geoUrn=%5B%22103644278%22%5D",
    },
    {
      label: "Head of Growth",
      url: "https://www.linkedin.com/search/results/people/?keywords=head%20of%20growth&origin=FACETED_SEARCH&geoUrn=%5B%22101165590%22%5D",
    },
    {
      label: "SaaS Founder / CEO",
      url: "https://www.linkedin.com/search/results/people/?keywords=saas%20founder%20ceo&origin=FACETED_SEARCH&geoUrn=%5B%22103644278%22%5D",
    },
  ];

  // Parse human-readable query label from a LinkedIn Search URL
  const getQueryLabelFromUrl = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      const kw = parsed.searchParams.get("keywords");
      if (kw && kw.trim()) return decodeURIComponent(kw.trim());
    } catch {
      // ignore
    }
    return "LinkedIn Search";
  };

  // Trigger LinkedIn Extraction via Playwright + Search URL (credentials resolved server-side from DB)
  const handleRunLinkedInExtractor = async () => {
    if (!searchUrlInput.trim()) {
      toast.error("Please enter a LinkedIn People Search URL");
      return;
    }

    setIsExtracting(true);
    setExtractedLeads([]);
    setSelectedLeadIds([]);

    const queryLabel = getQueryLabelFromUrl(searchUrlInput.trim());
    setExtractedQueryLabel(queryLabel);

    setExtractionStep(
      "1/4: Launching Playwright Chromium with your encrypted LinkedIn session..."
    );

    const t1 = setTimeout(() => {
      setExtractionStep(
        `2/4: Opening LinkedIn Search URL (${queryLabel}) with authenticated session...`
      );
    }, 1200);

    const t2 = setTimeout(() => {
      setExtractionStep(
        "3/4: Scrolling & extracting profile cards, headlines & Voyager JSON..."
      );
    }, 2800);

    const t3 = setTimeout(() => {
      setExtractionStep("4/4: Scoring ICP qualification & validating formats...");
    }, 4200);

    try {
      const payload = {
        searchUrl: searchUrlInput.trim(),
        maxLeads,
        mode: "playwright",
        saveToWorkspace: false,
      };

      const res = await fetch("/api/extractor/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (data.success && Array.isArray(data.leads)) {
        setExtractedLeads(data.leads);
        setSelectedLeadIds(data.leads.map((l: ExtractedLead) => l.id));
        if (data.keywords) {
          setExtractedQueryLabel(data.keywords);
        }
        setImportHistory((prev) => [
          {
            file: `LinkedIn Search: ${data.keywords || queryLabel} (${data.leads.length} leads)`,
            date: "Just now",
            count: data.leads.length,
            status: "Extracted",
          },
          ...prev,
        ]);
        toast.success(`Successfully extracted ${data.leads.length} leads!`);
      } else {
        toast.error(data.error || "Failed to extract leads from LinkedIn");
      }
    } catch {
      toast.error("Network error while connecting to extractor service");
    } finally {
      setIsExtracting(false);
      setExtractionStep("");
    }
  };

  // Export to CSV helper
  const handleExportCsv = () => {
    if (extractedLeads.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const headers = ["Name", "First Name", "Last Name", "Job Title", "Company", "Location", "Email", "LinkedIn URL", "ICP Score"];
    const rows = extractedLeads.map((l) => [
      `"${l.name || ""}"`,
      `"${l.firstName || ""}"`,
      `"${l.lastName || ""}"`,
      `"${l.title || ""}"`,
      `"${l.company || ""}"`,
      `"${l.location || ""}"`,
      `"${l.email || ""}"`,
      `"${l.linkedinUrl || ""}"`,
      `"${l.icpScore || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `linkedin_leads_${extractedQueryLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${extractedLeads.length} leads to ${filename}`);
  };

  // Save extracted leads to SendPilot Leads Database
  const handleSaveToDatabase = async () => {
    if (extractedLeads.length === 0) return;

    setIsSavingDb(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: extractedLeads,
          importType: "linkedin_search",
        }),
      });

      const data = await res.json();
      if (data.success) {
        dispatch(fetchLeadsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
        toast.success(`Saved ${data.importedCount} leads directly into your database!`);
      } else {
        toast.error(data.error || "Failed to save leads");
      }
    } catch {
      toast.error("Failed to save leads to database");
    } finally {
      setIsSavingDb(false);
    }
  };

  // ===================== REAL CSV IMPORT LOGIC ===================== //

  // Process raw CSV string content
  const processCsvText = (text: string, filename: string) => {
    setIsParsingCsv(true);
    setCsvSavedSuccess(false);

    setTimeout(() => {
      try {
        const result = parseCsvContent(text, filename);
        if (result.leads.length === 0 && result.invalidCount > 0) {
          toast.error("Could not parse valid leads. Check that headers include name, title, or email.");
        } else {
          setParsedCsvResult(result);
          setShowCsvSaveDecisionModal(true);
          toast.success(`Parsed ${result.readyCount} leads from ${filename}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid format";
        toast.error("Failed to parse CSV file: " + msg);
      } finally {
        setIsParsingCsv(false);
      }
    }, 400);
  };

  // Handle file selection from disk
  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file from disk");
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(getSampleCsvTemplate());
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "sendpilot_sample_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded sample CSV template");
  };

  // Try demo sample CSV
  const handleLoadDemoSampleCsv = () => {
    const sampleText = getSampleCsvTemplate();
    processCsvText(sampleText, "sendpilot_sample_leads.csv");
  };

  // Discard imported CSV without saving to database
  const handleDiscardCsv = () => {
    if (parsedCsvResult) {
      setImportHistory((prev) => [
        {
          file: parsedCsvResult.fileName,
          date: "Just now",
          count: parsedCsvResult.readyCount,
          status: "Not Saved (Discarded)",
        },
        ...prev,
      ]);
    }
    setParsedCsvResult(null);
    setCsvSavedSuccess(false);
    setShowCsvSaveDecisionModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("CSV file was not saved to database.");
  };

  // Commit Parsed CSV Leads to Backend Database
  const handleConfirmAndImportCsv = async () => {
    if (!parsedCsvResult || parsedCsvResult.leads.length === 0) return;

    setIsSavingCsvToDb(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: parsedCsvResult.leads,
          importType: "csv_upload",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCsvSavedSuccess(true);
        setShowCsvSaveDecisionModal(false);
        dispatch(fetchLeadsIfNeeded({ force: true }));
        dispatch(fetchOverviewIfNeeded({ force: true }));
        toast.success(`Successfully saved ${data.importedCount} leads directly into your database!`);
        setImportHistory((prev) => [
          {
            file: parsedCsvResult.fileName,
            date: "Just now",
            count: data.importedCount,
            status: "Stored in Database",
          },
          ...prev,
        ]);
      } else {
        toast.error(data.error || "Failed to import leads to database");
      }
    } catch {
      toast.error("Network error while importing leads");
    } finally {
      setIsSavingCsvToDb(false);
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
            Lead extractor & import
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Extract prospect profiles from LinkedIn search or import existing lead spreadsheets via CSV.
          </p>
        </div>

        {extractedLeads.length > 0 && activeSource === "LinkedIn Search" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-palm-leaf-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSavingDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingDb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              <span>Save to CRM</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Source Cards in Clean Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {SOURCES.map((source) => {
          const Icon = source.icon;
          const isSelected = activeSource === source.name;
          return (
            <motion.div
              key={source.name}
              variants={cardVariants}
              whileHover={{ y: -2 }}
              onClick={() => setActiveSource(source.name)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-palm-leaf-500 bg-palm-leaf-50/20 dark:bg-palm-leaf-950/20 shadow-xs ring-1 ring-palm-leaf-500/50"
                  : "border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-palm-leaf-400 dark:hover:border-palm-leaf-600"
              }`}
            >
              <div>
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected
                      ? "bg-palm-leaf-100 dark:bg-palm-leaf-900/60 text-palm-leaf-700 dark:text-palm-leaf-300"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {source.name}
                  </h3>
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {source.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ==================== TAB 1: Unified LinkedIn Search URL Extractor ==================== */}
      {activeSource === "LinkedIn Search" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* LinkedIn Search URL Configuration Card */}
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center">
                  <LinkedInIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    LinkedIn People Search URL Extractor
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Paste any LinkedIn people search URL to extract leads using your connected LinkedIn account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 text-[11px] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {connectedAccountName
                      ? `Connected (${connectedAccountName})`
                      : "Playwright Session Active"}
                  </span>
                </span>
              </div>
            </div>

            {/* Quick Search URL Presets */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-neutral-400 text-[11px] font-medium">Quick Search URLs:</span>
              {SEARCH_URL_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSearchUrlInput(p.url)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800 text-[11px] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Unified Search URL + Max Leads + Extract Leads Button */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-neutral-400" />
                  <span>LinkedIn People Search URL</span>
                </label>
                <input
                  id="search-url-input"
                  type="text"
                  value={searchUrlInput}
                  onChange={(e) => setSearchUrlInput(e.target.value)}
                  placeholder="https://www.linkedin.com/search/results/people/?keywords=ai%20engineer&origin=FACETED_SEARCH&geoUrn=%5B%22103644278%22%5D"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Max Leads
                </label>
                <div className="flex gap-2">
                  <select
                    value={maxLeads}
                    onChange={(e) => setMaxLeads(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium cursor-pointer"
                  >
                    <option value={5}>5 leads</option>
                    <option value={10}>10 leads</option>
                    <option value={20}>20 leads</option>
                    <option value={50}>50 leads</option>
                  </select>

                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleRunLinkedInExtractor}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0 shadow-xs transition-colors"
                  >
                    {isExtracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                    <span>{isExtracting ? "Extracting..." : "Extract Leads"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Extraction Progress Banner */}
          {isExtracting && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-palm-leaf-300/80 dark:border-palm-leaf-900 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/20 p-5 shadow-xs flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-palm-leaf-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Extracting Leads from LinkedIn Search URL
                </h4>
                <p className="text-xs text-palm-leaf-800 dark:text-palm-leaf-300 font-medium">
                  {extractionStep}
                </p>
              </div>
            </motion.div>
          )}

          {/* Extracted Leads Table */}
          {extractedLeads.length > 0 && !isExtracting && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-palm-leaf-100 dark:bg-palm-leaf-950 flex items-center justify-center text-palm-leaf-700 dark:text-palm-leaf-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {extractedLeads.length} Leads Extracted for &quot;{extractedQueryLabel}&quot;
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Ready to export to CSV or import directly into SendPilot database.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-palm-leaf-600" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={isSavingDb}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingDb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                    <span>Save to CRM</span>
                  </button>
                  <Link
                    href="/dashboard/leads"
                    className="inline-flex items-center gap-1 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 font-semibold hover:underline ml-2"
                  >
                    <span>View Database</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-8">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.length === extractedLeads.length}
                            onChange={() => {
                              if (selectedLeadIds.length === extractedLeads.length) {
                                setSelectedLeadIds([]);
                              } else {
                                setSelectedLeadIds(extractedLeads.map((l) => l.id));
                              }
                            }}
                            className="rounded border-neutral-300"
                          />
                        </th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Role & Company</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">ICP Score</th>
                        <th className="py-3 px-4">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {extractedLeads.map((lead) => {
                        const isChecked = selectedLeadIds.includes(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors ${
                              isChecked ? "bg-palm-leaf-50/30 dark:bg-palm-leaf-950/20" : ""
                            }`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedLeadIds((prev) =>
                                    prev.includes(lead.id)
                                      ? prev.filter((i) => i !== lead.id)
                                      : [...prev, lead.id]
                                  );
                                }}
                                className="rounded border-neutral-300"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {lead.firstName?.[0] || ""}
                                  {lead.lastName?.[0] || ""}
                                </div>
                                <div>
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                                    {lead.name}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 font-mono">
                                    {lead.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                              <span className="font-medium block">{lead.title}</span>
                              <span className="text-[11px] text-neutral-400">{lead.company}</span>
                            </td>
                            <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">
                              {lead.location}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-palm-leaf-50 text-palm-leaf-800 dark:bg-palm-leaf-950 dark:text-palm-leaf-300 border border-palm-leaf-200/50 dark:border-palm-leaf-900/40">
                                {lead.icpScore}% match
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#0a66c2] hover:underline"
                              >
                                <span>Profile</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ==================== TAB 2: Real CSV Import for Users ==================== */}
      {activeSource === "CSV / Excel Upload" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Decision Modal: Store or Don't Save */}
          <AnimatePresence>
            {showCsvSaveDecisionModal && parsedCsvResult && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCsvSaveDecisionModal(false)}
                  className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-600 dark:text-palm-leaf-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                          CSV File Imported
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {parsedCsvResult.fileName} • {parsedCsvResult.readyCount} valid leads detected
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCsvSaveDecisionModal(false)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">
                      Would you like to store these leads in your SendPilot CRM database, or don&apos;t save them?
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300">{parsedCsvResult.readyCount}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Ready Leads</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <div className="font-bold text-neutral-800 dark:text-neutral-200">{parsedCsvResult.duplicateCount}</div>
                        <div className="text-[10px] text-neutral-500">Duplicates</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
                        <div className="font-bold text-amber-800 dark:text-amber-300">{parsedCsvResult.invalidCount}</div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">Skipped</div>
                      </div>
                    </div>

                    {/* Quick lead preview */}
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 p-3 space-y-2">
                      <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Sample Preview
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {parsedCsvResult.leads.slice(0, 3).map((l, idx) => (
                          <div key={idx} className="flex items-center justify-between text-neutral-700 dark:text-neutral-300 py-0.5">
                            <span className="font-medium truncate max-w-[180px]">{l.name || "Contact"}</span>
                            <span className="text-[11px] text-neutral-400 truncate max-w-[200px]">{l.title} {l.company ? `• ${l.company}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={handleDiscardCsv}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Don&apos;t Save</span>
                    </button>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCsvSaveDecisionModal(false)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        <span>Preview Table</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingCsvToDb}
                        onClick={handleConfirmAndImportCsv}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {isSavingCsvToDb ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Database className="h-3.5 w-3.5" />
                        )}
                        <span>Store in Database</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Drag & Drop File Zone */}
          {!parsedCsvResult && (
            <div className="space-y-4">
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
                  if (file) handleFileSelected(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-palm-leaf-500 bg-palm-leaf-50/50 dark:bg-palm-leaf-950/30 scale-[1.01]"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-palm-leaf-400 dark:hover:border-palm-leaf-600"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-600 dark:text-palm-leaf-400 mb-3 shadow-2xs">
                  {isParsingCsv ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7" />
                  )}
                </div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {isParsingCsv ? "Parsing your CSV file..." : "Drop your CSV file here, or browse"}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-md mx-auto">
                  Upload spreadsheets with names, emails, job titles, and LinkedIn profile URLs. Columns are automatically detected.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    Select CSV File
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemoSampleCsv();
                    }}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-4 py-2.5 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                  >
                    Try Sample CSV
                  </button>
                </div>
              </div>

              {/* Sample Template Download Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300">
                  <FileText className="h-4 w-4 text-palm-leaf-600 shrink-0" />
                  <span>
                    Need a reference format? Download our pre-formatted sample lead spreadsheet.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>
            </div>
          )}

          {/* Parsed CSV Preview & Import Screen */}
          {parsedCsvResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Header Status & Hygiene Stats */}
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {parsedCsvResult.fileName}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {parsedCsvResult.totalRows} rows detected • Headers: {parsedCsvResult.headers.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscardCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 cursor-pointer transition-colors"
                      title="Discard without saving to database"
                    >
                      <Ban className="h-3 w-3" />
                      <span>Don&apos;t Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setParsedCsvResult(null);
                        setCsvSavedSuccess(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Upload different file</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingCsvToDb || csvSavedSuccess}
                      onClick={handleConfirmAndImportCsv}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSavingCsvToDb ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : csvSavedSuccess ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Database className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {csvSavedSuccess
                          ? "Stored in Database"
                          : `Store ${parsedCsvResult.readyCount} Leads in Database`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3 Hygiene Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-xs">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                        {parsedCsvResult.readyCount} Ready
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Valid format and contact profiles
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                    <Copy className="h-5 w-5 text-neutral-400 shrink-0" />
                    <div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                        {parsedCsvResult.duplicateCount} Duplicates
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Deduplicated automatically
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-xs">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                        {parsedCsvResult.invalidCount} Skipped
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        Missing both name and contact URL
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-Import Success Bar */}
                {csvSavedSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/40 border border-palm-leaf-200 dark:border-palm-leaf-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-palm-leaf-900 dark:text-palm-leaf-200 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-palm-leaf-600" />
                      <span>All leads have been added to your database!</span>
                    </div>
                    <Link
                      href="/dashboard/leads"
                      className="inline-flex items-center gap-1 font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                    >
                      <span>Go to Leads Database</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </motion.div>
                )}
              </div>

              {/* Parsed CSV Leads Table Preview */}
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Lead Preview ({parsedCsvResult.leads.length} Leads)
                  </h4>
                  <span className="text-[11px] text-neutral-500">
                    Showing all parsed contacts
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Title & Company</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">ICP Score</th>
                        <th className="py-3 px-4">LinkedIn Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {parsedCsvResult.leads.map((lead: ParsedCsvLead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {lead.firstName?.[0] || ""}
                                {lead.lastName?.[0] || ""}
                              </div>
                              <div>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                                  {lead.name}
                                </span>
                                <span className="text-[11px] text-neutral-400 font-mono">
                                  {lead.email || "No email"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                            <span className="font-medium block">{lead.title}</span>
                            <span className="text-[11px] text-neutral-400">{lead.company}</span>
                          </td>
                          <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400">
                            {lead.location}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-palm-leaf-50 text-palm-leaf-800 dark:bg-palm-leaf-950 dark:text-palm-leaf-300 border border-palm-leaf-200/50 dark:border-palm-leaf-900/40">
                              {lead.icpScore}% match
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {lead.linkedinUrl ? (
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#0a66c2] hover:underline"
                              >
                                <span>Profile</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Decision Bar */}
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-neutral-500">
                    {parsedCsvResult.readyCount} leads ready. Choose whether to store them in your CRM or discard.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscardCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 cursor-pointer transition-colors"
                    >
                      <Ban className="h-3 w-3" />
                      <span>Don&apos;t Save</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSavingCsvToDb || csvSavedSuccess}
                      onClick={handleConfirmAndImportCsv}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSavingCsvToDb ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : csvSavedSuccess ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Database className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {csvSavedSuccess
                          ? "Stored in Database"
                          : `Store ${parsedCsvResult.readyCount} Leads in Database`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ==================== Sales Navigator & Other Tabs fallback guide ==================== */}
      {activeSource !== "LinkedIn Search" && activeSource !== "CSV / Excel Upload" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center space-y-3"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-palm-leaf-50 dark:bg-palm-leaf-950/60 text-palm-leaf-700 dark:text-palm-leaf-300">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {activeSource} Extraction
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Extract leads from {activeSource} into your SendPilot pipeline. You can also import CSV lists or run the LinkedIn People Search directly.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveSource("CSV / Excel Upload")}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-4 py-2 text-xs font-semibold shadow-2xs cursor-pointer"
            >
              Upload CSV List
            </button>
            <button
              type="button"
              onClick={() => setActiveSource("LinkedIn Search")}
              className="rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer"
            >
              LinkedIn Search Extractor
            </button>
          </div>
        </motion.div>
      )}

      {/* Extraction & Import History Table Rows */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
          Extraction & Import history
        </h3>
        {importHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            No extraction or import history yet. Real-time operations will appear here as you scrape LinkedIn profiles or upload CSVs.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {importHistory.map((row, idx) => (
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
        )}
      </motion.div>
    </motion.div>
  );
}
