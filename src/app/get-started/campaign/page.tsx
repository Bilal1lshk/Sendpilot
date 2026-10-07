"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { CampaignWizard } from "@/components/onboarding/CampaignWizard";
import { CampaignStepData } from "@/types/onboarding";

export default function CampaignStepPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [campaignData, setCampaignData] = useState<CampaignStepData | null>(
    null
  );
  const [leadsCount, setLeadsCount] = useState<number>(270);

  useEffect(() => {
    async function load() {
      try {
        const state = await fetchOnboardingState();
        if (state.step4.data) {
          setCampaignData(state.step4.data);
        }
        if (state.step3.data?.readyCount) {
          setLeadsCount(state.step3.data.readyCount);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleCampaignComplete = async (completedData: CampaignStepData) => {
    setCampaignData(completedData);
    await saveOnboardingStep("step4", "completed", completedData);
    toast.success("First outreach campaign launched!");
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    try {
      if (!campaignData || campaignData.status !== "launched") {
        await saveOnboardingStep("step4", "completed", {
          ...campaignData,
          status: "launched",
        });
      }
      toast.success("Onboarding complete! Welcome to SendPilot.");
      router.push("/dashboard");
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

  const isLaunched = campaignData?.status === "launched";

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
                <Sparkles className="h-3 w-3" />
                <span>Step 4 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Start Your First Campaign
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Automate outreach, manage channels and track replies.
              </p>
            </div>

            {isLaunched && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Campaign Active
              </span>
            )}
          </div>

          {/* Campaign Wizard */}
          <CampaignWizard
            onComplete={handleCampaignComplete}
            initialData={campaignData || undefined}
            availableLeadsCount={leadsCount}
          />

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              href="/get-started"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Back to Overview
            </Link>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Completing...</span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Go to Dashboard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
