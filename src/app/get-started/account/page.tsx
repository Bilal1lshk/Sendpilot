"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Briefcase,
  Building,
  Globe,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { AccountStepData } from "@/types/onboarding";

const TIMEZONES = [
  "America/New_York (Eastern Time - US)",
  "America/Chicago (Central Time - US)",
  "America/Denver (Mountain Time - US)",
  "America/Los_Angeles (Pacific Time - US)",
  "Europe/London (GMT/BST)",
  "Europe/Berlin (Central European Time)",
  "Asia/Dubai (Gulf Standard Time)",
  "Asia/Singapore (Singapore Standard Time)",
  "Asia/Tokyo (Japan Standard Time)",
  "Australia/Sydney (Australian Eastern Time)",
];

const WORKING_HOURS_OPTIONS = [
  "9:00 AM - 5:00 PM (Monday - Friday)",
  "8:00 AM - 4:00 PM (Monday - Friday)",
  "10:00 AM - 6:00 PM (Monday - Friday)",
  "9:00 AM - 6:00 PM (Monday - Saturday)",
  "Flexible / Custom Hours",
];

export default function AccountStepPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState<AccountStepData>({
    fullName: "",
    jobTitle: "",
    companyName: "",
    companyWebsite: "",
    offer: "",
    timezone: "America/New_York (Eastern Time - US)",
    workingHours: "9:00 AM - 5:00 PM (Monday - Friday)",
  });

  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      try {
        const state = await fetchOnboardingState();
        setIsAlreadyCompleted(state.step1.status === "completed");

        // Prefill from existing step data, or fallback to session
        setFormData({
          fullName:
            state.step1.data?.fullName || session?.user?.name || "",
          jobTitle: state.step1.data?.jobTitle || "",
          companyName: state.step1.data?.companyName || "",
          companyWebsite: state.step1.data?.companyWebsite || "",
          offer: state.step1.data?.offer || "",
          timezone:
            state.step1.data?.timezone ||
            "America/New_York (Eastern Time - US)",
          workingHours:
            state.step1.data?.workingHours ||
            "9:00 AM - 5:00 PM (Monday - Friday)",
        });
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await saveOnboardingStep("step1", "completed", formData);
      toast.success("Account profile saved!");
      router.push("/get-started/connect");
    } catch {
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const remainingChars = 160 - formData.offer.length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          href="/get-started"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Get Started</span>
        </Link>

        {/* Card Container */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                <span>Step 1 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Create Your Account
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Your workspace is set up. Add your details so outreach looks like you.
              </p>
            </div>

            {isAlreadyCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name & Job Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, jobTitle: e.target.value })
                    }
                    placeholder="e.g. VP of Business Development"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Company Name & Company Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="e.g. SendPilot Technologies"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Company Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyWebsite: e.target.value,
                      })
                    }
                    placeholder="https://sendpilot.com"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Short "what we offer" line (max 160 chars) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Short &quot;What We Offer&quot; Line
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    remainingChars < 0 ? "text-red-500 font-bold" : "text-neutral-400"
                  }`}
                >
                  {formData.offer.length}/160
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={160}
                value={formData.offer}
                onChange={(e) =>
                  setFormData({ ...formData, offer: e.target.value })
                }
                placeholder="We help B2B software companies turn LinkedIn connections into qualified demos through human-assisted outreach."
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3 text-xs outline-none focus:border-emerald-500 transition-colors leading-relaxed"
              />
              <p className="text-[11px] text-neutral-400">
                Used to personalize cold introductions and message templates.
              </p>
            </div>

            {/* Timezone & Working Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Working Hours (Pacing window)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <select
                    value={formData.workingHours}
                    onChange={(e) =>
                      setFormData({ ...formData, workingHours: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500"
                  >
                    {WORKING_HOURS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit & Next */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                href="/get-started"
                className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Skip for now
              </Link>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving details...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
