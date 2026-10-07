"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductPreview } from "./ProductPreview";
import { PRODUCT_NAME } from "@/lib/tokens";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          {/* Left Column (about 45% -> 5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6 lg:pt-4">
            {/* Small plain label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-[13px] font-medium text-[#626669] dark:text-[#9BA0A4]">
                For small sales teams
              </span>
            </motion.div>

            {/* Headline: 56-64px desktop, tight, sentence case, dark ink */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-[56px] leading-[1.08] font-semibold text-[#16191A] dark:text-[#F2F2F0] tracking-[-0.03em]"
            >
              Find the right people. Say something{" "}
              <span className="text-[#1F7A52] dark:text-[#52C58F]">
                worth replying to.
              </span>
            </motion.h1>

            {/* Two sentences of support text */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] sm:text-[16px] leading-[1.55] text-[#626669] dark:text-[#9BA0A4] max-w-md font-normal"
            >
              {PRODUCT_NAME} helps you pick good leads, draft a personal first message, and keep every reply in one inbox. You approve every message before it goes out.
            </motion.p>

            {/* Primary button and quiet text link */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 pt-1"
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-[8px] bg-[#1F7A52] hover:bg-[#186342] text-white text-[14px] font-medium transition-all hover:-translate-y-[1px] active:scale-[0.98] shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F7A52]"
              >
                Start free
              </Link>

              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#626669] dark:text-[#9BA0A4] hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors py-2 px-1 focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-md"
              >
                <span>See how it works</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            {/* Reassurance line */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="text-[12px] text-[#8C9196] dark:text-[#6E7377] pt-1"
            >
              No credit card. Your LinkedIn password is never shared with us.
            </motion.p>
          </div>

          {/* Right Column (about 55% -> 7 cols on lg, slightly cropped/extended) */}
          <div className="lg:col-span-7 lg:-mr-6 xl:-mr-10 pt-2 lg:pt-0">
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
