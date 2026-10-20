import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
  Bot,
  Sparkles,
  Send,
  ArrowRight,
  User,
  CheckCircle2,
  MessageSquare,
  Zap,
  Shield,
  HelpCircle,
  Clock,
  Target,
  BarChart2,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Sales Copilot & Autonomous Assistant | SendPilot",
  description:
    "Interact with your entire lead database using natural language. Surface high-intent prospects, analyze campaign performance, and generate bespoke pitches in seconds.",
};

const suggestedProspects = [
  {
    name: "Marcus Vance",
    role: "VP of Engineering",
    company: "ApexScale",
    score: 95,
    intent: "High - Actively Hiring 12 Engineers",
    hook: "Saw your team's expansion into distributed real-time systems—how are you currently benchmarking outbound developer tooling?",
  },
  {
    name: "Elena Rostova",
    role: "Head of Growth",
    company: "DataMetrics Inc.",
    score: 92,
    intent: "Series B Announcement ($24M)",
    hook: "Congrats on the Series B round! Scaling outbound without burning domain reputation is notoriously tough right after funding.",
  },
  {
    name: "Julian Thorne",
    role: "Chief Revenue Officer",
    company: "HyperCloud Systems",
    score: 89,
    intent: "Evaluating Sales Engagement Software",
    hook: "Noticed HyperCloud just rolled out enterprise tier pricing—curious if SDR meeting booking volume has kept pace with pipeline targets.",
  },
];

const capabilities = [
  {
    icon: MessageSquare,
    title: "Natural Language Lead Search",
    desc: "Query your pipeline in plain English. Ask 'Find fintech founders in New York with >50 employees' and get curated candidate lists instantly.",
  },
  {
    icon: Sparkles,
    title: "Dynamic Contextual Icebreakers",
    desc: "Generate authentic opening lines that cite verified recent company events, executive podcast appearances, and real-time funding announcements.",
  },
  {
    icon: Shield,
    title: "1-Click Human Safeguards",
    desc: "Full human-in-the-loop review. Your reps approve or tweak generated copy in batch or 1-by-1 before anything sends to LinkedIn.",
  },
  {
    icon: BarChart2,
    title: "Autonomous Pipeline Diagnostics",
    desc: "Ask the AI assistant why a campaign is underperforming. It analyzes reply rates, objection patterns, and recommends tested copy variants.",
  },
  {
    icon: Clock,
    title: "Smart Follow-Up Drafting",
    desc: "Detect prospect replies, categorize sentiment (positive, neutral, objection, or referral), and draft optimal response threads automatically.",
  },
  {
    icon: Target,
    title: "Self-Refining ICP Match",
    desc: "The assistant learns which lead archetypes convert best into booked calls and automatically updates your lead qualification scoring weights.",
  },
];

const faqs = [
  {
    q: "How does the AI Assistant personalize messages without sounding robotic?",
    a: "Unlike generic ChatGPT templates, SendPilot feeds verified firmographic signals, recent company announcements, job changes, and prospect LinkedIn profiles directly into our fine-tuned sales language models. It writes concise, peer-to-peer observations rather than generic sales fluff.",
  },
  {
    q: "Can the AI send messages automatically without my review?",
    a: "By default, SendPilot is strictly 'Human-in-the-Loop'. Every message drafted by the AI is presented in an approval queue where you or your reps can inspect, tweak, or 1-click approve before sending.",
  },
  {
    q: "Does it support custom prompts or company playbooks?",
    a: "Yes. You can configure your company's value propositions, case studies, tone of voice, forbidden words, and target buyer personas directly in your workspace settings.",
  },
  {
    q: "Which languages does the AI Assistant support?",
    a: "The AI Assistant can analyze prospects and draft outreach messages in over 30 languages, matching the language of your prospect's location or profile.",
  },
];

export default function AiAssistantPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                <Bot className="h-3.5 w-3.5 text-neutral-700" />
                <span>Conversational Outbound Copilot</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-[1.1]">
                Your AI sales assistant works behind the scenes.
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Interact with your entire lead database using natural language. Surface high-intent prospects, analyze campaign performance, and generate hyper-relevant pitches in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/get-started"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-neutral-800 text-white px-7 py-3.5 text-sm font-semibold transition-colors shadow-xs"
                >
                  <span>Try AI Assistant Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/product"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-300 hover:bg-neutral-100 bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors"
                >
                  Explore Platform
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Live Interactive Copilot Demo Showcase */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-black">
                See the AI Sales Assistant in Action
              </h2>
              <p className="text-neutral-600 text-sm sm:text-base">
                Real query execution showing prospect discovery and instant bespoke copy drafting.
              </p>
            </div>

            <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 md:p-10 shadow-xs space-y-6">
              {/* User Prompt */}
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-md rounded-2xl bg-neutral-900 text-white p-4 shadow-xs space-y-1">
                  <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                    Sales Rep Query
                  </div>
                  <p className="text-sm font-medium text-white">
                    &quot;Find my highest-quality engineering leaders in Series A/B SaaS and draft custom icebreakers.&quot;
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-700">
                  <User className="h-4 w-4" />
                </div>
              </div>

              {/* AI Response Card */}
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>

                <div className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-black flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-neutral-900" />
                        <span>SendPilot AI Copilot</span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        Analyzed 1,420 pipeline contacts • 3 high-intent matches found
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-full border border-neutral-200 w-fit">
                      100% Verified Profiles
                    </span>
                  </div>

                  {/* Matches List */}
                  <div className="space-y-3">
                    {suggestedProspects.map((lead, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 hover:border-neutral-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-sm font-bold text-black">{lead.name}</span>
                            <span className="text-xs text-neutral-500 ml-1.5">
                              {lead.role} at <span className="text-neutral-800 font-semibold">{lead.company}</span>
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                            {lead.score}% ICP
                          </span>
                        </div>

                        <div className="text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-800">Signal: </span>
                          {lead.intent}
                        </div>

                        <div className="rounded-lg bg-neutral-50 p-2.5 border border-neutral-150 text-xs text-neutral-700 font-mono">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                            Suggested Opening Hook:
                          </span>
                          &ldquo;{lead.hook}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-neutral-500">
                      Ready to stage messages for human review queue.
                    </span>
                    <Link
                      href="/get-started"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Stage 3 Drafts</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Grid */}
        <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Everything your SDRs need to write 10x better copy.
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                Stop wasting hours looking up prospect updates on LinkedIn. Let AI assemble the context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 space-y-3.5 shadow-xs hover:border-neutral-300 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-black">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-black">{item.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 md:py-28 bg-white border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1 text-xs font-semibold text-neutral-800">
                <HelpCircle className="h-3.5 w-3.5 text-neutral-600" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                Questions about the AI Assistant?
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 space-y-2"
                >
                  <h4 className="text-base font-bold text-black">{faq.q}</h4>
                  <p className="text-sm text-neutral-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pre-Footer Call to Action */}
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Give your outbound team an AI sales copilot today.
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
              Start your 14-day free trial. Connect your LinkedIn profile safely and scale meetings within hours.
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
