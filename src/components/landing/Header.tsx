"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/tokens";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-[border-color,background-color] duration-200 ${
        scrolled
          ? "border-b border-[#E7E5E0] dark:border-[#2A2E31] bg-[#FAF9F6]/90 dark:bg-[#141718]/90 backdrop-blur-md"
          : "border-b border-transparent bg-[#FAF9F6] dark:bg-[#141718]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[#16191A] dark:text-[#F2F2F0] focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-md"
        >
          {/* Calm, geometric logo glyph without gradients */}
          <div className="h-7 w-7 rounded-lg bg-[#1F7A52] flex items-center justify-center text-white font-semibold text-xs tracking-tight">
            SP
          </div>
          <span className="font-semibold text-base tracking-tight">
            {PRODUCT_NAME}
          </span>
        </Link>

        {/* Quiet Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-[#626669] dark:text-[#9BA0A4]">
          <Link
            href="#product"
            className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-sm"
          >
            Product
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-sm"
          >
            How it works
          </Link>
          <Link
            href="#pricing"
            className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-sm"
          >
            Pricing
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] text-[#626669] dark:text-[#9BA0A4] hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors py-2 px-1 focus-visible:outline-2 focus-visible:outline-[#1F7A52] rounded-md"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center justify-center h-9 sm:h-9 px-3.5 rounded-[8px] bg-[#1F7A52] hover:bg-[#186342] text-white text-[13px] font-medium transition-transform active:scale-[0.98] hover:-translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F7A52]"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
