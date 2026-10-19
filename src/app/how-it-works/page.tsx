import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { InteractiveOutboundSimulator } from "@/components/landing/InteractiveOutboundSimulator";
import { OrbitingEcosystemSection } from "@/components/landing/OrbitingEcosystemSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ProgressiveBlurShowcase } from "@/components/landing/ProgressiveBlurShowcase";
import {
  Workflow,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works | SendPilot Outbound Methodology",
  description:
    "See how SendPilot turns raw prospects into closed revenue in 4 simple steps: Target & Ingest, Enrich & Score, Draft & Approve, and Convert.",
};

const safetyPillars = [
  {
    icon: ShieldCheck,
    title: "Algorithmic Account Warmup",
    desc: "New sender accounts begin with 5–10 messages daily and automatically scale upward over 2–3 weeks to establish positive LinkedIn trust metrics.",
  },
  {
    icon: Lock,
    title: "Local Residential Runner",
    desc: "Browser sessions run using local residential network signatures and dedicated proxies, eliminating datacenter IP flags and CAPTCHA challenges.",
  },
  {
    icon: UserCheck,
    title: "Mandatory Human Oversight",
    desc: "Nothing sends without rep approval. You inspect messages in bulk or individually with 1-click safeguards.",
  },
  {
    icon: Zap,
    title: "Intelligent Rate Spacing",
    desc: "Messages are distributed with randomized human typing speeds and delay intervals mimicking realistic browsing behavior.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                <Workflow className="h-3.5 w-3.5 text-neutral-700" />
                <span>The Outbound Playbook</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1]">
                From cold prospects to booked calls in 4 seamless steps.
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                A battle-tested outbound workflow engineered to maximize response rates while protecting your LinkedIn profile and sender reputation.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/get-started"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-neutral-800 text-white px-7 py-3.5 text-sm font-semibold transition-colors shadow-xs"
                >
                  <span>Start Outbound Campaign</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/ai-assistant"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-300 hover:bg-neutral-100 bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors"
                >
                  See AI Assistant
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Interactive 4-Stage Outbound Simulator (Live Animation) */}
        <InteractiveOutboundSimulator />

        {/* 2. MagicUI Orbiting Circles Integration Hub */}
        <OrbitingEcosystemSection />

        {/* 3. 4-Step Interactive Timeline Overview */}
        <HowItWorksSection />

        {/* 4. Live Outbound Stream Visual with Progressive Blur */}
        <ProgressiveBlurShowcase />

        {/* 5. Safety & Compliance Architecture */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-600" />
                <span>Safety Architecture</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Account safety is built into every step.
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                We know your LinkedIn reputation is mission-critical. Here is how SendPilot keeps accounts safe.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {safetyPillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 space-y-3.5"
                >
                  <div className="h-10 w-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-black shadow-xs">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-black">{pillar.title}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Ready to launch your first assisted campaign?
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
              Get set up in 2 minutes. No credit card required to start your 14-day trial.
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
