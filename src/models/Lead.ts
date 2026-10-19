import mongoose, { Schema, Document, Model } from "mongoose";

export const LEAD_STATUSES = ["new", "contacted", "replied", "meeting", "not_interested"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["csv", "linkedin_search", "profile", "manual", "migrated"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ILead extends Document {
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  location: string;
  email?: string;
  linkedinUrl?: string;
  icpScore: number;
  source: LeadSource;
  tags: string[];
  group: string;
  status: LeadStatus;
  notes: string;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    userId: { type: String, required: true, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    // Stored lowercased; undefined (not "") when missing so the sparse unique index ignores it
    email: { type: String, lowercase: true, trim: true },
    linkedinUrl: { type: String, trim: true },
    icpScore: { type: Number, default: 0, min: 0, max: 100 },
    source: { type: String, enum: LEAD_SOURCES, default: "manual" },
    tags: { type: [String], default: [] },
    group: { type: String, default: "", index: true, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new", index: true },
    notes: { type: String, default: "" },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// DB-level dedupe per user. Partial filters so leads without email/url don't collide.
LeadSchema.index(
  { userId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);
LeadSchema.index(
  { userId: 1, linkedinUrl: 1 },
  { unique: true, partialFilterExpression: { linkedinUrl: { $type: "string" } } }
);
LeadSchema.index({ userId: 1, group: 1 });
LeadSchema.index({ userId: 1, createdAt: -1 });
LeadSchema.index({ firstName: "text", lastName: "text", company: "text", title: "text", email: "text" });

const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
