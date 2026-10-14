import type { ConnectionStatus } from "@/models/LinkedInConnection";

export interface SafeConnection {
  id: string;
  linkedinName: string;
  linkedinAvatar: string;
  status: ConnectionStatus;
  lastVerifiedAt: Date | null;
}

export function toSafeConnection(connection: {
  id?: string;
  _id?: unknown;
  linkedinName?: string;
  linkedinAvatar?: string;
  status?: ConnectionStatus;
  lastVerifiedAt?: Date | null;
}): SafeConnection {
  return {
    id: connection.id || String(connection._id || ""),
    linkedinName: connection.linkedinName || "LinkedIn User",
    linkedinAvatar: connection.linkedinAvatar || "",
    status: connection.status || "expired",
    lastVerifiedAt: connection.lastVerifiedAt || null,
  };
}

export function isConnectionOwnedBy(
  connection: { userId?: string } | null | undefined,
  userId: string
): boolean {
  return Boolean(connection && connection.userId === userId);
}