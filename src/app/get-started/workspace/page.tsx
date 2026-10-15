"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Users,
  Target,
  Briefcase,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { fetchOnboardingState, saveWorkspaceSetup } from "@/lib/onboarding-client";

const INDUSTRY_OPTIONS = [
  "B2B SaaS & Tech",
  "Agency & Lead Gen",
  "Consulting & Professional Services",
  "Recruiting & Executive Search",
  "E-commerce & Retail Tech",
  "Financial Services & FinTech",
];

const TEAM_SIZES = [
  { id: "solo", label: "Solo Founder / Rep", count: "1 person" },
  { id: "small", label: "Small Outbound Team", count: "2 - 5 reps" },
  { id: "growth", label: "Growing Sales Team", count: "6 - 20 reps" },
  { id: "enterprise", label: "Agency / Enterprise", count: "20+ reps" },
];

const GOAL_OPTIONS = [
  "Book sales calls & demos",
  "Recruit key executive talent",
  "Expand B2B partner ecosystem",
  "Connect with investors & angels",
];

export default function WorkspaceStepPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [industry, setIndustry] = useState("B2B SaaS & Tech");
  const [teamSize, setTeamSize] = useState("solo");
  const [primaryGoal, setPrimaryGoal] = useState("Book sales calls & demos");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const state = await fetchOnboardingState();
        const compName = state.step1?.data?.companyName || "";
        const userName = session?.user?.name || state.step1?.data?.fullName || "";
        setCompanyName(compName);

        // Prepopulate workspace name
        if (state.workspaceName && state.workspaceName !== "Default Workspace") {
          setWorkspaceName(state.workspaceName);
        } else if (compName) {
          setWorkspaceName(`${compName} Outbound`);
        } else if (userName) {
          setWorkspaceName(`${userName.split(" ")[0]}'s Workspace`);
        } else {
          setWorkspaceName("Growth Engine");
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [session]);

  const handleSuggestionClick = (suggested: string) => {
    setWorkspaceName(suggested);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setIsSaving(true);
    try {
      await saveWorkspaceSetup(workspaceName.trim());
      toast.success(`Workspace "${workspaceName.trim()}" created! Welcome to SendPilot.`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to create workspace. Please try again.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const baseCompany = companyName.trim() || "Apex";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation */}
        <Link
          href="/get-started/campaign"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Campaign Setup</span>
        </Link>

        {/* Card Container */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-5 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Final Step • Required Workspace Setup</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Create Your Workspace
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Your first campaign is ready. Create the dedicated workspace where you and your team will monitor leads, manage accounts, and scale replies.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Workspace Name */}
            <div className="space-y-2">
              <label
                htmlFor="workspaceName"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Workspace Name</span>
                <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="workspaceName"
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Sales HQ, Growth Engine"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                />
              </div>

              {/* Suggestions chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-neutral-400 mr-1">Suggestions:</span>
                {[
                  `${baseCompany} HQ`,
                  `${baseCompany} Outbound`,
                  "Sales Pipeline",
                  "Growth Engine",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSuggestionClick(sug)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Industry / Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                <span>Industry Focus</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INDUSTRY_OPTIONS.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(ind)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs text-left font-medium transition-all cursor-pointer ${
                      industry === ind
                        ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span>{ind}</span>
                    {industry === ind && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Team Size */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>Team Size</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEAM_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setTeamSize(size.id)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      teamSize === size.id
                        ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div className="text-xs font-semibold">{size.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{size.count}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Primary Goal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-600" />
                <span>Primary Outreach Objective</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setPrimaryGoal(goal)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs text-left font-medium transition-all cursor-pointer ${
                      primaryGoal === goal
                        ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span>{goal}</span>
                    {primaryGoal === goal && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Workspace Preview Card */}
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 p-4 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Sidebar Preview
              </span>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                  {workspaceName ? workspaceName.slice(0, 2).toUpperCase() : "SP"}
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {workspaceName.trim() || "Your Workspace Name"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {industry} • Active Workspace
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <Link
                href="/get-started"
                className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Back to Onboarding
              </Link>

              <button
                type="submit"
                disabled={isSaving || !workspaceName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Workspace & Enter Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
