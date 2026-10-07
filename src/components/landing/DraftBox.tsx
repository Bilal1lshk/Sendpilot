"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface DraftBoxProps {
  message: string;
  isFirst: boolean;
  isApproved: boolean;
  onApprove: () => void;
  onEdit: () => void;
}

export function DraftBox({
  message,
  isFirst,
  isApproved,
  onApprove,
  onEdit,
}: DraftBoxProps) {
  // If first row, type out quickly once, skippable by click
  const [displayedText, setDisplayedText] = useState(isFirst ? "" : message);
  const [isTyping, setIsTyping] = useState(isFirst);

  useEffect(() => {
    if (!isFirst) return;

    // Check reduced motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedText(message);
      setIsTyping(false);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      if (i >= message.length) {
        setDisplayedText(message);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedText(message.slice(0, i));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [isFirst, message]);

  const handleSkipTyping = () => {
    if (isTyping) {
      setDisplayedText(message);
      setIsTyping(false);
    }
  };

  return (
    <div
      onClick={handleSkipTyping}
      className={`mt-2.5 p-3 rounded-[8px] border transition-colors ${
        isApproved
          ? "border-[#D7EBE0] dark:border-[#1F4532] bg-[#FAFDFB] dark:bg-[#12231A]"
          : "border-[#E7E5E0] dark:border-[#2A2E31] bg-[#F4F3EF]/70 dark:bg-[#202426]"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-[#8C9196] dark:text-[#6E7377]">
          {isApproved ? "Approved message" : "Draft"}
        </span>

        {/* Hover / focus actions */}
        <div className="flex items-center gap-1.5">
          {!isApproved ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="text-[11px] text-[#626669] dark:text-[#9BA0A4] hover:text-[#16191A] dark:hover:text-[#F2F2F0] px-1.5 py-0.5 rounded hover:bg-[#EAE8E2] dark:hover:bg-[#2C3134] transition-colors focus-visible:outline-2 focus-visible:outline-[#1F7A52]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F7A52] dark:text-[#52C58F] px-2 py-0.5 rounded border border-[#CDE5D8] dark:border-[#1F4532] bg-white dark:bg-[#183024] hover:bg-[#F0F8F3] dark:hover:bg-[#1F3D2E] transition-all hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#1F7A52]"
              >
                Approve
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F7A52] dark:text-[#52C58F]">
              <Check className="h-3 w-3 stroke-[2.5]" />
              Approved
            </span>
          )}
        </div>
      </div>

      <p className="text-[12px] text-[#16191A] dark:text-[#E6E8EA] leading-[1.5] select-text">
        &ldquo;{displayedText}&rdquo;
        {isTyping && <span className="inline-block w-1 h-3 bg-[#1F7A52] ml-0.5 animate-pulse" />}
      </p>
    </div>
  );
}
