import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SolutionSection } from "@/components/landing/SolutionSection";
import {
  Layers,
  ArrowRight,
  Sparkles,
  Database,
  Filter,
  UserCheck,
  Zap,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Share2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Product Overview | SendPilot Outbound Engine",
  description:
    "Explore the SendPilot workspace. Automated multi-source ingestion, real-time firmographic enrichment, ICP qualification, and assisted LinkedIn outreach.",
};

const productModules = [
  {
    title: "Multi-Source Lead Ingestion",
    tagline: "Sync Any Prospect Source in Seconds",
    desc: "Import CSV lists, LinkedIn Sales Navigator searches, or direct CRM segments. SendPilot deduplicates contacts, normalizes company names, and validates corporate emails automatically.",
    metrics: ["1-Click CSV Upload", "Auto De-duplication", "Email Syntax Hygiene"],
  },
  {
    title: "Continuous Firmographic Enrichment",
    tagline: "Live Company & Executive Dossiers",
    desc: "Every imported prospect is enriched with employee headcount, funding announcements, tech stack integrations, and current hiring signals to guarantee relevance.",
    metrics: ["Tech Stack Detection", "Funding Milestones", "Decision-Maker Verified Info"],
  },
  {
    title: "Algorithmic ICP Scoring Engine",
    tagline: "Zero In on 90%+ Match Prospects",
    desc: "Configure your Ideal Customer Profile criteria: title keywords, geography, industry vertical, and company revenue. Prospects are graded 0–100% so reps never waste time on bad fits.",
    metrics: ["Custom Scoring Weights", "Negative Keyword Filters", "Instant Qualification"],
  },
  {
    title: "Assisted Outbound & 1-Click Approval",
    tagline: "Human-in-the-Loop Safeguards",
    desc: "Our AI drafts customized conversation starters and follow-up threads. Reps retain complete control to review, edit, or batch-approve copy before sending.",
    metrics: ["Safe Sending Cadence", "Batch Message Approvals", "Anti-Spam Safeguards"],
  },
];

const integrations = [
  { name: "LinkedIn & Sales Navigator", category: "Outreach & Ingestion", status: "Native 2-Way Sync" },
  { name: "HubSpot CRM", category: "Pipeline Sync", status: "Bi-directional" },
  { name: "Salesforce", category: "Enterprise CRM", status: "Bi-directional" },
  { name: "CSV / XLSX Importer", category: "Data Ingestion", status: "Instant Drag & Drop" },
  { name: "Slack Alerts", category: "Notifications", status: "Real-Time Lead Alerts" },
  { name: "Custom Webhooks & REST API", category: "Developer", status: "Full CRUD Access" },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Product Hero */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                <Layers className="h-3.5 w-3.5 text-neutral-700" />
                <span>The Complete Outbound Workspace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1]">
                Everything you need to turn cold leads into qualified meetings.
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                SendPilot combines prospect discovery, automated data enrichment, algorithmic scoring, and AI-assisted LinkedIn outreach in one unified interface.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/get-started"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-neutral-800 text-white px-7 py-3.5 text-sm font-semibold transition-colors shadow-xs"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-300 hover:bg-neutral-100 bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors"
                >
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 6-Step Workflow Breakdown */}
        <SolutionSection />

        {/* Product Deep-Dive Modules */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Architected for sales efficiency and prospect safety.
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                Four foundational pillars engineered to maximize meeting book rates without risking account health.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {productModules.map((module, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-white p-7 sm:p-8 space-y-5 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Module 0{idx + 1}
                    </span>
                    <h3 className="text-2xl font-extrabold text-black">{module.title}</h3>
                    <p className="text-sm font-semibold text-neutral-700">{module.tagline}</p>
                    <p className="text-sm text-neutral-600 leading-relaxed">{module.desc}</p>
                  </div>

                  <div className="pt-4 border-t border-neutral-200/80 flex flex-wrap gap-2">
                    {module.metrics.map((metric, mIdx) => (
                      <span
                        key={mIdx}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-white px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-800"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{metric}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Ecosystem */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800">
                <Share2 className="h-3.5 w-3.5 text-neutral-700" />
                <span>Seamless Connectivity</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Integrates with your existing sales stack.
              </h2>
              <p className="text-neutral-600 text-base max-w-xl mx-auto">
                No complex migration required. Plug SendPilot into your CRM and data sources in under 5 minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {integrations.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">{item.category}</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-black">{item.name}</h4>
                  <p className="text-xs text-neutral-600 font-mono">{item.status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Ready to upgrade your outbound engine?
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
              Join founders and high-output sales teams booking qualified meetings with SendPilot.
            </p>
            <div className="pt-2">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-100 text-black px-8 py-3.5 text-sm font-bold shadow-sm transition-colors"
              >
                <span>Get Started in 2 Minutes</span>
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
