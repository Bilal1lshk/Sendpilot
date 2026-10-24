export interface SequenceStepItem {
  id: string;
  type: "connect" | "wait" | "message";
  delayDays: number;
  template: string;
}

export interface FlowItem {
  id: string;
  name: string;
  description: string;
  steps: {
    type: "connect" | "wait" | "message";
    delayDays: number;
    template: string;
  }[];
  config?: Record<string, unknown>;
  isTemplate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadItem {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  jobTitle?: string;
  location?: string;
  industry?: string;
  linkedinUrl?: string;
  group?: string;
  stage?: string;
  status?: string;
}

export interface LeadGroupItem {
  id: string;
  name: string;
  leadCount: number;
  color?: string;
}

export type EnrollmentMode = "specific" | "all" | "later";
