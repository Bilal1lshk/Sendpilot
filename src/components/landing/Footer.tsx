"use client";

import Link from "next/link";
import { Zap, ArrowRight, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Pre-Footer Conversion Banner */}
        <div className="rounded-3xl bg-gradient-to-tr from-palm-leaf-800 via-palm-leaf-900 to-neutral-900 p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl border border-palm-leaf-700/40">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to turn leads into high-converting conversations?
            </h3>
            <p className="text-sm text-palm-leaf-100/90 max-w-xl">
              Join thousands of modern sales reps, agencies, and founders scaling qualified outbound with SendPilot.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-palm-leaf-500 hover:bg-palm-leaf-400 text-neutral-950 px-6 py-3.5 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 hover:bg-white/10 px-6 py-3.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          {/* Brand info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-palm-leaf-600 text-white shadow-xs">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                Send<span className="text-palm-leaf-400">Pilot</span>
              </span>
            </Link>
            <p className="text-neutral-400 leading-relaxed max-w-sm">
              The AI-powered lead generation and assisted outreach platform for modern sales teams, founders, and scaling agencies.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-palm-leaf-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Product
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#solution" className="hover:text-white transition-colors">Workspace</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">AI Lead Scoring</a></li>
              <li><a href="#ai-assistant" className="hover:text-white transition-colors">AI Sales Copilot</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Pipeline Tracker</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Resources
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li><Link href="/get-started" className="hover:text-white transition-colors">Onboarding Guide</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Best Practices</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Sample CSV Templates</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">API Documentation</span></li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-3">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Trust &amp; Legal
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Security Overview</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">LinkedIn Compliance</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Contact Support</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} SendPilot Inc. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-palm-leaf-400" />
            <span>Built for high-converting, compliant outbound.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
