"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Upload, Mail, Inbox } from "lucide-react";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: "1",
      title: "Bring your leads",
      description:
        "Paste a search link or upload a list of names. SendPilot reviews each profile to check if they match what you offer.",
      preview: {
        type: "leads",
        title: "Profile check",
        line1: "Matched: 12-person agency in Lahore",
        line2: "Activity: Posted 3 listings last week",
        badge: "Strong fit",
      },
    },
    {
      number: "2",
      title: "Review the drafts",
      description:
        "Read the proposed first message. If it sounds like you, approve it. If not, tweak a word or dismiss it in one click.",
      preview: {
        type: "draft",
        title: "Proposed message",
        line1: "“Saw your team took on the commercial project...”",
        line2: "Status: Waiting for your review",
        badge: "Requires approval",
      },
    },
    {
      number: "3",
      title: "Answer replies in one place",
      description:
        "When someone responds, it shows up in your unified inbox with the full conversation history ready for your reply.",
      preview: {
        type: "inbox",
        title: "Unified inbox",
        line1: "Tariq Mansoor replied: “Let's speak Tuesday.”",
        line2: "Next step: Book calendar intro",
        badge: "Positive reply",
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-20 border-t border-[#E7E5E0] dark:border-[#2A2E31] bg-[#FAF9F6] dark:bg-[#141718]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section label */}
        <div className="mb-10">
          <span className="text-[13px] font-medium text-[#626669] dark:text-[#9BA0A4]">
            How it works
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#16191A] dark:text-[#F2F2F0] tracking-tight mt-1">
            Three simple steps. You stay in control.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Calm vertical list */}
          <div className="lg:col-span-6 space-y-4">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;

              return (
                <div
                  key={step.number}
                  onClick={() => setActiveStep(idx)}
                  className={`p-5 rounded-[12px] border cursor-pointer transition-all ${
                    isActive
                      ? "border-[#E7E5E0] dark:border-[#2A2E31] bg-white dark:bg-[#1B1E20] shadow-[0_1px_3px_rgba(22,25,26,0.04)]"
                      : "border-transparent bg-transparent hover:bg-[#F4F3EF]/60 dark:hover:bg-[#1B1E20]/40 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-7 w-7 rounded-full text-xs font-semibold items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-[#1F7A52] text-white"
                          : "bg-[#EFECE6] dark:bg-[#2A2E31] text-[#626669] dark:text-[#9BA0A4]"
                      }`}
                    >
                      {step.number}
                    </span>

                    <div>
                      <h3 className="text-base font-semibold text-[#16191A] dark:text-[#F2F2F0]">
                        {step.title}
                      </h3>
                      <p className="text-[13px] text-[#626669] dark:text-[#9BA0A4] leading-relaxed mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Matching UI snippet changing with the active step */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-8 rounded-[12px] border border-[#E7E5E0] dark:border-[#2A2E31] bg-white dark:bg-[#1B1E20] shadow-[0_1px_3px_rgba(22,25,26,0.04)] min-h-[220px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E0] dark:border-[#2A2E31]">
                    <span className="text-xs font-semibold text-[#16191A] dark:text-[#F2F2F0]">
                      {steps[activeStep].preview.title}
                    </span>
                    <span className="text-[11px] font-medium text-[#1F7A52] dark:text-[#52C58F] bg-[#F0F8F3] dark:bg-[#142B20] px-2 py-0.5 rounded-full border border-[#D7EBE0] dark:border-[#1F4532]">
                      {steps[activeStep].preview.badge}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[8px] border border-[#E7E5E0] dark:border-[#2A2E31] bg-[#FAF9F6] dark:bg-[#141718] text-xs space-y-1.5">
                    <p className="font-medium text-[#16191A] dark:text-[#F2F2F0]">
                      {steps[activeStep].preview.line1}
                    </p>
                    <p className="text-[#626669] dark:text-[#9BA0A4]">
                      {steps[activeStep].preview.line2}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
