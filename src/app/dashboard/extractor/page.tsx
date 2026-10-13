"use client";

import { useState, useRef } from "react";
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
  Code2,
  Check,
  Play,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  Mail,
  Globe,
  GraduationCap,
  Award,
  ShieldCheck,
  UserCheck,
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

export default function LeadExtractorPage() {
  const [activeSource, setActiveSource] = useState<string>("LinkedIn Profile URL");

  // Single Profile Scraping State
  const [profileUrlInput, setProfileUrlInput] = useState("https://www.linkedin.com/in/ali-gujranwala");
  const [isScrapingProfile, setIsScrapingProfile] = useState(false);
  const [profileScrapeStep, setProfileScrapeStep] = useState<string>("");
  const [scrapedProfile, setScrapedProfile] = useState<ScrapedProfile | null>(null);
  const [isSavingProfileToDb, setIsSavingProfileToDb] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  const PROFILE_PRESETS = [
    { label: "Ali (from Gujranwala)", url: "https://www.linkedin.com/in/ali-gujranwala" },
    { label: "Bill Gates", url: "https://www.linkedin.com/in/williamhgates" },
    { label: "Satya Nadella", url: "https://www.linkedin.com/in/satyanadella" },
    { label: "Sundar Pichai", url: "https://www.linkedin.com/in/sundarpichai" },
  ];

  // LinkedIn Extractor Inputs
  const [keywords, setKeywords] = useState("Marketing Data Analyst");
  const [location, setLocation] = useState("Berlin");
  const [maxLeads, setMaxLeads] = useState<number>(10);
  const [engineMode, setEngineMode] = useState<"live" | "fast">("live");

  // LinkedIn Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState<string>("");
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Real CSV Upload & Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedCsvResult, setParsedCsvResult] = useState<CsvParseResult | null>(null);
  const [isSavingCsvToDb, setIsSavingCsvToDb] = useState(false);
  const [csvSavedSuccess, setCsvSavedSuccess] = useState(false);

  // History list state
  const [importHistory, setImportHistory] = useState<
    Array<{ file: string; date: string; count: number; status: string }>
  >([]);

  // Sources Cards
  const SOURCES = [
    { name: "LinkedIn Profile URL", desc: "Paste any LinkedIn profile link to scrape deep profile info", icon: ExternalLink },
    { name: "LinkedIn Search", desc: "Extract people profiles directly with keywords & location", icon: LinkedInIcon },
    { name: "Sales Navigator", desc: "Sync saved lead lists and account searches", icon: Search },
    { name: "CSV / Excel Upload", desc: "Import spreadsheets with names, emails, and titles", icon: FileSpreadsheet },
    { name: "Post Commenters", desc: "Pull leads who liked or commented on any post", icon: Sparkles },
    { name: "Event Attendees", desc: "Extract attendees from LinkedIn audio/live events", icon: Users },
  ];

  const PRESETS = [
    { kw: "Marketing Data Analyst", loc: "Berlin" },
    { kw: "Head of Growth", loc: "London" },
    { kw: "VP of Product", loc: "San Francisco" },
    { kw: "Director of RevOps", loc: "New York" },
  ];

  // ===================== PROFILE URL SCRAPER HANDLERS ===================== //
  const handleRunProfileScraper = async () => {
    if (!profileUrlInput.trim()) {
      toast.error("Please enter a LinkedIn profile URL");
      return;
    }

    setIsScrapingProfile(true);
    setScrapedProfile(null);
    setProfileSavedSuccess(false);
    setProfileScrapeStep("1/4: Launching Selenium Chrome WebDriver...");

    const t1 = setTimeout(() => {
      setProfileScrapeStep("2/4: Loading profile page & navigating anti-bot barriers...");
    }, 1500);

    const t2 = setTimeout(() => {
      setProfileScrapeStep("3/4: Parsing profile card, headline, experience & about bio...");
    }, 3200);

    const t3 = setTimeout(() => {
      setProfileScrapeStep("4/4: Calculating ICP qualification & email address...");
    }, 4800);

    try {
      const res = await fetch("/api/extractor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: profileUrlInput,
          saveToWorkspace: false,
        }),
      });

      const data = await res.json();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (data.success && data.profile) {
        setScrapedProfile(data.profile);
        setImportHistory((prev) => [
          {
            file: `Profile: ${data.profile.name} (${data.profile.company || "LinkedIn"})`,
            date: "Just now",
            count: 1,
            status: "Extracted",
          },
          ...prev,
        ]);
        toast.success(`Scraped profile for ${data.profile.name}!`);
      } else {
        toast.error(data.error || "Failed to scrape profile");
      }
    } catch {
      toast.error("Network error while communicating with profile scraper");
    } finally {
      setIsScrapingProfile(false);
      setProfileScrapeStep("");
    }
  };

  const handleSaveProfileToDb = async () => {
    if (!scrapedProfile) return;
    setIsSavingProfileToDb(true);

    try {
      const res = await fetch("/api/extractor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scrapedProfile.linkedinUrl,
          saveToWorkspace: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.savedToWorkspace) {
        setProfileSavedSuccess(true);
        toast.success(`Saved ${scrapedProfile.name} to your Leads database!`);
      } else {
        toast.error(data.error || "Could not save profile to database");
      }
    } catch {
      toast.error("Network error while saving profile to database");
    } finally {
      setIsSavingProfileToDb(false);
    }
  };

  const handleExportProfileCsv = () => {
    if (!scrapedProfile) return;
    const headers = ["First Name", "Last Name", "Full Name", "Title", "Company", "Location", "Email", "LinkedIn URL", "ICP Score"];
    const row = [
      `"${scrapedProfile.firstName || ""}"`,
      `"${scrapedProfile.lastName || ""}"`,
      `"${scrapedProfile.name || ""}"`,
      `"${scrapedProfile.title || scrapedProfile.headline || ""}"`,
      `"${scrapedProfile.company || ""}"`,
      `"${scrapedProfile.location || ""}"`,
      `"${scrapedProfile.email || ""}"`,
      `"${scrapedProfile.linkedinUrl || ""}"`,
      `"${scrapedProfile.icpScore || 90}"`,
    ];
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers.join(","), row.join(",")].join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${scrapedProfile.name.toLowerCase().replace(/\s+/g, "_")}_linkedin_lead.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Profile exported to CSV");
  };

  // Trigger LinkedIn Extraction via API & Selenium
  const handleRunLinkedInExtractor = async () => {
    if (!keywords.trim()) {
      toast.error("Please enter search keywords or a job title");
      return;
    }

    setIsExtracting(true);
    setExtractedLeads([]);
    setSelectedLeadIds([]);

    setExtractionStep("1/4: Initializing Chrome WebDriver with Selenium...");

    const t1 = setTimeout(() => {
      setExtractionStep(`2/4: Searching LinkedIn for "${keywords}" in "${location}"...`);
    }, 1200);

    const t2 = setTimeout(() => {
      setExtractionStep("3/4: Parsing profile cards, headlines & company data...");
    }, 2800);

    const t3 = setTimeout(() => {
      setExtractionStep("4/4: Scoring ICP qualification & validating formats...");
    }, 4200);

    try {
      const res = await fetch("/api/extractor/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          location,
          maxLeads,
          mode: engineMode,
          saveToWorkspace: false,
        }),
      });

      const data = await res.json();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (data.success && Array.isArray(data.leads)) {
        setExtractedLeads(data.leads);
        setSelectedLeadIds(data.leads.map((l: ExtractedLead) => l.id));
        setImportHistory((prev) => [
          {
            file: `LinkedIn Search: "${keywords}" in ${location}`,
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
    const filename = `linkedin_leads_${keywords.toLowerCase().replace(/\s+/g, "_")}_${location.toLowerCase().replace(/\s+/g, "_")}.csv`;
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
          toast.success(`Parsed ${result.readyCount} leads from ${filename}`);
        }
      } catch (err: any) {
        toast.error("Failed to parse CSV file: " + (err.message || "Invalid format"));
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
        toast.success(`Successfully imported ${data.importedCount} leads into your database!`);
        setImportHistory((prev) => [
          {
            file: parsedCsvResult.fileName,
            date: "Just now",
            count: data.importedCount,
            status: "Completed",
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

  const pythonSnippet = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
import csv
import time

# 1. Initialize Chrome with Selenium (or provide custom driver path)
# s = Service("C:/Users/DELL/OneDrive/Desktop/chromedriver_win32/chromedriver.exe")
driver = webdriver.Chrome()

# 2. Navigate to LinkedIn Search
search_url = "https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    keywords + " " + location
  )}&origin=GLOBAL_SEARCH_HEADER"
driver.get(search_url)

# 3. Extract profiles & save to CSV
time.sleep(3)
results = driver.find_elements(By.CSS_SELECTOR, "li.reusable-search__result-container")
leads = []

for item in results:
    name = item.find_element(By.CSS_SELECTOR, "span.entity-result__title-text a span").text
    headline = item.find_element(By.CSS_SELECTOR, "div.entity-result__primary-subtitle").text
    leads.append({"name": name, "title": headline})

with open("leads.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "title"])
    writer.writeheader()
    writer.writerows(leads)

driver.quit()`;

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

      {/* 6 Source Cards in Clean Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
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

      {/* ==================== TAB 0: LinkedIn Profile URL Scraper ==================== */}
      {activeSource === "LinkedIn Profile URL" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile URL Input Card */}
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    LinkedIn Single Profile Scraper
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Paste any LinkedIn profile URL (e.g. <span className="font-semibold text-neutral-700 dark:text-neutral-300">ali from gujranwala</span>) to extract headline, company, email & ICP fit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 text-[11px] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Selenium Automation Active</span>
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-neutral-400 text-[11px] font-medium">Quick Presets:</span>
              {PROFILE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProfileUrlInput(p.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800 text-[11px] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input & Scrape Button */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                <span>LinkedIn Profile URL or Slug</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <LinkedInIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={profileUrlInput}
                    onChange={(e) => setProfileUrlInput(e.target.value)}
                    placeholder="https://www.linkedin.com/in/ali-gujranwala or ali from gujranwala"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                  />
                </div>

                <button
                  type="button"
                  disabled={isScrapingProfile}
                  onClick={handleRunProfileScraper}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                >
                  {isScrapingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scraping Profile...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Scrape Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* In-progress banner */}
            {isScrapingProfile && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-palm-leaf-50/70 dark:bg-palm-leaf-950/40 border border-palm-leaf-200 dark:border-palm-leaf-800 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-palm-leaf-600 text-white flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {profileScrapeStep || "Extracting LinkedIn Profile data..."}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Running headless Chrome automation via Python Selenium engine.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Scraped Profile Result Preview */}
          {scrapedProfile && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Card Header Banner */}
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 border-b border-neutral-100 dark:border-neutral-800 pb-6">
                  {/* Avatar & Core Bio */}
                  <div className="flex items-start gap-4">
                    {scrapedProfile.avatar ? (
                      <img
                        src={scrapedProfile.avatar}
                        alt={scrapedProfile.name}
                        className="h-16 w-16 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-800 shadow-2xs"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-palm-leaf-600 via-palm-leaf-500 to-emerald-400 text-white flex items-center justify-center font-bold text-2xl shadow-2xs">
                        {scrapedProfile.firstName ? scrapedProfile.firstName[0] : scrapedProfile.name[0]}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                          {scrapedProfile.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0a66c2] text-[10px] font-semibold border border-blue-200/50 dark:border-blue-900">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {scrapedProfile.title || scrapedProfile.headline}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{scrapedProfile.company}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{scrapedProfile.location}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ICP Score & Action Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          {scrapedProfile.icpScore}% ICP Match
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                          High Fit Candidate
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportProfileCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingProfileToDb || profileSavedSuccess}
                        onClick={handleSaveProfileToDb}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        {isSavingProfileToDb ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : profileSavedSuccess ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Database className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {profileSavedSuccess ? "Saved to CRM Leads" : "Save Lead to CRM"}
                        </span>
                      </button>

                      <a
                        href={scrapedProfile.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        title="Open on LinkedIn"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Profile Detail Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: About, Experience & Education */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* About Section */}
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-neutral-500" />
                        <span>About & Summary</span>
                      </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {scrapedProfile.about}
                      </p>
                    </div>

                    {/* Experience Section */}
                    {scrapedProfile.experience && scrapedProfile.experience.length > 0 && (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Experience Highlights</span>
                        </h4>
                        <div className="space-y-1.5">
                          {scrapedProfile.experience.map((exp, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-palm-leaf-500 shrink-0" />
                              <span>{exp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {scrapedProfile.education && (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-1">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Education</span>
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                          {scrapedProfile.education}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Contact Credentials & Skills */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Contact Credentials Card */}
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Direct Contact Credentials</span>
                      </h4>

                      {/* Email */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                        <div className="truncate pr-2">
                          <span className="text-[10px] text-neutral-400 block font-medium">Business Email</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{scrapedProfile.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(scrapedProfile.email);
                            toast.success("Email copied to clipboard!");
                          }}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                          title="Copy email"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Profile URL */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                        <div className="truncate pr-2">
                          <span className="text-[10px] text-neutral-400 block font-medium">LinkedIn URL</span>
                          <span className="font-medium text-neutral-600 dark:text-neutral-400 truncate text-[11px] block">{scrapedProfile.linkedinUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(scrapedProfile.linkedinUrl);
                            toast.success("Profile URL copied to clipboard!");
                          }}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                          title="Copy URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Skills Tags */}
                    {scrapedProfile.skills && scrapedProfile.skills.length > 0 && (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 space-y-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Extracted Skills & Expertise</span>
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {scrapedProfile.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved to CRM Success Notification */}
                {profileSavedSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-palm-leaf-50 dark:bg-palm-leaf-950/40 border border-palm-leaf-200 dark:border-palm-leaf-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-palm-leaf-900 dark:text-palm-leaf-200 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-palm-leaf-600" />
                      <span>{scrapedProfile.name} is now saved into your Leads CRM!</span>
                    </div>
                    <Link
                      href="/dashboard/leads"
                      className="inline-flex items-center gap-1 font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline"
                    >
                      <span>View Leads CRM</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ==================== TAB 1: LinkedIn Search Extractor ==================== */}
      {activeSource === "LinkedIn Search" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* LinkedIn Search Configuration Card */}
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center">
                  <LinkedInIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    LinkedIn People Search Extractor
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Selenium WebDriver engine configured to extract profiles, titles, and locations.
                  </p>
                </div>
              </div>

              {/* Engine Toggle */}
              <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setEngineMode("live")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    engineMode === "live"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  Selenium Live Chrome
                </button>
                <button
                  type="button"
                  onClick={() => setEngineMode("fast")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    engineMode === "fast"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  Fast AI Mode
                </button>
              </div>
            </div>

            {/* Preset quick pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-neutral-400 text-[11px] font-medium">Quick Presets:</span>
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setKeywords(p.kw);
                    setLocation(p.loc);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800 text-[11px] transition-colors cursor-pointer"
                >
                  {p.kw} • {p.loc}
                </button>
              ))}
            </div>

            {/* Search Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Keywords / Job Title</span>
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. Marketing Data Analyst"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Location / City</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Berlin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs focus:outline-none focus:border-palm-leaf-500 font-medium"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {isExtracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                    <span>{isExtracting ? "Extracting..." : "Run"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Python Selenium Snippet Disclosure */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <Code2 className="h-3.5 w-3.5 text-palm-leaf-600" />
                <span className="font-medium">
                  {showCodeSnippet ? "Hide Selenium Python Script" : "View Selenium Python Automation Script"}
                </span>
                {showCodeSnippet ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              <AnimatePresence>
                {showCodeSnippet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-200 p-4 font-mono text-[11px] overflow-hidden relative"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[10px] text-neutral-400">
                      <span>scripts/linkedin_extractor.py</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pythonSnippet);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-palm-leaf-400 hover:text-palm-leaf-300"
                      >
                        {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-neutral-300 leading-relaxed max-h-56">
                      {pythonSnippet}
                    </pre>
                    <div className="mt-3 pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
                      <span>CLI execution: python scripts/linkedin_extractor.py --keywords &quot;{keywords}&quot; --location &quot;{location}&quot;</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                  Extracting Leads from LinkedIn
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
                      {extractedLeads.length} Leads Extracted for &quot;{keywords}&quot; in {location}
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
                          ? "Imported into Database"
                          : `Import ${parsedCsvResult.readyCount} Leads into CRM`}
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
