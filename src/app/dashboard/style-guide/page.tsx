"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Check,
  Send,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Database,
  Eye,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { microcopy } from "@/lib/microcopy";
import { pageVariants, cardVariants } from "@/lib/motion";

export default function StyleGuidePage() {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [toggleState, setToggleState] = useState(true);

  const simulateLoading = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 1500);
  };

  const PALETTE_SWATCHES = [
    { name: "50", hex: "#f6faeb" },
    { name: "100", hex: "#edf5d6" },
    { name: "200", hex: "#daeaae" },
    { name: "300", hex: "#c8e085" },
    { name: "400", hex: "#b5d55d" },
    { name: "500", hex: "#a3cb34" },
    { name: "600", hex: "#82a22a" },
    { name: "700", hex: "#627a1f" },
    { name: "800", hex: "#415115" },
    { name: "900", hex: "#21290a" },
    { name: "950", hex: "#171c07" },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="space-y-1">
        <div className="flex items-center gap-2 text-palm-leaf-700 dark:text-palm-leaf-400">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Design System</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          SendPilot Design & Motion Guide
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Reference for colours, typography, spacing, human microcopy, and animation tokens.
        </p>
      </motion.div>

      {/* 1. Color Palette: palm-leaf */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          1. Brand Palette: Palm Leaf
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Primary accent green used for high-intent actions, active states, and positive status badges.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 pt-2">
          {PALETTE_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="space-y-1 text-center">
              <div
                className="h-10 rounded-xl border border-neutral-200/50 shadow-2xs"
                style={{ backgroundColor: swatch.hex }}
              />
              <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200 block">
                {swatch.name}
              </span>
              <span className="text-[9px] text-neutral-400 font-mono block">
                {swatch.hex}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. Typography & Numbers */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          2. Typography & Large Numbers
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Numbers are large and count up once on view. Labels are small and quiet. Maximum 2 font weights.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <span className="text-xs text-neutral-500 block">Total outreach leads</span>
            <AnimatedCounter
              value={2480}
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1 block"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">85 added this week</span>
          </div>

          <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <span className="text-xs text-neutral-500 block">Acceptance rate</span>
            <AnimatedCounter
              value={46}
              suffix="%"
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1 block"
            />
            <span className="text-[11px] text-palm-leaf-700 font-medium mt-1 block">4% higher than benchmark</span>
          </div>

          <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <span className="text-xs text-neutral-500 block">Active replies</span>
            <AnimatedCounter
              value={38}
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1 block"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">12 new this week</span>
          </div>
        </div>
      </motion.div>

      {/* 3. Buttons & Micro-Interactions */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          3. Buttons & Motion States
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          1px lift on hover, slight press-down on click. Loading buttons preserve width and show a subtle spinner.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Primary */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Primary action</span>
          </button>

          {/* Secondary */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <span>Secondary outline</span>
          </button>

          {/* Loading interactive state */}
          <button
            type="button"
            onClick={simulateLoading}
            disabled={buttonLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 w-36 py-2 text-xs font-semibold shadow-xs transition-all"
          >
            {buttonLoading ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Simulate save</span>
            )}
          </button>

          {/* Smooth Toggle */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-neutral-500">Smooth toggle:</span>
            <button
              type="button"
              onClick={() => setToggleState(!toggleState)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                toggleState ? "bg-palm-leaf-600" : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  toggleState ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4. Badges & Status Indicators */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          4. Badges & Human Status States
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Pulsing green dots for Active, steady amber for Paused, muted rose for Disconnected.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Active */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active profile
          </span>

          {/* Paused */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Paused campaign
          </span>

          {/* Disconnected */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Disconnected
          </span>

          {/* ICP Match */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-palm-leaf-50 text-palm-leaf-900 dark:bg-palm-leaf-950 dark:text-palm-leaf-300 border border-palm-leaf-300/40">
            <Check className="h-3 w-3 text-palm-leaf-600" />
            92% ICP Match
          </span>
        </div>
      </motion.div>

      {/* 5. Human Microcopy Reference */}
      <motion.div variants={cardVariants} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          5. Human Microcopy Reference
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Plain spoken English. No fake urgency. Clear expectations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Empty leads</span>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200 font-medium">
              &ldquo;{microcopy.emptyStates.leads}&rdquo;
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Empty campaigns</span>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200 font-medium">
              &ldquo;{microcopy.emptyStates.campaigns}&rdquo;
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Import success</span>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200 font-medium">
              &ldquo;{microcopy.feedback.leadsImportSuccess(270)}&rdquo;
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Safety consent</span>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200 font-medium">
              &ldquo;{microcopy.safety.plainConsent}&rdquo;
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
