import { createHash, randomBytes } from "node:crypto";

export function createSessionId() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}