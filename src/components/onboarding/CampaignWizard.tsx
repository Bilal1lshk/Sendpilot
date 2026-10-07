"use client";

import { useState } from "react";
import {
  Users,
  Sparkles,
  MessageSquare,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Mail,
  ShieldCheck,
  TrendingUp,
  Flame,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { CampaignStepData } from "@/types/onboarding";

interface CampaignWizardProps {
  onComplete: (data: CampaignStepData) => void;
  initialData?: CampaignStepData;
  availableLeadsCount?: number;
}

const NICHES = [
  "B2B SaaS & Tech",
  "Real Estate",
  "Fashion & Retail",
  "Financial Services",
  "Marketing & Creative Agency",
];

const TONES = [
  "Friendly & Casual",
  "Professional & Polished",
  "Concise & Direct",
  "Consultative",
];

export function CampaignWizard({
  onComplete,
  initialData,
  availableLeadsCount = 270,
}: CampaignWizardProps) {
  const [miniStep, setMiniStep] = useState<number>(
    initialData?.status === "launched" ? 5 : 1
  );

  const [campaignName, setCampaignName] = useState<string>(
    initialData?.campaignName || "Q4 Qualified Prospects Outreach"
  );
  const [niche, setNiche] = useState<string>(
    initialData?.niche || "B2B SaaS & Tech"
  );
  const [tone, setTone] = useState<string>(
    initialData?.tone || "Friendly & Casual"
  );

  const [connectionNote, setConnectionNote] = useState<string>(
    initialData?.messages?.connectionNote ||
      "Hi {{firstName}}, noticed your work in {{company}}. Love what you are building in this space and would love to connect!"
  );
  const [followUp1, setFollowUp1] = useState<string>(
    initialData?.messages?.followUp1 ||
      "Hey {{firstName}}, thanks for connecting! We recently helped teams in {{niche}} double outbound meetings with assisted sending. Curious if you are exploring this currently?"
  );
  const [followUp2, setFollowUp2] = useState<string>(
    initialData?.messages?.followUp2 ||
      "Quick follow-up {{firstName}} - would you be open to a 10-min chat later this week? If not, no worries at all!"
  );

  const [humanApproved, setHumanApproved] = useState<boolean>(
    initialData?.humanApproved ?? false
  );

  const [isLaunched, setIsLaunched] = useState<boolean>(
    initialData?.status === "launched" || false
  );

  const isOverConnectionLimit = connectionNote.length > 300;

  const handleLaunch = () => {
    setIsLaunched(true);
    setMiniStep(5);
    onComplete({
      campaignName,
      targetLeadsCount: availableLeadsCount,
      niche,
      tone,
      messages: {
        connectionNote,
        followUp1,
        followUp2,
      },
      humanApproved: true,
      dailyCap: 20,
      warmUpActive: true,
      status: "launched",
      stats: {
        sent: 15,
        accepted: 7,
        replied: 3,
        meetingsBooked: 1,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Mini-steps indicator */}
      {!isLaunched && (
        <div className="grid grid-cols-4 gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          {[
            { num: 1, label: "Choose Leads", icon: Users },
            { num: 2, label: "Niche & Tone", icon: Sparkles },
            { num: 3, label: "AI Messages", icon: MessageSquare },
            { num: 4, label: "Launch Settings", icon: Rocket },
          ].map((step) => {
            const Icon = step.icon;
            const isActive = miniStep === step.num;
            const isDone = miniStep > step.num;

            return (
              <div
                key={step.num}
                className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                    : isDone
                    ? "text-neutral-700 dark:text-neutral-300"
                    : "text-neutral-400 dark:text-neutral-600"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : isDone
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold leading-tight line-clamp-1">
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MINI STEP 1: Choose Leads */}
      {miniStep === 1 && (
        <div className="space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Step 1: Campaign Name & Target Leads
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Give your campaign a name and verify the target prospect list.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q4 SaaS Founders Outreach"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {availableLeadsCount} Leads Selected
                  </h5>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Imported from Step 3 (verified & deduplicated)
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                Ready
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setMiniStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Next: Niche & Tone</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MINI STEP 2: Niche & Tone */}
      {miniStep === 2 && (
        <div className="space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Step 2: Choose Niche Template & Tone
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Our AI personalizes message angles to fit your specific industry and voice.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
                Target Niche
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNiche(n)}
                    className={`text-left p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      niche === n
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
                Outreach Tone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`text-center p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      tone === t
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setMiniStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setMiniStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Next: Review AI Messages</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MINI STEP 3: Review 3 AI-Written Messages */}
      {miniStep === 3 && (
        <div className="space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Step 3: Review AI-Written Message Previews
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Tailored for {niche} with a {tone.toLowerCase()} voice.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </span>
          </div>

          {/* 3 Messages */}
          <div className="space-y-4">
            {/* Message 1: Connection Request Note */}
            <div className="space-y-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Step 1 • LinkedIn Connection Note
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    isOverConnectionLimit
                      ? "text-red-600 font-bold"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {connectionNote.length} / 300 characters
                </span>
              </div>

              <textarea
                rows={3}
                value={connectionNote}
                onChange={(e) => setConnectionNote(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-xs outline-none focus:border-emerald-500"
              />

              {isOverConnectionLimit && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Warning: LinkedIn connection requests have a strict 300-character limit. Please shorten your note.
                  </span>
                </div>
              )}
            </div>

            {/* Message 2: Follow-up #1 */}
            <div className="space-y-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Step 2 • Follow-up #1 (Sent 2 days after connect)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Direct LinkedIn message
                </span>
              </div>
              <textarea
                rows={3}
                value={followUp1}
                onChange={(e) => setFollowUp1(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Message 3: Follow-up #2 */}
            <div className="space-y-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Step 3 • Follow-up #2 (Sent 4 days later)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Direct LinkedIn message
                </span>
              </div>
              <textarea
                rows={2}
                value={followUp2}
                onChange={(e) => setFollowUp2(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Human approval notice */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20">
              <input
                type="checkbox"
                id="human-approval-checkbox"
                checked={humanApproved}
                onChange={(e) => setHumanApproved(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 mt-0.5 cursor-pointer"
              />
              <label
                htmlFor="human-approval-checkbox"
                className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed cursor-pointer"
              >
                <strong>Human approval required:</strong> Every first message is reviewed and verified by a human before sending. I approve these message templates for outreach.
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setMiniStep(2)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!humanApproved || isOverConnectionLimit}
              onClick={() => setMiniStep(4)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Launch Settings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MINI STEP 4: Launch Settings */}
      {miniStep === 4 && (
        <div className="space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Step 4: Launch & Assisted Sending
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Review channels, safety warm-up pacing, and launch your campaign.
            </p>
          </div>

          {/* Channels Row */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Outreach Channels
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2.5">
                  <LinkedInIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    LinkedIn Outreach
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/40">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 opacity-70">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Cold Email Multi-channel
                  </span>
                </div>
                <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 text-[11px] font-medium">
                  Coming soon
                </span>
              </div>
            </div>
          </div>

          {/* Assisted sending explanation */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Assisted Sending Pacing</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Launch creates a daily task list for assisted sending (a person sends from their own LinkedIn account). This guarantees maximum delivery and safeguards account reputation.
            </p>
          </div>

          {/* Daily Cap & Warm-up note */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
            <Flame className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                Daily Cap: 20 invites / day
              </h5>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Warm-up safety active: Starts low and increases slowly over 14 days to keep your profile secure.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setMiniStep(3)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Launch Campaign</span>
            </button>
          </div>
        </div>
      )}

      {/* LAUNCHED STATE: Tracking Preview */}
      {isLaunched && (
        <div className="space-y-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-900 p-6 sm:p-7 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {campaignName} is Live!
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Daily assisted sending tasks generated • Warm-up pacing active
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Active
            </span>
          </div>

          {/* Tracking preview grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                Invites Sent
              </span>
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                15
              </span>
              <span className="text-[10px] text-neutral-400 block mt-1">
                Target: {availableLeadsCount}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                Accepted
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                7
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block mt-1">
                46% acceptance rate
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                Replied
              </span>
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                3
              </span>
              <span className="text-[10px] text-neutral-500 block mt-1">
                20% response rate
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                Meetings Booked
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                1
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block mt-1">
                High intent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Real-time synchronization: Task queues refresh every morning based on your set working hours.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
