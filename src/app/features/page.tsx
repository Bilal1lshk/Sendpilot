import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import {
  Sparkles,
  ArrowRight,
  Target,
  Database,
  GitBranch,
  CalendarCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  Shield,
  Zap,
  Users2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features | SendPilot Outbound Platform",
  description:
    "Explore SendPilot features: AI lead scoring, smart enrichment, personalized hook generation, drag & drop pipeline, and automated cadence alerts.",
};

const comparisonPoints = [
  {
    category: "Lead Research",
    legacy: "Manual LinkedIn scraping and outdated static databases",
    sendpilot: "Real-time AI enrichment with funding, tech stack, and intent signals",
  },
  {
    category: "Qualification",
    legacy: "Reps manually vetting hundreds of profiles every day",
    sendpilot: "Automated 0–100% algorithmic ICP scoring based on your rules",
  },
  {
    category: "Message Personalization",
    legacy: "Generic {{firstName}} email templates with 1-2% reply rates",
    sendpilot: "Contextual AI icebreakers citing verified events & achievements",
  },
  {
    category: "Sending Safety",
    legacy: "Datacenter bots triggering LinkedIn CAPTCHAs and account bans",
    sendpilot: "Residential browser execution with native Human-in-the-Loop review",
  },
  {
    category: "Pipeline Management",
    legacy: "Scattered spreadsheets and missed follow-up deadlines",
    sendpilot: "Visual Kanban pipeline with smart snooze and cadence alerts",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Features Hero */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-neutral-700" />
                <span>Feature Deep Dive</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1]">
                Powerful outbound capabilities, zero complexity.
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Discover the toolkit engineered to help founders, SDR teams, and growth agencies scale qualified conversations without burning out.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/get-started"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-neutral-800 text-white px-7 py-3.5 text-sm font-semibold transition-colors shadow-xs"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-300 hover:bg-neutral-100 bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <FeaturesSection />

        {/* Legacy Outbound vs SendPilot Comparison */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                How SendPilot compares to traditional outbound.
              </h2>
              <p className="text-neutral-600 text-base max-w-2xl mx-auto">
                Built specifically for high deliverability, personalized relevance, and sales rep sanity.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-xs bg-white">
              <div className="grid grid-cols-1 md:grid-cols-12 bg-neutral-100 text-neutral-900 border-b border-neutral-200 p-4 sm:p-5 text-xs font-bold uppercase tracking-wider">
                <div className="md:col-span-3">Capability</div>
                <div className="md:col-span-4 text-neutral-500">Traditional Outbound</div>
                <div className="md:col-span-5 text-black">SendPilot AI Platform</div>
              </div>

              <div className="divide-y divide-neutral-200 text-sm">
                {comparisonPoints.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 sm:gap-4 items-center hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="md:col-span-3 font-bold text-black text-xs uppercase tracking-wide">
                      {item.category}
                    </div>

                    <div className="md:col-span-4 flex items-start gap-2 text-neutral-500 text-xs sm:text-sm">
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{item.legacy}</span>
                    </div>

                    <div className="md:col-span-5 flex items-start gap-2 text-neutral-900 text-xs sm:text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item.sendpilot}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Experience the SendPilot difference.
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
              Start building high-intent pipeline today with our 14-day risk-free trial.
            </p>
            <div className="pt-2">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-100 text-black px-8 py-3.5 text-sm font-bold shadow-sm transition-colors"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
