import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadGroup extends Document {
  userId: string;
  name: string;
  description: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadGroupSchema = new Schema<ILeadGroup>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#16a34a" },
  },
  { timestamps: true }
);

// One group name per user
LeadGroupSchema.index({ userId: 1, name: 1 }, { unique: true });
LeadGroupSchema.index({ userId: 1, createdAt: -1 });

const LeadGroup: Model<ILeadGroup> =
  mongoose.models.LeadGroup || mongoose.model<ILeadGroup>("LeadGroup", LeadGroupSchema);

export default LeadGroup;
