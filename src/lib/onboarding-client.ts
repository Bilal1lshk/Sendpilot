import { OnboardingState, StepStatus, OnboardingStepKey } from "@/types/onboarding";

interface OnboardingConnection {
  id: string;
  name?: string;
  linkedinName?: string;
  photo?: string;
  linkedinAvatar?: string;
  status?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
}

// [PLACEHOLDER DATA] Default initial state when workspace has not started yet
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  step1: {
    status: "not_started",
    data: {
      fullName: "",
      jobTitle: "",
      companyName: "",
      companyWebsite: "",
      offer: "",
      timezone: "America/New_York",
      workingHours: "9:00 AM - 5:00 PM",
    },
  },
  step2: {
    status: "not_started",
    data: {
      connectedAccounts: [],
      invitedTeammates: [],
    },
  },
  step3: {
    status: "not_started",
    data: {
      importType: "csv",
      readyCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      suppressionCount: 0,
      leads: [],
    },
  },
  step4: {
    status: "not_started",
    data: {
      campaignName: "Q4 LinkedIn Outreach Campaign",
      targetLeadsCount: 0,
      niche: "B2B SaaS & Tech",
      tone: "Friendly & Casual",
      messages: {
        connectionNote: "Hi {{firstName}}, noticed your work at {{company}}. Would love to connect and follow your journey!",
        followUp1: "Hey {{firstName}}, hope your week is off to a great start. We recently helped a similar team in {{niche}} streamline their outreach. Curious if you're exploring this right now?",
        followUp2: "Quick ping {{firstName}} - would you be open to a 10-min chat this Thursday or Friday?",
      },
      humanApproved: false,
      dailyCap: 20,
      warmUpActive: true,
      status: "draft",
      stats: {
        sent: 0,
        accepted: 0,
        replied: 0,
        meetingsBooked: 0,
      },
    },
  },
};

const STORAGE_KEY = "sendpilot_onboarding_state";

function sanitizeOnboardingState(state: OnboardingState): OnboardingState {
  return {
    ...state,
    step2: {
      ...state.step2,
      data: {
        ...state.step2.data,
        connectedAccounts: ((state.step2.data?.connectedAccounts || []) as unknown as OnboardingConnection[]).map((account) => ({
          id: account.id,
          name: account.linkedinName || account.name || "LinkedIn User",
          headline: "LinkedIn profile",
          photo: account.linkedinAvatar || account.photo || undefined,
          status: account.status === "active" || account.status === "Active" ? "Active" : "Disconnected",
          connectedAt: account.lastVerifiedAt || account.connectedAt || "",
        })),
      },
    },
  };
}

export async function fetchOnboardingState(): Promise<OnboardingState> {
  // Try to load from database first
  try {
    const res = await fetch("/api/workspace/onboarding");
    if (res.ok) {
      const json = await res.json();
      if (json.workspace) {
        const merged = sanitizeOnboardingState({
          workspaceName: json.workspace.name,
          onboardingCompleted: Boolean(json.workspace.onboardingCompleted),
          step1: json.workspace.step1 || DEFAULT_ONBOARDING_STATE.step1,
          step2: json.workspace.step2 || DEFAULT_ONBOARDING_STATE.step2,
          step3: json.workspace.step3 || DEFAULT_ONBOARDING_STATE.step3,
          step4: json.workspace.step4 || DEFAULT_ONBOARDING_STATE.step4,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          if (json.workspace.name) {
            localStorage.setItem("sendpilot_current_workspace", json.workspace.name);
          }
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch from DB, falling back to local cache:", err);
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const safeState = sanitizeOnboardingState(JSON.parse(cached) as OnboardingState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
        return safeState;
      } catch {
        // ignore parse errors
      }
    }
  }

  return DEFAULT_ONBOARDING_STATE;
}

export async function saveWorkspaceSetup(name: string): Promise<OnboardingState> {
  const current = await fetchOnboardingState();
  const updatedState: OnboardingState = {
    ...current,
    workspaceName: name.trim(),
    onboardingCompleted: true,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
    localStorage.setItem("sendpilot_current_workspace", name.trim());
  }

  try {
    await fetch("/api/workspace/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), onboardingCompleted: true }),
    });
  } catch {
    // Non-blocking sync failure fallback handled in client cache
  }

  return updatedState;
}

export async function saveOnboardingStep<K extends OnboardingStepKey>(
  stepKey: K,
  status: StepStatus,
  data?: Partial<OnboardingState[K]["data"]>
): Promise<OnboardingState> {
  // Read current state
  const current = await fetchOnboardingState();
  const updatedStep = {
    status,
    data: {
      ...current[stepKey].data,
      ...(data || {}),
    },
  };

  const updatedState = sanitizeOnboardingState({
    ...current,
    [stepKey]: updatedStep,
  } as OnboardingState);

  // Update localStorage immediately
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
  }

  // Persist to database in background
  try {
    await fetch("/api/workspace/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [stepKey]: updatedStep }),
    });
  } catch (err) {
    console.warn("Failed to sync step update with DB:", err);
  }

  return updatedState;
}
