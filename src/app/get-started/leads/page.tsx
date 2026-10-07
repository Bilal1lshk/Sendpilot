"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { CsvImportWizard } from "@/components/onboarding/CsvImportWizard";
import { EmptyState } from "@/components/onboarding/EmptyState";
import { LeadsStepData } from "@/types/onboarding";

export default function LeadsStepPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);

  const [leadsData, setLeadsData] = useState<LeadsStepData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const state = await fetchOnboardingState();
        if (state.step3.data?.leads && state.step3.data.leads.length > 0) {
          setLeadsData(state.step3.data);
          setShowWizard(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleImportComplete = async (imported: LeadsStepData) => {
    setLeadsData(imported);
    setShowWizard(true);
    await saveOnboardingStep("step3", "completed", imported);
    toast.success(`${imported.readyCount} qualified leads ready for campaign!`);
  };

  const handleSkip = async () => {
    await saveOnboardingStep("step3", "skipped");
    router.push("/get-started/campaign");
  };

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      if (leadsData && leadsData.leads.length > 0) {
        await saveOnboardingStep("step3", "completed", leadsData);
      } else {
        await saveOnboardingStep("step3", "completed", {
          importType: "csv",
          readyCount: 270,
          duplicateCount: 20,
          invalidCount: 10,
          suppressionCount: 4,
          leads: [],
        });
      }
      router.push("/get-started/campaign");
    } finally {
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

  const hasLeads = leadsData && leadsData.leads && leadsData.leads.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          href="/get-started"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Get Started</span>
        </Link>

        {/* Card Container */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                <span>Step 3 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Import Your Leads
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                From LinkedIn, Sales Nav, or CSV upload. Fast and simple.
              </p>
            </div>

            {hasLeads && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {leadsData.readyCount} Leads
              </span>
            )}
          </div>

          {/* Empty State vs Import Wizard */}
          {!showWizard && !hasLeads ? (
            <EmptyState
              icon={<Users className="h-6 w-6 text-emerald-600" />}
              title="No leads yet"
              description="Upload your prospective customers via CSV, Sales Navigator list export, or by pasting LinkedIn profile links directly."
              primaryAction={{
                label: "Add Leads",
                onClick: () => setShowWizard(true),
                icon: <FileSpreadsheet className="h-4 w-4" />,
              }}
              secondaryAction={{
                label: "Skip",
                onClick: handleSkip,
              }}
            />
          ) : (
            <CsvImportWizard
              onComplete={handleImportComplete}
              initialData={leadsData || undefined}
            />
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
            >
              Skip this step
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Continue to Campaign</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
