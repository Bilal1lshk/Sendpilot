import mongoose, { Schema, Document, Model } from "mongoose";

export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const STEP_TYPES = ["connect", "message", "wait"] as const;
export type StepType = (typeof STEP_TYPES)[number];

export interface ICampaignStep {
  type: StepType;
  delayDays: number;
  template: string;
}

export interface ICampaign extends Document {
  userId: string;
  name: string;
  description: string;
  status: CampaignStatus;
  senderAccountId: string;
  senderName: string;
  flowId?: string;
  flowName?: string;
  steps: ICampaignStep[];
  dailyCap: number;
  timezone: string;
  workingHours: string;
  launchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StepSchema = new Schema<ICampaignStep>(
  {
    type: { type: String, enum: STEP_TYPES, required: true },
    delayDays: { type: Number, default: 0, min: 0 },
    template: { type: String, default: "" },
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: "draft" },
    senderAccountId: { type: String, default: "" },
    senderName: { type: String, default: "" },
    flowId: { type: String, default: "" },
    flowName: { type: String, default: "" },
    steps: { type: [StepSchema], default: [] },
    dailyCap: { type: Number, default: 20, min: 1, max: 100 },
    timezone: { type: String, default: "Asia/Karachi" },
    workingHours: { type: String, default: "9:00 AM - 5:00 PM" },
    launchedAt: { type: Date },
  },
  { timestamps: true }
);

CampaignSchema.index({ userId: 1, createdAt: -1 });

const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;
