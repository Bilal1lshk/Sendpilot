"use client";

import { motion } from "motion/react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  className?: string;
}

export function ProgressBar({
  currentStep,
  totalSteps = 4,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((currentStep / totalSteps) * 100))
  );

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500 dark:text-neutral-400">
          Onboarding progress
        </span>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
          {currentStep} of {totalSteps} completed
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Step ${currentStep} of ${totalSteps} completed`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-palm-leaf-500"
        />
      </div>
    </div>
  );
}
