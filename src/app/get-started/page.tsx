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
import { OnboardingState, StepStatus } from "@/types/onboarding";
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
    key: keyof OnboardingState;
  }> = [
    {
      stepNumber: 1,
      title: "Create Your Account",
      description:
        "Your workspace is set up. Add your details so outreach looks like you.",
      status: state.step1.status,
      href: "/get-started/account",
      key: "step1",
    },
    {
      stepNumber: 2,
      title: "Connect Your LinkedIn Profiles",
      description: "Add yours and your teammates' profiles in seconds.",
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
      description: "Automate outreach, manage channels and track replies.",
      status: state.step4.status,
      href: "/get-started/campaign",
      key: "step4",
    },
  ];

  const completedCount = stepsList.filter((s) => s.status === "completed").length;
  const allFinishedOrSkipped = stepsList.every(
    (s) => s.status === "completed" || s.status === "skipped"
  );

  const firstUnfinishedIndex = stepsList.findIndex(
    (s) => s.status !== "completed" && s.status !== "skipped"
  );

  const handleResumeStep = async (key: keyof OnboardingState) => {
    const updated = await saveOnboardingStep(key, "not_started");
    setState(updated);
  };

  const handleSkipStep = async (key: keyof OnboardingState) => {
    const updated = await saveOnboardingStep(key, "skipped");
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
                Four quick steps to activate your LinkedIn outreach workspace.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Progress Bar Component with smooth 500ms fill */}
          <ProgressBar currentStep={completedCount} totalSteps={4} />
        </motion.div>

        {/* All Set Card: "You're all set, {firstName}." with single button to dashboard */}
        <AnimatePresence>
          {allFinishedOrSkipped && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-palm-leaf-200/80 dark:border-palm-leaf-900/60 bg-palm-leaf-50/60 dark:bg-palm-leaf-950/20 p-6 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-palm-leaf-600 text-white shadow-2xs">
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      You&apos;re all set, {firstName}.
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Your workspace is ready. You can now monitor campaigns and daily tasks.
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all shrink-0"
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
                actionLabel={step.stepNumber === 1 ? "Set up account" : "Continue"}
                onResume={() => handleResumeStep(step.key)}
                onSkip={
                  step.status !== "completed" && step.status !== "skipped"
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
