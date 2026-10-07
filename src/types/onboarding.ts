export type StepStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface AccountStepData {
  fullName: string;
  jobTitle: string;
  companyName: string;
  companyWebsite: string;
  offer: string; // max 160 chars
  timezone: string;
  workingHours: string;
}

export interface LinkedInAccount {
  id: string;
  name: string;
  headline?: string;
  photo?: string;
  status: "Active" | "Disconnected";
  connectedAt: string;
}

export interface TeammateInvite {
  email: string;
  invitedAt: string;
  status: "Pending" | "Joined";
}

export interface ConnectStepData {
  connectedAccounts: LinkedInAccount[];
  invitedTeammates: TeammateInvite[];
}

export interface LeadItem {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  email: string;
  linkedinUrl: string;
  icpScore: number; // Placeholder ICP score, e.g. 94
  status?: "ready" | "suppressed" | "duplicate";
}

export interface LeadsStepData {
  importType: "csv" | "urls" | "sales_nav";
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
  suppressionCount: number;
  leads: LeadItem[];
}

export interface CampaignStepData {
  campaignName: string;
  targetLeadsCount: number;
  niche: string;
  tone: string;
  messages: {
    connectionNote: string;
    followUp1: string;
    followUp2: string;
  };
  humanApproved: boolean;
  dailyCap: number;
  warmUpActive: boolean;
  status: "draft" | "launched";
  stats: {
    sent: number;
    accepted: number;
    replied: number;
    meetingsBooked: number;
  };
}

export interface OnboardingState {
  step1: {
    status: StepStatus;
    data: AccountStepData;
  };
  step2: {
    status: StepStatus;
    data: ConnectStepData;
  };
  step3: {
    status: StepStatus;
    data: LeadsStepData;
  };
  step4: {
    status: StepStatus;
    data: CampaignStepData;
  };
}
