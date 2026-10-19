"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepCard } from "@/components/onboarding/StepCard";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { OnboardingState, StepStatus, OnboardingStepKey } from "@/types/onboarding";
import { pageVariants, cardVariants } from "@/lib/motion";

export default function GetStartedPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "there";

  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchOnboardingState();
        setState(data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 p-6 md:p-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-6 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 w-full bg-neutral-200/50 dark:bg-neutral-800/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stepsList: Array<{
    stepNumber: number;
    title: string;
    description: string;
    status: StepStatus;
    href: string;
    key: string;
  }> = [
    {
      stepNumber: 1,
      title: "Set Up Your Profile",
      description:
        "Add your sender details so outreach copy matches your voice.",
      status: state.step1.status,
      href: "/get-started/account",
      key: "step1",
    },
    {
      stepNumber: 2,
      title: "Connect Your LinkedIn Profile",
      description: "Connect your sender profile to deliver outreach safely.",
      status: state.step2.status,
      href: "/get-started/connect",
      key: "step2",
    },
    {
      stepNumber: 3,
      title: "Import Your Leads",
      description: "From LinkedIn, Sales Nav, or CSV upload. Fast and simple.",
      status: state.step3.status,
      href: "/get-started/leads",
      key: "step3",
    },
    {
      stepNumber: 4,
      title: "Start Your First Campaign",
      description: "Automate outreach, manage sequence channels and review AI copy.",
      status: state.step4.status,
      href: "/get-started/campaign",
      key: "step4",
    },
    {
      stepNumber: 5,
      title: "Create Your Workspace",
      description: "Name and activate the dedicated workspace you will work in.",
      status: (state.onboardingCompleted
        ? "completed"
        : state.step4.status === "completed"
        ? "in_progress"
        : "not_started") as StepStatus,
      href: "/get-started/workspace",
      key: "workspace",
    },
  ];

  const completedCount = stepsList.filter((s) => s.status === "completed").length;
  const isWorkspaceReady = Boolean(state.onboardingCompleted);
  const campaignLaunched = state.step4.status === "completed";

  const firstUnfinishedIndex = stepsList.findIndex(
    (s) => s.status !== "completed" && s.status !== "skipped"
  );

  const handleResumeStep = async (key: string) => {
    if (key === "workspace") return;
    const updated = await saveOnboardingStep(key as OnboardingStepKey, "not_started");
    setState(updated);
  };

  const handleSkipStep = async (key: string) => {
    if (key === "workspace") return;
    const updated = await saveOnboardingStep(key as OnboardingStepKey, "skipped");
    setState(updated);
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 py-12 px-4 sm:px-6">
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Top Header */}
        <motion.div variants={cardVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Get started
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Five steps to launch your first campaign and set up your workspace.
              </p>
            </div>

            <Link
              href={isWorkspaceReady ? "/dashboard" : "/get-started/workspace"}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Progress Bar Component */}
          <ProgressBar currentStep={completedCount} totalSteps={5} />
        </motion.div>

        {/* Campaign Done, Workspace Required Banner */}
        <AnimatePresence>
          {campaignLaunched && !isWorkspaceReady && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 p-6 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Campaign launched! Final Step: Create Your Workspace
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Name and create your workspace to unlock your dashboard and monitor real-time campaign replies.
                    </p>
                  </div>
                </div>

                <Link
                  href="/get-started/workspace"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <span>Create Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          )}

          {isWorkspaceReady && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-6 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      You&apos;re all set, {firstName}.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Your workspace &quot;{state.workspaceName || "SendPilot"}&quot; is active. Your first campaign is ready.
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <span>Open dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Four Step Cards Stacked Vertically */}
        <div className="space-y-3.5">
          {stepsList.map((step, index) => {
            const isCurrent = index === firstUnfinishedIndex;
            return (
              <StepCard
                key={step.key}
                stepNumber={step.stepNumber}
                title={step.title}
                description={step.description}
                status={step.status}
                isCurrent={isCurrent}
                actionHref={step.href}
                actionLabel={
                  step.stepNumber === 1
                    ? "Set up account"
                    : step.stepNumber === 5
                    ? "Create workspace"
                    : "Continue"
                }
                onResume={() => handleResumeStep(step.key)}
                onSkip={
                  step.stepNumber !== 5 && step.status !== "completed" && step.status !== "skipped"
                    ? () => handleSkipStep(step.key)
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-neutral-400">
            Progress is automatically saved per workspace. You can return anytime.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
