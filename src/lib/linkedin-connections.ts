import { randomUUID } from "node:crypto";
import Campaign from "@/models/Campaign";
import CampaignLead from "@/models/CampaignLead";
import LinkedInConnection, { ILinkedInConnection } from "@/models/LinkedInConnection";
import Workspace from "@/models/Workspace";
import { decryptConnectionSecrets, encryptConnectionSecrets } from "@/lib/connection-crypto";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";

export interface LinkedInCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  linkedinMemberId?: string;
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
    status: "active",
  }).select("_id");
  const campaignIds = campaigns.map((campaign) => campaign._id);
  if (campaignIds.length === 0) return;

  await Promise.all([
    Campaign.updateMany(
      { userId, _id: { $in: campaignIds } },
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
        candidate.confirmedAt = undefined;
        await candidate.save();
        await connection.deleteOne();
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
  return { verified: true as const, alreadyConnected: false, connection: result.connection };
}

export async function migrateLegacyLinkedInConnections(userId: string) {
  const workspace = await Workspace.findOne({ userId });
  const legacyAccounts = (workspace?.step2?.data?.connectedAccounts || []) as Array<Record<string, any>>;
  if (!workspace || legacyAccounts.length === 0) return;

  for (const account of legacyAccounts) {
    const id = String(account.id || createConnectionId());
    let connection = await LinkedInConnection.findOne({ id, userId }).select("+encryptedCredentials");
    if (!connection) {
      connection = await LinkedInConnection.create({
        id,
        userId,
        encryptedCredentials: encryptConnectionSecrets({
          accessToken: account.accessToken || "",
          refreshToken: account.refreshToken || undefined,
          tokenExpiresAt: account.tokenExpiresAt ? new Date(account.tokenExpiresAt).toISOString() : undefined,
          linkedinMemberId: account.linkedinMemberId || account.linkedinId || undefined,
        }),
        status: account.accessToken ? "active" : "expired",
        linkedinName: String(account.name || "LinkedIn User"),
        linkedinAvatar: String(account.photo || ""),
        confirmedAt: new Date(),
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