import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Funnel order matters: a lead's state only moves forward along this list
 * (except failed/skipped, which are terminal side-exits).
 */
export const ENROLLMENT_STATES = [
  "queued",
  "invited",
  "accepted",
  "replied",
  "meeting",
  "failed",
  "skipped",
] as const;
export type EnrollmentState = (typeof ENROLLMENT_STATES)[number];

export const FUNNEL_ORDER: EnrollmentState[] = ["queued", "invited", "accepted", "replied", "meeting"];

export interface IEnrollmentEvent {
  event: string;
  at: Date;
  stepIndex?: number;
  note?: string;
  error?: string;
}

export interface ICampaignLead extends Document {
  userId: string;
  campaignId: Types.ObjectId;
  leadId: Types.ObjectId;
  currentStep: number;
  state: EnrollmentState;
  nextActionAt?: Date;
  lastError?: string;
  history: IEnrollmentEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEnrollmentEvent>(
  {
    event: { type: String, required: true },
    at: { type: Date, default: Date.now },
    stepIndex: { type: Number },
    note: { type: String },
    error: { type: String },
  },
  { _id: false }
);

const CampaignLeadSchema = new Schema<ICampaignLead>(
  {
    userId: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    currentStep: { type: Number, default: 0 },
    state: { type: String, enum: ENROLLMENT_STATES, default: "queued", index: true },
    nextActionAt: { type: Date, index: true },
    lastError: { type: String },
    history: { type: [EventSchema], default: [] },
  },
  { timestamps: true }
);

// A lead can only be enrolled once per campaign
CampaignLeadSchema.index({ campaignId: 1, leadId: 1 }, { unique: true });

const CampaignLead: Model<ICampaignLead> =
  mongoose.models.CampaignLead || mongoose.model<ICampaignLead>("CampaignLead", CampaignLeadSchema);

export default CampaignLead;
