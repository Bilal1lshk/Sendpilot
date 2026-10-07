import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkspace extends Document {
  userId?: string;
  name: string;
  step1: {
    status: string;
    data: {
      fullName?: string;
      jobTitle?: string;
      companyName?: string;
      companyWebsite?: string;
      offer?: string;
      timezone?: string;
      workingHours?: string;
    };
  };
  step2: {
    status: string;
    data: {
      connectedAccounts: Array<{
        id: string;
        name: string;
        headline?: string;
        photo?: string;
        status: string;
        connectedAt: string;
      }>;
      invitedTeammates: Array<{
        email: string;
        invitedAt: string;
        status: string;
      }>;
    };
  };
  step3: {
    status: string;
    data: {
      importType?: string;
      readyCount?: number;
      duplicateCount?: number;
      invalidCount?: number;
      suppressionCount?: number;
      leads?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        jobTitle: string;
        company: string;
        email: string;
        linkedinUrl: string;
        icpScore: number;
        status?: string;
      }>;
    };
  };
  step4: {
    status: string;
    data: {
      campaignName?: string;
      targetLeadsCount?: number;
      niche?: string;
      tone?: string;
      messages?: {
        connectionNote?: string;
        followUp1?: string;
        followUp2?: string;
      };
      humanApproved?: boolean;
      dailyCap?: number;
      warmUpActive?: boolean;
      status?: string;
      stats?: {
        sent?: number;
        accepted?: number;
        replied?: number;
        meetingsBooked?: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema: Schema<IWorkspace> = new Schema(
  {
    userId: { type: String, index: true },
    name: { type: String, default: "Default Workspace" },
    step1: {
      status: { type: String, default: "not_started" },
      data: {
        fullName: { type: String, default: "" },
        jobTitle: { type: String, default: "" },
        companyName: { type: String, default: "" },
        companyWebsite: { type: String, default: "" },
        offer: { type: String, default: "" },
        timezone: { type: String, default: "America/New_York" },
        workingHours: { type: String, default: "9:00 AM - 5:00 PM" },
      },
    },
    step2: {
      status: { type: String, default: "not_started" },
      data: {
        connectedAccounts: { type: Array, default: [] },
        invitedTeammates: { type: Array, default: [] },
      },
    },
    step3: {
      status: { type: String, default: "not_started" },
      data: {
        importType: { type: String, default: "csv" },
        readyCount: { type: Number, default: 0 },
        duplicateCount: { type: Number, default: 0 },
        invalidCount: { type: Number, default: 0 },
        suppressionCount: { type: Number, default: 0 },
        leads: { type: Array, default: [] },
      },
    },
    step4: {
      status: { type: String, default: "not_started" },
      data: {
        campaignName: { type: String, default: "Outreach Campaign #1" },
        targetLeadsCount: { type: Number, default: 0 },
        niche: { type: String, default: "B2B SaaS" },
        tone: { type: String, default: "Friendly & Casual" },
        messages: {
          connectionNote: { type: String, default: "" },
          followUp1: { type: String, default: "" },
          followUp2: { type: String, default: "" },
        },
        humanApproved: { type: Boolean, default: false },
        dailyCap: { type: Number, default: 20 },
        warmUpActive: { type: Boolean, default: true },
        status: { type: String, default: "draft" },
        stats: {
          sent: { type: Number, default: 0 },
          accepted: { type: Number, default: 0 },
          replied: { type: Number, default: 0 },
          meetingsBooked: { type: Number, default: 0 },
        },
      },
    },
  },
  { timestamps: true }
);

const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);

export default Workspace;
