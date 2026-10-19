"use client";

import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import {
  Zap,
  Calendar,
  Mail,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  Search,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";

export function OrbitingEcosystemSection() {
  return (
    <section className="py-20 md:py-28 bg-neutral-50 border-b border-neutral-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
            <Share2 className="h-3.5 w-3.5 text-neutral-700" />
            <span>Connected Outbound Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight">
            The intelligent hub connecting your entire revenue stack.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            SendPilot sits in the center of your prospect channels, enriching cold data, managing assisted LinkedIn conversations, and syncing meetings to your CRM.
          </p>
        </div>

        {/* Orbiting Circles Interactive Graphic Container */}
        <div className="relative flex h-[500px] w-full max-w-4xl mx-auto flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          {/* Central SendPilot Core Hub */}
          <div className="z-10 flex flex-col items-center justify-center gap-2">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white shadow-md ring-8 ring-neutral-100">
              <Zap className="h-7 w-7 fill-current text-white" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
            </div>
            <div className="text-center mt-1">
              <div className="font-bold text-xs tracking-tight text-black">SendPilot Engine</div>
              <div className="text-[10px] text-neutral-500 font-mono">Assisted Outbound Core</div>
            </div>
          </div>

          {/* Inner Orbit (Radius 120): Lead Ingestion & Prospect Discovery */}
          <OrbitingCircles
            radius={120}
            duration={25}
            iconSize={40}
            className="border border-neutral-200 bg-white shadow-xs text-neutral-800 hover:border-neutral-400 transition-colors"
          >
            <div title="LinkedIn Profiles & Searches" className="p-2 text-[#0A66C2]">
              <LinkedInIcon className="h-5 w-5 fill-current" />
            </div>
            <div title="CSV & Spreadsheet Ingestion" className="p-2 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div title="Sales Navigator Searches" className="p-2 text-neutral-800">
              <Search className="h-5 w-5" />
            </div>
            <div title="Firmographic Enrichment DB" className="p-2 text-neutral-700">
              <Database className="h-5 w-5" />
            </div>
          </OrbitingCircles>

          {/* Outer Orbit (Radius 210, Reversed): Pipeline, CRM & Calendar Bookings */}
          <OrbitingCircles
            radius={210}
            duration={35}
            reverse
            iconSize={44}
            className="border border-neutral-200 bg-white shadow-xs text-neutral-800 hover:border-neutral-400 transition-colors"
          >
            <div title="Google Meet & Calendar Sync" className="p-2.5 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div title="HubSpot & Salesforce Bi-directional Sync" className="p-2.5 text-amber-600">
              <Share2 className="h-5 w-5" />
            </div>
            <div title="AI Sales Copilot LLMs" className="p-2.5 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div title="Corporate Email Inboxes" className="p-2.5 text-red-500">
              <Mail className="h-5 w-5" />
            </div>
            <div title="Slack Team Alerts" className="p-2.5 text-emerald-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div title="Safe Residential Proxies" className="p-2.5 text-neutral-900">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </OrbitingCircles>
        </div>

        {/* Feature Badges Underneath Orbit */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {[
            "1-Click CSV & SalesNav Sync",
            "Continuous 2-Way CRM Logging",
            "Residential Proxy Protection",
            "Direct Calendar Bookings",
          ].map((text, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 bg-white shadow-xs text-xs font-semibold text-neutral-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
