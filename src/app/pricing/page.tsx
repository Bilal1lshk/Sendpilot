import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PricingSection } from "@/components/landing/PricingSection";
import {
  Tag,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Shield,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing Plans | SendPilot Outbound Engine",
  description:
    "Simple, predictable pricing for founders, sales teams, and agencies. 14-day free trial, cancel anytime.",
};

const featureComparison = [
  {
    category: "Lead Ingestion & Data",
    items: [
      { name: "Monthly Enriched Leads", starter: "500", growth: "2,500", scale: "10,000+" },
      { name: "CSV & LinkedIn Search Import", starter: "Included", growth: "Included", scale: "Included" },
      { name: "Corporate Email Verification", starter: "Standard", growth: "Real-Time Verified", scale: "Real-Time Verified" },
      { name: "Firmographic & Tech Stack Data", starter: "Basic", growth: "Advanced", scale: "Full Dossiers" },
    ],
  },
  {
    category: "AI Copilot & Personalization",
    items: [
      { name: "AI Lead Scoring (ICP 0-100%)", starter: "1 Rule Profile", growth: "5 Rule Profiles", scale: "Unlimited" },
      { name: "Contextual Opening Hooks", starter: "Included", growth: "Included", scale: "Custom Tone & Rules" },
      { name: "AI Assistant Conversational Queries", starter: "50 / mo", growth: "Unlimited", scale: "Unlimited" },
      { name: "Custom Objection Playbooks", starter: "—", growth: "Included", scale: "Tailored to Team" },
    ],
  },
  {
    category: "Outreach & Infrastructure",
    items: [
      { name: "Connected LinkedIn Profiles", starter: "1 Sender", growth: "Up to 3 Senders", scale: "Unlimited" },
      { name: "Residential Runner & Safe Warmup", starter: "Included", growth: "Included", scale: "Dedicated Proxies" },
      { name: "Human-in-the-Loop Batch Queue", starter: "Included", growth: "Included", scale: "Multi-User Roles" },
      { name: "CRM Bi-directional Sync", starter: "CSV Export", growth: "HubSpot & Salesforce", scale: "Custom API & Webhooks" },
    ],
  },
  {
    category: "Support & Security",
    items: [
      { name: "Support Level", starter: "Community & Email", growth: "Priority Live Chat", scale: "Dedicated Account Mgr" },
      { name: "LinkedIn Safety Protocol", starter: "Automated", growth: "Automated", scale: "Custom Cadence Limits" },
      { name: "SLA & Uptime Guarantee", starter: "99.5%", growth: "99.9%", scale: "99.95% Dedicated" },
    ],
  },
];

const pricingFaqs = [
  {
    q: "Can I try SendPilot before paying?",
    a: "Yes! Every new account includes a 14-day free trial on the Growth plan with full access to our AI Assistant, lead enrichment, and outreach tools. No credit card is required to sign up.",
  },
  {
    q: "Will SendPilot get my LinkedIn account restricted?",
    a: "No. SendPilot enforces strict daily connection limits, randomized human typing cadences, and runs through your local residential browser session or dedicated proxies. Because reps review and approve messages in our Human-in-the-Loop queue, your account behaves exactly like an active human professional.",
  },
  {
    q: "What happens if I exceed my monthly lead credits?",
    a: "You can purchase additional lead enrichment credits at any time without upgrading tiers, or simply upgrade your plan to unlock higher monthly volume.",
  },
  {
    q: "Can I connect multiple LinkedIn accounts for my sales team?",
    a: "Yes. The Growth tier supports up to 3 senders, while the Scale tier supports unlimited connected accounts and team seats with granular permission roles.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can cancel or modify your plan at any time from your account billing settings. If you cancel, you will retain full access until the end of your billing cycle.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Pricing Hero */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                <Tag className="h-3.5 w-3.5 text-neutral-700" />
                <span>Simple &amp; Transparent</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1]">
                Predictable plans for high-output revenue teams.
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Start with a 14-day free trial. Choose the plan that matches your monthly prospect volume and team scale.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <PricingSection />

        {/* Detailed Plan Feature Comparison Matrix */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Compare plan capabilities side-by-side.
              </h2>
              <p className="text-neutral-600 text-base">
                Everything you need to know about what is included in each tier.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-xs bg-white">
              {/* Header */}
              <div className="grid grid-cols-12 bg-neutral-100 text-neutral-900 border-b border-neutral-200 p-4 sm:p-5 text-xs font-bold uppercase tracking-wider">
                <div className="col-span-5 sm:col-span-6">Features &amp; Limits</div>
                <div className="col-span-2 sm:col-span-2 text-center text-neutral-600">Starter</div>
                <div className="col-span-3 sm:col-span-2 text-center text-black font-extrabold">Growth</div>
                <div className="col-span-2 sm:col-span-2 text-center text-neutral-600">Scale</div>
              </div>

              {/* Category Rows */}
              <div className="divide-y divide-neutral-200 text-xs sm:text-sm">
                {featureComparison.map((cat, cIdx) => (
                  <div key={cIdx}>
                    <div className="bg-neutral-50 px-4 sm:px-5 py-2.5 font-bold text-xs uppercase tracking-wider text-neutral-700 border-b border-neutral-200/60">
                      {cat.category}
                    </div>
                    {cat.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="grid grid-cols-12 p-3 sm:p-4 items-center hover:bg-neutral-50/50 transition-colors"
                      >
                        <div className="col-span-5 sm:col-span-6 font-medium text-neutral-800">
                          {item.name}
                        </div>
                        <div className="col-span-2 sm:col-span-2 text-center font-mono text-neutral-600">
                          {item.starter}
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-center font-mono font-bold text-black">
                          {item.growth}
                        </div>
                        <div className="col-span-2 sm:col-span-2 text-center font-mono text-neutral-700">
                          {item.scale}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing FAQs */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800">
                <HelpCircle className="h-3.5 w-3.5 text-neutral-600" />
                <span>Pricing Questions</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {pricingFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-2 shadow-xs"
                >
                  <h4 className="text-base font-bold text-black">{faq.q}</h4>
                  <p className="text-sm text-neutral-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Start booking qualified meetings today.
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
              14-day free trial on the Growth plan. Setup takes less than 2 minutes.
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
