"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, ArrowRight, RotateCcw } from "lucide-react";
import { StepStatus } from "@/types/onboarding";
import { cardVariants } from "@/lib/motion";

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  status: StepStatus;
  isCurrent: boolean;
  actionHref: string;
  actionLabel?: string;
  onResume?: () => void;
  onSkip?: () => void;
}

export function StepCard({
  stepNumber,
  title,
  description,
  status,
  isCurrent,
  actionHref,
  actionLabel = "Continue",
  onResume,
  onSkip,
}: StepCardProps) {
  const isCompleted = status === "completed";
  const isSkipped = status === "skipped";

  return (
    <motion.div
      variants={cardVariants}
      layout
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border transition-colors ${
        isCompleted
          ? "border-neutral-200/60 bg-white/60 dark:border-neutral-800/60 dark:bg-neutral-900/40"
          : isCurrent
          ? "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xs"
          : "border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/40 dark:bg-neutral-900/30 opacity-70"
      } p-5 sm:p-6`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Step badge, title, desc */}
        <div className="flex items-start gap-3.5">
          {/* Badge */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
              isCompleted
                ? "bg-palm-leaf-100 text-palm-leaf-800 dark:bg-palm-leaf-950 dark:text-palm-leaf-300"
                : isCurrent
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : stepNumber}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h3>

              {isCompleted && (
                <span className="text-[10px] font-medium text-palm-leaf-700 dark:text-palm-leaf-400">
                  Completed
                </span>
              )}
              {isSkipped && (
                <span className="text-[10px] text-neutral-400">
                  Skipped. Resume anytime.
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 sm:shrink-0 pt-2 sm:pt-0 pl-11 sm:pl-0">
          {isCompleted ? (
            <Link
              href={actionHref}
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              Review
            </Link>
          ) : isSkipped ? (
            <div className="flex items-center gap-2">
              {onResume ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline cursor-pointer font-medium"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Resume</span>
                </button>
              ) : (
                <Link
                  href={actionHref}
                  className="inline-flex items-center gap-1 text-xs text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline font-medium"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Resume</span>
                </Link>
              )}
            </div>
          ) : isCurrent ? (
            <div className="flex items-center gap-2">
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                >
                  Skip
                </button>
              )}
              <Link
                href={actionHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <span>Start</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
