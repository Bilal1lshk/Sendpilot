import type { JWT } from "next-auth/jwt";
import type { JWTDecodeParams, JWTEncodeParams } from "@auth/core/jwt";
import AuthSession from "@/models/AuthSession";
import connectDB from "@/lib/mongodb";
import { createSessionId, hashSessionId } from "@/lib/session-id";

const SESSION_ID_HASH = "__sessionIdHash";

export async function encodeOpaqueSession({ token, maxAge }: JWTEncodeParams) {
  const sessionId = createSessionId();
  const expiresAt = new Date(Date.now() + (maxAge || 30 * 24 * 60 * 60) * 1000);
  await connectDB();
  await AuthSession.create({
    sessionIdHash: hashSessionId(sessionId),
    payload: JSON.stringify(token || {}),
    expiresAt,
  });
  return sessionId;
}

export async function decodeOpaqueSession({ token }: JWTDecodeParams): Promise<JWT | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await connectDB();
  const session = await AuthSession.findOne({
    sessionIdHash: hashSessionId(token),
    expiresAt: { $gt: new Date() },
  }).select("+payload");
  if (!session) return null;

  try {
    return { ...JSON.parse(session.payload), [SESSION_ID_HASH]: session.sessionIdHash } as JWT;
  } catch {
    await AuthSession.deleteOne({ _id: session._id });
    return null;
  }
}

export async function revokeOpaqueSession(token: JWT | null | undefined) {
  const sessionIdHash = token?.[SESSION_ID_HASH];
  if (typeof sessionIdHash !== "string") return;
  await connectDB();
  await AuthSession.deleteOne({ sessionIdHash });
}