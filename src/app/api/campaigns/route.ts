import { NextResponse } from "next/server";
import { Types } from "mongoose";
import Campaign from "@/models/Campaign";
import CampaignLead from "@/models/CampaignLead";
import Lead from "@/models/Lead";
import LinkedInConnection from "@/models/LinkedInConnection";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";
import { verifyConnection } from "@/lib/linkedin-connections";
import {
  requireUser,
  apiError,
  getCampaignStats,
  serializeCampaign,
  DEFAULT_STEPS,
  isValidObjectId,
  nextActionable,
  sanitizeSteps,
} from "@/lib/crm";
import { getDbCache, setDbCache, invalidateDbCache } from "@/lib/db-cache";

/** GET /api/campaigns — every campaign for the user with live aggregated stats */
export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const cached = getDbCache<Record<string, unknown>>(ctx.userId, "campaigns");
    if (cached) {
      return NextResponse.json(cached);
    }

    const [campaigns, availableLeadsCount, connectionRows] = await Promise.all([
      Campaign.find({ userId: ctx.userId }).sort({ createdAt: -1 }).lean(),
      Lead.countDocuments({ userId: ctx.userId, isSample: { $ne: true } }),
      LinkedInConnection.find({ userId: ctx.userId }).sort({ createdAt: -1 }),
    ]);

    const stats = await getCampaignStats(
      ctx.userId,
      campaigns.map((c) => c._id as Types.ObjectId)
    );

    const accounts = connectionRows.map(toSafeConnection);

    const payload = {
      success: true,
      campaigns: campaigns.map((c) => serializeCampaign(c, stats.get(String(c._id)))),
      availableLeadsCount,
      availableAccountsCount: accounts.length,
      accounts,
    };

    setDbCache(ctx.userId, "campaigns", payload);
    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, "Failed to fetch campaigns");
  }
}

/**
 * POST /api/campaigns
 * { name, description?, steps?, dailyCap?, senderAccountId?, timezone?, workingHours?, leadIds?: string[], launch?: boolean }
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ success: false, error: "Campaign name is required" }, { status: 400 });

    // Concurrency & double-click duplicate protection
    const recentDuplicate = await Campaign.findOne({
      userId: ctx.userId,
      name,
      createdAt: { $gte: new Date(Date.now() - 4000) },
    }).lean();
    if (recentDuplicate) {
      return NextResponse.json(
        { success: false, error: "Duplicate submission: campaign was just created." },
        { status: 409 }
      );
    }

    const steps = body.steps === undefined ? DEFAULT_STEPS : sanitizeSteps(body.steps);
    if (!steps) return NextResponse.json({ success: false, error: "Invalid sequence steps" }, { status: 400 });
    if (!steps.some((s) => s.type !== "wait")) {
      return NextResponse.json({ success: false, error: "Sequence needs at least one connect or message step" }, { status: 400 });
    }

    let senderName = "";
    let senderAccountId = String(body.senderAccountId || "");
    if (senderAccountId) {
      const connection = await LinkedInConnection.findOne({ id: senderAccountId, userId: ctx.userId });
      if (!connection) return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
      senderName = connection.linkedinName;
    } else {
      const activeConn = await LinkedInConnection.findOne({ userId: ctx.userId, confirmedAt: { $ne: null } }).sort({ updatedAt: -1 });
      if (activeConn) {
        senderAccountId = activeConn.id;
        senderName = activeConn.linkedinName;
      }
    }

    const launch = Boolean(body.launch);
    if (launch) {
      const connection = senderAccountId
        ? await LinkedInConnection.findOne({ id: senderAccountId, userId: ctx.userId })
        : null;
      if (!connection || !connection.confirmedAt) {
        return NextResponse.json({ success: false, error: "Confirm a LinkedIn sender account before launching" }, { status: 409 });
      }
      const verification = await verifyConnection(senderAccountId, ctx.userId);
      if (!verification?.verified) {
        return NextResponse.json({ success: false, error: "LinkedIn authorization expired. Queued work was stopped." }, { status: 409 });
      }
    }
    const campaign = await Campaign.create({
      userId: ctx.userId,
      name,
      description: String(body.description || ""),
      steps,
      dailyCap: Math.max(1, Math.min(100, Number(body.dailyCap) || 20)),
      senderAccountId,
      senderName,
      flowId: body.flowId || undefined,
      flowName: body.flowName || undefined,
      timezone: body.timezone || undefined,
      workingHours: body.workingHours || undefined,
      status: launch ? "active" : "draft",
      launchedAt: launch ? new Date() : undefined,
    });

    // Optional initial enrollment
    let enrolled = 0;
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds.filter(isValidObjectId) : [];
    if (leadIds.length > 0) {
      const validLeads = await Lead.find(
        { userId: ctx.userId, _id: { $in: leadIds }, isSample: { $ne: true } },
        { _id: 1 }
      ).lean();
      const first = nextActionable(steps, 0);
      if (validLeads.length > 0) {
        const docs = await CampaignLead.insertMany(
          validLeads.map((l) => ({
            userId: ctx.userId,
            campaignId: campaign._id,
            leadId: l._id,
            currentStep: first.currentStep,
            nextActionAt: first.nextActionAt,
            state: "queued",
            history: [{ event: "enrolled", at: new Date() }],
          })),
          { ordered: false }
        );
        enrolled = docs.length;
      }
    }

    invalidateDbCache(ctx.userId, ["campaigns", "overview", "settings"]);
    const stats = await getCampaignStats(ctx.userId, [campaign._id as Types.ObjectId]);
    return NextResponse.json(
      { success: true, enrolled, campaign: serializeCampaign(campaign.toObject(), stats.get(String(campaign._id))) },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error, "Failed to create campaign");
  }
}
