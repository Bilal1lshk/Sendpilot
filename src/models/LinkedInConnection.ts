import mongoose, { Model, Schema } from "mongoose";

export const CONNECTION_STATUSES = ["active", "expired", "revoked", "disconnected"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export interface ILinkedInConnection {
  id: string;
  userId: string;
  encryptedCredentials: string;
  status: ConnectionStatus;
  linkedinName: string;
  linkedinAvatar: string;
  lastVerifiedAt?: Date;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LinkedInConnectionSchema = new Schema<ILinkedInConnection>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    encryptedCredentials: { type: String, required: true, select: false },
    status: { type: String, enum: CONNECTION_STATUSES, required: true, default: "active" },
    linkedinName: { type: String, default: "" },
    linkedinAvatar: { type: String, default: "" },
    lastVerifiedAt: { type: Date },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

LinkedInConnectionSchema.index({ userId: 1, id: 1 }, { unique: true });

const LinkedInConnection: Model<ILinkedInConnection> =
  mongoose.models.LinkedInConnection ||
  mongoose.model<ILinkedInConnection>("LinkedInConnection", LinkedInConnectionSchema);

export default LinkedInConnection;