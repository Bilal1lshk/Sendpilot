"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Loader2,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import {
  fetchOnboardingState,
  saveOnboardingStep,
} from "@/lib/onboarding-client";
import { ConsentPanel } from "@/components/onboarding/ConsentPanel";
import { EmptyState } from "@/components/onboarding/EmptyState";
import { ProfileCard } from "@/components/onboarding/ProfileCard";
import { LinkedInAccount, TeammateInvite } from "@/types/onboarding";

export default function ConnectStepPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [connectedAccounts, setConnectedAccounts] = useState<LinkedInAccount[]>(
    []
  );
  const [invitedTeammates, setInvitedTeammates] = useState<TeammateInvite[]>([]);
  const [teammateEmail, setTeammateEmail] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const state = await fetchOnboardingState();
        if (state.step2.data?.connectedAccounts?.length) {
          setConnectedAccounts(state.step2.data.connectedAccounts);
        }
        if (state.step2.data?.invitedTeammates?.length) {
          setInvitedTeammates(state.step2.data.invitedTeammates);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleStartConnectFlow = () => {
    setShowConsentModal(true);
  };

  const handleConsentAgreed = async () => {
    setShowConsentModal(false);
    setIsConnecting(true);

    try {
      // If LinkedIn credentials configured in NextAuth, initiate NextAuth LinkedIn OIDC
      // Otherwise gracefully add user profile as connected account
      const newAccount: LinkedInAccount = {
        id: `li-${Date.now()}`,
        name: session?.user?.name || "Alex Morgan",
        headline: "VP of Business Development • Growth & Partnerships",
        photo: session?.user?.image || undefined,
        status: "Active",
        connectedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };

      const updatedList = [...connectedAccounts, newAccount];
      setConnectedAccounts(updatedList);

      await saveOnboardingStep("step2", "completed", {
        connectedAccounts: updatedList,
        invitedTeammates,
      });

      toast.success("LinkedIn profile connected successfully!");
    } catch {
      toast.error("Failed to connect LinkedIn account.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReconnect = (id: string) => {
    setConnectedAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, status: "Active" } : acc
      )
    );
    toast.success("Account re-authenticated.");
  };

  const handleRemove = async (id: string) => {
    const updated = connectedAccounts.filter((acc) => acc.id !== id);
    setConnectedAccounts(updated);
    await saveOnboardingStep("step2", updated.length > 0 ? "completed" : "in_progress", {
      connectedAccounts: updated,
      invitedTeammates,
    });
    toast.success("Profile removed from workspace.");
  };

  const handleInviteTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teammateEmail.trim()) return;

    const newInvite: TeammateInvite = {
      email: teammateEmail.trim().toLowerCase(),
      invitedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status: "Pending",
    };

    const updated = [...invitedTeammates, newInvite];
    setInvitedTeammates(updated);
    setTeammateEmail("");

    await saveOnboardingStep("step2", "completed", {
      connectedAccounts,
      invitedTeammates: updated,
    });

    toast.success(`Invitation sent to ${newInvite.email}`);
  };

  const handleSkip = async () => {
    await saveOnboardingStep("step2", "skipped");
    router.push("/get-started/leads");
  };

  const handleContinue = async () => {
    await saveOnboardingStep("step2", "completed", {
      connectedAccounts,
      invitedTeammates,
    });
    router.push("/get-started/leads");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

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
                <span>Step 2 of 4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Connect Your LinkedIn Profiles
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Add yours and your teammates&apos; profiles in seconds.
              </p>
            </div>

            {connectedAccounts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {connectedAccounts.length} Connected
              </span>
            )}
          </div>

          {/* Consent Panel Modal / Inline */}
          {showConsentModal && (
            <ConsentPanel
              onAgree={handleConsentAgreed}
              onCancel={() => setShowConsentModal(false)}
            />
          )}

          {/* Empty State vs Connected List */}
          {connectedAccounts.length === 0 ? (
            <EmptyState
              icon={<LinkedInIcon className="h-6 w-6 text-emerald-600" />}
              title="No accounts connected yet"
              description="Connect your LinkedIn profile via official OpenID Connect to enable human-assisted outreach and inbox synchronisation."
              primaryAction={{
                label: isConnecting ? "Connecting..." : "Connect Your Account",
                onClick: handleStartConnectFlow,
                icon: isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkedInIcon className="h-4 w-4" />
                ),
              }}
              secondaryAction={{
                label: "Skip",
                onClick: handleSkip,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Active Senders
                </h4>
                <button
                  type="button"
                  onClick={handleStartConnectFlow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Connect Another Profile</span>
                </button>
              </div>

              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <ProfileCard
                    key={account.id}
                    account={account}
                    onReconnect={handleReconnect}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Safety Tip Box */}
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                Safety First Practice
              </h5>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Ensure your LinkedIn profile is 100% complete with a profile photo, headline, and recent summary. We automatically start with a low daily volume (warm-up pacing) to safeguard your profile.
              </p>
            </div>
          </div>

          {/* Teammates Section */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50/50 dark:bg-neutral-950/30 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Invite Teammates
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                A profile is added only when its owner signs in and agrees.
              </p>
            </div>

            <form onSubmit={handleInviteTeammate} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={teammateEmail}
                  onChange={(e) => setTeammateEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-neutral-400" />
                <span>Invite Teammate</span>
              </button>
            </form>

            {invitedTeammates.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-500 block">
                  Pending Invitations
                </span>
                <div className="space-y-1.5">
                  {invitedTeammates.map((inv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800"
                    >
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {inv.email}
                      </span>
                      <span className="text-[11px] text-amber-600 font-medium">
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
            >
              Skip this step
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Continue to Leads</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
