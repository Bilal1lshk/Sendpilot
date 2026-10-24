import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Lead, { ILead, LeadSource, LEAD_SOURCES } from "@/models/Lead";
import Campaign, { ICampaign, ICampaignStep, STEP_TYPES } from "@/models/Campaign";
import CampaignLead, { EnrollmentState, FUNNEL_ORDER } from "@/models/CampaignLead";
import Workspace from "@/models/Workspace";
import { migrateLegacyLinkedInConnections } from "@/lib/linkedin-connections";
import { redactSensitive } from "@/lib/log-redactor";

// ───────────────────────────── Auth ─────────────────────────────

/**
 * Resolves the signed-in user's id and connects to MongoDB.
 * Returns a 401 response instead when there is no session (no more "demo-workspace" fallback).
 */
export async function requireUser(): Promise<{ userId: string; userName?: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized — please sign in" }, { status: 401 });
  }
  await connectDB();
  await migrateWorkspaceIfNeeded(userId);
  try {
    await migrateLegacyLinkedInConnections(userId);
  } catch (err) {
    console.error("Legacy LinkedIn connection migration failed for user", userId, err);
  }
  return { userId, userName: session?.user?.name || undefined };
}

export function isValidObjectId(id: string | null | undefined): id is string {
  return !!id && Types.ObjectId.isValid(id);
}

export function apiError(error: unknown, fallback: string, status = 500) {
  console.error(fallback, redactSensitive(error));
  return NextResponse.json({ success: false, error: fallback }, { status });
}

// ───────────────────────────── Leads ─────────────────────────────

/** Companies used by the extractor's generated placeholder data — used to flag sample leads on migration. */
const KNOWN_SAMPLE_COMPANIES = new Set(
  [
    "Tech Innovations Ltd", "Creative Pulse Studio", "BrandCraft Agency", "Pixel Peak Design",
    "Verve Interactive", "Neon Creative Lab", "Bold Brand Co", "Apex Digital Media",
    "Visionary Design House", "DesignForge Studio", "Kaleidoscope Creative", "Apex Global",
    "Vanguard Media", "Peak Strategies", "Hyperion Group", "NorthStar Advisory",
    "Catalyst Partners", "Nexus Enterprise", "CloudScale Technologies",
  ].map((c) => c.toLowerCase())
);

export interface RawLeadInput {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  jobTitle?: string;
  headline?: string;
  company?: string;
  location?: string;
  email?: string;
  linkedinUrl?: string;
  icpScore?: number | string;
  tags?: string[] | string;
  group?: string;
  notes?: string;
  isSample?: boolean;
  source?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLinkedInUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let u = url.trim();
  if (!u) return undefined;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes("linkedin.com")) return u.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `https://www.linkedin.com${path}`;
  } catch {
    return undefined;
  }
}

export function normalizeLead(raw: RawLeadInput, userId: string, source: LeadSource): Partial<ILead> | null {
  const nameParts = (raw.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = (raw.firstName || nameParts[0] || "").trim();
  const lastName = (raw.lastName || nameParts.slice(1).join(" ") || "").trim();

  const emailRaw = (raw.email || "").trim().toLowerCase();
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : undefined;
  const linkedinUrl = normalizeLinkedInUrl(raw.linkedinUrl);

  // A lead must be identifiable somehow
  if (!firstName && !email && !linkedinUrl) return null;

  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === "string"
    ? raw.tags.split(/[,;|]/)
    : [];

  const company = (raw.company || "").trim();
  const icp = Number(raw.icpScore);

  return {
    userId,
    firstName,
    lastName,
    title: (raw.title || raw.jobTitle || raw.headline || "").trim(),
    company,
    location: (raw.location || "").trim(),
    email,
    linkedinUrl,
    icpScore: Number.isFinite(icp) ? Math.max(0, Math.min(100, Math.round(icp))) : 0,
    source,
    tags: tags.map((t) => t.trim()).filter(Boolean),
    group: (raw.group || "").trim(),
    notes: (raw.notes || "").trim(),
    isSample:
      Boolean(raw.isSample) ||
      (source === "migrated" && KNOWN_SAMPLE_COMPANIES.has(company.toLowerCase())),
    status: "new",
  };
}

export function toLeadSource(value: unknown): LeadSource {
  const v = String(value || "").toLowerCase();
  if (v === "csv_upload" || v === "csv") return "csv";
  if (v === "profile_url" || v === "profile") return "profile";
  if ((LEAD_SOURCES as readonly string[]).includes(v)) return v as LeadSource;
  return "manual";
}

/**
 * Bulk-imports leads with dedupe both inside the batch and against existing DB rows
 * (the unique indexes are the final guarantee against races).
 */
export async function importLeads(userId: string, raws: RawLeadInput[], source: LeadSource) {
  let invalid = 0;
  let duplicates = 0;
  const seenEmails = new Set<string>();
  const seenUrls = new Set<string>();
  const candidates: Partial<ILead>[] = [];

  for (const raw of raws) {
    const lead = normalizeLead(raw, userId, source);
    if (!lead) {
      invalid++;
      continue;
    }
    if ((lead.email && seenEmails.has(lead.email)) || (lead.linkedinUrl && seenUrls.has(lead.linkedinUrl))) {
      duplicates++;
      continue;
    }
    if (lead.email) seenEmails.add(lead.email);
    if (lead.linkedinUrl) seenUrls.add(lead.linkedinUrl);
    candidates.push(lead);
  }

  if (candidates.length === 0) return { imported: 0, duplicates, invalid, leads: [] as ILead[] };

  const existing = await Lead.find(
    {
      userId,
      $or: [
        { email: { $in: [...seenEmails] } },
        { linkedinUrl: { $in: [...seenUrls] } },
      ],
    },
    { email: 1, linkedinUrl: 1 }
  ).lean();
  const existingEmails = new Set(existing.map((e) => e.email).filter(Boolean));
  const existingUrls = new Set(existing.map((e) => e.linkedinUrl).filter(Boolean));

  const fresh = candidates.filter((l) => {
    const dup = (l.email && existingEmails.has(l.email)) || (l.linkedinUrl && existingUrls.has(l.linkedinUrl));
    if (dup) duplicates++;
    return !dup;
  });

  let inserted: ILead[] = [];
  if (fresh.length > 0) {
    try {
      inserted = (await Lead.insertMany(fresh, { ordered: false })) as unknown as ILead[];
    } catch (err: unknown) {
      // E11000 duplicates from concurrent imports — keep the ones that did insert
      const details =
        typeof err === "object" && err !== null
          ? (err as { code?: unknown; writeErrors?: unknown; insertedDocs?: ILead[] })
          : {};
      if (details.code === 11000 || details.writeErrors) {
        inserted = Array.isArray(details.insertedDocs) ? details.insertedDocs : [];
        duplicates += fresh.length - inserted.length;
      } else {
        throw err;
      }
    }
  }

  return { imported: inserted.length, duplicates, invalid, leads: inserted };
}

export function serializeLead(
  l: Pick<
    ILead,
    | "_id"
    | "firstName"
    | "lastName"
    | "title"
    | "company"
    | "location"
    | "email"
    | "linkedinUrl"
    | "icpScore"
    | "source"
    | "tags"
    | "group"
    | "status"
    | "notes"
    | "isSample"
    | "createdAt"
    | "updatedAt"
  >
) {
  return {
    id: String(l._id),
    firstName: l.firstName || "",
    lastName: l.lastName || "",
    name: `${l.firstName || ""} ${l.lastName || ""}`.trim(),
    title: l.title || "",
    jobTitle: l.title || "", // backwards compat for older pages
    company: l.company || "",
    location: l.location || "",
    email: l.email || "",
    linkedinUrl: l.linkedinUrl || "",
    icpScore: l.icpScore ?? 0,
    source: l.source,
    tags: l.tags || [],
    group: l.group || "",
    status: l.status,
    notes: l.notes || "",
    isSample: Boolean(l.isSample),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

// ───────────────────────────── Campaigns ─────────────────────────────

/** Validates a user-supplied sequence. Returns null if any step is malformed. */
export function sanitizeSteps(raw: unknown): ICampaignStep[] | null {
  if (!Array.isArray(raw)) return null;
  const steps: ICampaignStep[] = [];
  for (const s of raw.slice(0, 20)) {
    if (!s || !(STEP_TYPES as readonly string[]).includes(s.type)) return null;
    steps.push({
      type: s.type,
      delayDays: Math.max(0, Math.min(60, Number(s.delayDays) || 0)),
      template: s.type === "wait" ? "" : String(s.template || "").slice(0, 2000),
    });
  }
  return steps;
}

export function renderTemplate(template: string, lead: { firstName?: string; lastName?: string; company?: string; title?: string; location?: string }) {
  const vars: Record<string, string> = {
    firstName: lead.firstName || "there",
    lastName: lead.lastName || "",
    fullName: `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "there",
    company: lead.company || "your company",
    title: lead.title || "your role",
    jobTitle: lead.title || "your role",
    location: lead.location || "",
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Starting from `fromIndex`, skip over "wait" steps (accumulating their delay) and
 * return the next actionable step index + when it becomes due.
 */
export function nextActionable(steps: ICampaignStep[], fromIndex: number, base: Date = new Date()) {
  let delay = 0;
  let i = fromIndex;
  while (i < steps.length && steps[i].type === "wait") {
    delay += steps[i].delayDays || 0;
    i++;
  }
  if (i >= steps.length) return { currentStep: steps.length, nextActionAt: undefined as Date | undefined };
  delay += steps[i].delayDays || 0;
  return { currentStep: i, nextActionAt: new Date(base.getTime() + delay * 86_400_000) };
}

export function funnelRank(state: EnrollmentState) {
  return FUNNEL_ORDER.indexOf(state);
}

export interface CampaignStats {
  enrolled: number;
  queued: number;
  invited: number;
  accepted: number;
  replied: number;
  meeting: number;
  failed: number;
  skipped: number;
  /** cumulative "reached at least this stage" counts */
  reachedInvited: number;
  reachedAccepted: number;
  reachedReplied: number;
  reachedMeeting: number;
  acceptRate: number;
  replyRate: number;
  meetingRate: number;
  dueNow: number;
}

export function emptyStats(): CampaignStats {
  return {
    enrolled: 0, queued: 0, invited: 0, accepted: 0, replied: 0, meeting: 0, failed: 0, skipped: 0,
    reachedInvited: 0, reachedAccepted: 0, reachedReplied: 0, reachedMeeting: 0,
    acceptRate: 0, replyRate: 0, meetingRate: 0, dueNow: 0,
  };
}

/** Aggregates real stats from CampaignLead rows. */
export async function getCampaignStats(userId: string, campaignIds: Types.ObjectId[]) {
  const result = new Map<string, CampaignStats>();
  campaignIds.forEach((id) => result.set(String(id), emptyStats()));
  if (campaignIds.length === 0) return result;

  const now = new Date();
  const rows = await CampaignLead.aggregate<{ _id: { c: Types.ObjectId; s: EnrollmentState }; n: number; due: number }>([
    { $match: { userId, campaignId: { $in: campaignIds } } },
    {
      $group: {
        _id: { c: "$campaignId", s: "$state" },
        n: { $sum: 1 },
        due: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$nextActionAt", null] }, { $lte: ["$nextActionAt", now] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  for (const r of rows) {
    const s = result.get(String(r._id.c));
    if (!s) continue;
    s[r._id.s] += r.n;
    s.enrolled += r.n;
    if (["queued", "accepted"].includes(r._id.s)) s.dueNow += r.due;
  }

  for (const s of result.values()) {
    s.reachedMeeting = s.meeting;
    s.reachedReplied = s.replied + s.reachedMeeting;
    s.reachedAccepted = s.accepted + s.reachedReplied;
    s.reachedInvited = s.invited + s.reachedAccepted;
    s.acceptRate = s.reachedInvited ? Math.round((s.reachedAccepted / s.reachedInvited) * 100) : 0;
    s.replyRate = s.reachedAccepted ? Math.round((s.reachedReplied / s.reachedAccepted) * 100) : 0;
    s.meetingRate = s.reachedReplied ? Math.round((s.reachedMeeting / s.reachedReplied) * 100) : 0;
  }
  return result;
}

export function serializeCampaign(
  c: Pick<
    ICampaign,
    | "_id"
    | "name"
    | "description"
    | "status"
    | "senderAccountId"
    | "senderName"
    | "steps"
    | "dailyCap"
    | "timezone"
    | "workingHours"
    | "launchedAt"
    | "createdAt"
    | "updatedAt"
  >,
  stats?: CampaignStats
) {
  return {
    id: String(c._id),
    name: c.name,
    description: c.description || "",
    status: c.status,
    senderAccountId: c.senderAccountId || "",
    senderName: c.senderName || "",
    steps: (c.steps || []).map((s) => ({ type: s.type, delayDays: s.delayDays || 0, template: s.template || "" })),
    dailyCap: c.dailyCap,
    timezone: c.timezone,
    workingHours: c.workingHours,
    launchedAt: c.launchedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    stats: stats || emptyStats(),
  };
}

export const DEFAULT_STEPS: ICampaignStep[] = [
  { type: "connect", delayDays: 0, template: "Hi {{firstName}}, I came across your profile and your work at {{company}} stood out. Would love to connect!" },
  { type: "wait", delayDays: 2, template: "" },
  { type: "message", delayDays: 0, template: "Thanks for connecting, {{firstName}}! Curious — how is {{company}} currently handling outbound?" },
  { type: "wait", delayDays: 3, template: "" },
  { type: "message", delayDays: 0, template: "Hey {{firstName}}, just bumping this in case it got buried. Happy to share a quick idea if useful." },
];

// ───────────────────────────── Migration ─────────────────────────────

const migratedUsers = new Set<string>();

/**
 * One-time copy of legacy Workspace.step3 leads / step4 campaign into the new collections.
 * Guarded by Workspace.crmMigratedAt so it runs once per user.
 */
export async function migrateWorkspaceIfNeeded(userId: string) {
  if (migratedUsers.has(userId)) return;
  const ws = await Workspace.findOne({ userId });
  if (!ws || ws.crmMigratedAt) {
    migratedUsers.add(userId);
    return;
  }

  try {
    const legacyLeads: RawLeadInput[] = ws.step3?.data?.leads || [];
    let importedIds: Types.ObjectId[] = [];
    if (legacyLeads.length > 0) {
      const res = await importLeads(userId, legacyLeads, "migrated");
      importedIds = res.leads.filter((l) => !l.isSample).map((l) => l._id as Types.ObjectId);
    }

    const step4 = ws.step4?.data;
    if (step4?.campaignName && ws.step4?.status === "completed") {
      const steps: ICampaignStep[] = [
        { type: "connect", delayDays: 0, template: step4.messages?.connectionNote || DEFAULT_STEPS[0].template },
        { type: "wait", delayDays: 2, template: "" },
        { type: "message", delayDays: 0, template: step4.messages?.followUp1 || DEFAULT_STEPS[2].template },
        { type: "wait", delayDays: 3, template: "" },
        { type: "message", delayDays: 0, template: step4.messages?.followUp2 || DEFAULT_STEPS[4].template },
      ];
      const campaign = await Campaign.create({
        userId,
        name: step4.campaignName,
        description: step4.niche || "",
        status: "paused",
        steps,
        dailyCap: step4.dailyCap || 20,
        senderName: ws.step2?.data?.connectedAccounts?.[0]?.name || "",
        senderAccountId: ws.step2?.data?.connectedAccounts?.[0]?.id || "",
      });
      if (importedIds.length > 0) {
        const first = nextActionable(steps, 0);
        await CampaignLead.insertMany(
          importedIds.map((leadId) => ({
            userId,
            campaignId: campaign._id,
            leadId,
            currentStep: first.currentStep,
            nextActionAt: first.nextActionAt,
            state: "queued",
            history: [{ event: "enrolled", at: new Date(), note: "migrated" }],
          })),
          { ordered: false }
        ).catch(() => undefined);
      }
    }

    ws.crmMigratedAt = new Date();
    await ws.save();
    migratedUsers.add(userId);
  } catch (err) {
    console.error("CRM migration failed for user", userId, err);
  }
}
