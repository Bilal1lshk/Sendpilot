import mongoose, { Schema, Document, Model } from "mongoose";

export type VerificationPurpose =
  | "login_otp"
  | "reset_password"
  | "verification"
  | "email_verification";

export interface IVerificationToken extends Document {
  email: string;
  purpose: VerificationPurpose;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationTokenSchema: Schema<IVerificationToken> = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ["login_otp", "reset_password", "verification", "email_verification"],
      index: true,
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Automatically purge expired OTP/reset tokens from MongoDB
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerificationTokenSchema.index({ email: 1, purpose: 1 });

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
