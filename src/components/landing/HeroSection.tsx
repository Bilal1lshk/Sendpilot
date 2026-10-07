"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/tokens";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column (headline, copy, CTAs, reassurance) */}
          <div className="lg:col-span-6 space-y-6 lg:py-4">
            {/* Small plain label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                For small sales teams
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl leading-[1.08] font-normal text-black tracking-tight"
            >
              Find the right people.{" "}
              <span className="text-[#1F7A52]">Say something worth replying to.</span>
            </motion.h1>

            {/* Support text */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg leading-relaxed text-neutral-600 max-w-lg font-normal"
            >
              {PRODUCT_NAME} helps you pick good leads, draft a personal first message, and keep every reply in one inbox. You approve every message before it goes out.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 pt-1"
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-black hover:bg-neutral-800 text-white text-sm font-semibold transition-all hover:-translate-y-[1px] active:scale-[0.98] shadow-xs"
              >
                Start free
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-black transition-colors py-2 px-1 rounded-md"
              >
                <span>See how it works</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Reassurance line */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs text-neutral-500 pt-1"
            >
              No credit card. Your LinkedIn password is never shared with us.
            </motion.p>
          </div>

          {/* Right Column: Clean image only on white background */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-xl aspect-16/10">
              <Image
                src="/hero-clock.png"
                alt="SendPilot outreach schedule"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 560px"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
