import mongoose, { Model, Schema } from "mongoose";

interface IAuthSession {
  sessionIdHash: string;
  payload: string;
  expiresAt: Date;
}

const AuthSessionSchema = new Schema<IAuthSession>(
  {
    sessionIdHash: { type: String, required: true, unique: true },
    payload: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthSession: Model<IAuthSession> =
  mongoose.models.AuthSession || mongoose.model<IAuthSession>("AuthSession", AuthSessionSchema);

export default AuthSession;