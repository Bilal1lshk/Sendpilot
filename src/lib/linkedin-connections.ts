import { randomUUID } from "node:crypto";
import Campaign from "@/models/Campaign";
import CampaignLead from "@/models/CampaignLead";
import LinkedInConnection, { type ILinkedInConnection } from "@/models/LinkedInConnection";
import Workspace from "@/models/Workspace";
import { decryptConnectionSecrets, encryptConnectionSecrets } from "@/lib/connection-crypto";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";

export interface LinkedInCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  linkedinMemberId?: string;
}

interface LegacyLinkedInAccount {
  id?: unknown;
  name?: unknown;
  photo?: unknown;
  accessToken?: unknown;
  refreshToken?: unknown;
  tokenExpiresAt?: unknown;
  linkedinMemberId?: unknown;
  linkedinId?: unknown;
}

export function createConnectionId() {
  return `li_${randomUUID()}`;
}

export async function createConnection(
  userId: string,
  credentials: LinkedInCredentials,
  id = createConnectionId()
) {
  const connection = await LinkedInConnection.create({
    id,
    userId,
    encryptedCredentials: encryptConnectionSecrets(credentials),
    status: "active",
    linkedinName: "",
    linkedinAvatar: "",
  });
  return connection;
}

export async function findOwnedConnection(id: string, userId: string) {
  return LinkedInConnection.findOne({ id, userId }).select("+encryptedCredentials");
}

export async function stopConnectionJobs(connectionId: string, userId: string) {
  const campaigns = await Campaign.find({
    userId,
    senderAccountId: connectionId,
  }).select("_id");
  const campaignIds = campaigns.map((campaign) => campaign._id);
  if (campaignIds.length === 0) return;

  await Promise.all([
    Campaign.updateMany(
      { userId, _id: { $in: campaignIds }, status: "active" },
      { $set: { status: "paused" } }
    ),
    CampaignLead.updateMany(
      {
        userId,
        campaignId: { $in: campaignIds },
        state: { $in: ["queued", "accepted"] },
      },
      { $set: { state: "skipped" }, $unset: { nextActionAt: 1 } }
    ),
  ]);
}

function normalizeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export async function verifyConnection(id: string, userId: string) {
  const connection = await findOwnedConnection(id, userId);
  if (!connection) return null;

  try {
    const credentials = decryptConnectionSecrets<LinkedInCredentials>(connection.encryptedCredentials);
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("LinkedIn profile verification failed");

    const profile = await response.json();
    const name = String(profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`).trim();
    if (!name) throw new Error("LinkedIn profile name is unavailable");

    if (credentials.linkedinMemberId && credentials.linkedinMemberId !== String(profile.sub || "")) {
      throw new Error("LinkedIn member does not match the connected account");
    }
    if (connection.linkedinName && normalizeName(connection.linkedinName) !== normalizeName(name)) {
      throw new Error("LinkedIn profile does not match the connected account");
    }

    connection.linkedinName = name;
    connection.linkedinAvatar = String(profile.picture || connection.linkedinAvatar || "");
    connection.status = "active";
    connection.lastVerifiedAt = new Date();
    await connection.save();
    return {
      verified: true as const,
      memberId: String(profile.sub || ""),
      connection: toSafeConnection(connection),
    };
  } catch {
    connection.status = "expired";
    await connection.save();
    await stopConnectionJobs(id, userId);
    return { verified: false as const, connection: toSafeConnection(connection) };
  }
}

export async function disconnectOtherAccounts(userId: string, activeConnectionId: string) {
  const otherConnections = await LinkedInConnection.find({
    userId,
    id: { $ne: activeConnectionId },
    status: "active",
  });

  for (const conn of otherConnections) {
    conn.status = "disconnected";
    await conn.save();
    await stopConnectionJobs(conn.id, userId);
  }
}

export async function disconnectConnection(id: string, userId: string) {
  const connection = await LinkedInConnection.findOne({ id, userId });
  if (!connection) return null;

  connection.status = "disconnected";
  await connection.save();
  await stopConnectionJobs(id, userId);
  return toSafeConnection(connection);
}

export async function connectAccount(id: string, userId: string) {
  const connection = await LinkedInConnection.findOne({ id, userId });
  if (!connection) return null;

  const result = await verifyConnection(id, userId);
  if (!result || !result.verified) {
    return {
      success: false as const,
      verified: false as const,
      requiresAuth: true,
      error: "LinkedIn authorization expired. Please reconnect.",
      connection: result ? result.connection : toSafeConnection(connection),
    };
  }

  // Ensure connection is active and confirmed
  connection.status = "active";
  connection.lastVerifiedAt = new Date();
  if (!connection.confirmedAt) {
    connection.confirmedAt = new Date();
  }
  await connection.save();

  // Automatically disconnect any other active accounts for this user
  await disconnectOtherAccounts(userId, id);

  return {
    success: true as const,
    verified: true as const,
    connection: toSafeConnection(connection),
  };
}

export async function connectWithCredentials(userId: string, credentials: LinkedInCredentials) {
  const connection = await createConnection(userId, credentials);
  const result = await verifyConnection(connection.id, userId);
  if (!result || !result.verified) return result;

  if (result.memberId) {
    const existing = await LinkedInConnection.find({ userId, id: { $ne: connection.id } })
      .select("+encryptedCredentials");
    for (const candidate of existing) {
      try {
        const stored = decryptConnectionSecrets<LinkedInCredentials>(candidate.encryptedCredentials);
        if (stored.linkedinMemberId !== result.memberId) continue;

        candidate.encryptedCredentials = connection.encryptedCredentials;
        candidate.status = "active";
        candidate.linkedinName = connection.linkedinName;
        candidate.linkedinAvatar = connection.linkedinAvatar;
        candidate.lastVerifiedAt = connection.lastVerifiedAt;
        candidate.confirmedAt = candidate.confirmedAt || undefined;
        await candidate.save();
        await connection.deleteOne();
        await disconnectOtherAccounts(userId, candidate.id);
        return { verified: true as const, alreadyConnected: true, connection: toSafeConnection(candidate) };
      } catch {
        continue;
      }
    }
  }

  const stored = decryptConnectionSecrets<LinkedInCredentials>(connection.encryptedCredentials);
  if (result.memberId && stored.linkedinMemberId !== result.memberId) {
    connection.encryptedCredentials = encryptConnectionSecrets({ ...stored, linkedinMemberId: result.memberId });
    await connection.save();
  }
  await disconnectOtherAccounts(userId, connection.id);
  return { verified: true as const, alreadyConnected: false, connection: result.connection };
}

export async function migrateLegacyLinkedInConnections(userId: string) {
  const workspace = await Workspace.findOne({ userId });
  const legacyAccounts = (workspace?.step2?.data?.connectedAccounts || []) as LegacyLinkedInAccount[];
  if (!workspace || legacyAccounts.length === 0) return;

  for (const account of legacyAccounts) {
    const id = typeof account.id === "string" ? account.id : createConnectionId();
    const accessToken = typeof account.accessToken === "string" ? account.accessToken : "";
    const refreshToken = typeof account.refreshToken === "string" ? account.refreshToken : undefined;
    const expires = account.tokenExpiresAt ? new Date(String(account.tokenExpiresAt)) : null;
    const linkedinMemberId = typeof account.linkedinMemberId === "string"
      ? account.linkedinMemberId
      : typeof account.linkedinId === "string" ? account.linkedinId : undefined;
    let connection = await LinkedInConnection.findOne({ id, userId }).select("+encryptedCredentials");
    if (!connection) {
      connection = await LinkedInConnection.create({
        id,
        userId,
        encryptedCredentials: encryptConnectionSecrets({
          accessToken,
          refreshToken,
          tokenExpiresAt: expires && !Number.isNaN(expires.getTime()) ? expires.toISOString() : undefined,
          linkedinMemberId,
        }),
        status: "expired",
        linkedinName: typeof account.name === "string" ? account.name : "LinkedIn User",
        linkedinAvatar: typeof account.photo === "string" ? account.photo : "",
      });
    }
  }

  workspace.step2.data.connectedAccounts = [];
  workspace.markModified("step2.data.connectedAccounts");
  await workspace.save();
}

export function safeConnectionList(connections: ILinkedInConnection[]) {
  return connections.map(toSafeConnection);
}