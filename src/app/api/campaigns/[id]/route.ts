import { NextResponse } from "next/server";
import { Types } from "mongoose";
import Campaign, { CAMPAIGN_STATUSES } from "@/models/Campaign";
import CampaignLead from "@/models/CampaignLead";
import LinkedInConnection from "@/models/LinkedInConnection";
import { verifyConnection } from "@/lib/linkedin-connections";
import {
  requireUser,
  apiError,
  getCampaignStats,
  serializeCampaign,
  isValidObjectId,
  sanitizeSteps,
} from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** GET /api/campaigns/:id — campaign + funnel stats + today's send budget */
export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const campaign = await Campaign.findOne({ _id: id, userId: ctx.userId }).lean();
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });

    const campaignId = new Types.ObjectId(id);
    const [stats, sentTodayAgg] = await Promise.all([
      getCampaignStats(ctx.userId, [campaignId]),
      CampaignLead.aggregate<{ n: number }>([
        { $match: { userId: ctx.userId, campaignId } },
        { $unwind: "$history" },
        { $match: { "history.event": "step_sent", "history.at": { $gte: startOfToday() } } },
        { $count: "n" },
      ]),
    ]);

    const sentToday = sentTodayAgg[0]?.n || 0;
    const s = stats.get(id)!;

    return NextResponse.json({
      success: true,
      campaign: serializeCampaign(campaign, s),
      funnel: [
        { stage: "Enrolled", count: s.enrolled },
        { stage: "Invited", count: s.reachedInvited },
        { stage: "Accepted", count: s.reachedAccepted },
        { stage: "Replied", count: s.reachedReplied },
        { stage: "Meeting", count: s.reachedMeeting },
        ...(s.failed > 0 ? [{ stage: "Failed", count: s.failed }] : []),
      ],
      failedCount: s.failed,
      sentToday,
      remainingToday: Math.max(0, campaign.dailyCap - sentToday),
    });
  } catch (error) {
    return apiError(error, "Failed to fetch campaign");
  }
}

/** PATCH /api/campaigns/:id — edit fields and/or change status (active | paused | completed | draft) */
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const campaign = await Campaign.findOne({ _id: id, userId: ctx.userId });
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });

    if (typeof body.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ success: false, error: "Name cannot be empty" }, { status: 400 });
      campaign.name = body.name.trim();
    }
    if (typeof body.description === "string") campaign.description = body.description;
    if (body.dailyCap !== undefined) campaign.dailyCap = Math.max(1, Math.min(100, Number(body.dailyCap) || 20));
    if (typeof body.timezone === "string") campaign.timezone = body.timezone;
    if (typeof body.workingHours === "string") campaign.workingHours = body.workingHours;

    if (body.steps !== undefined) {
      const steps = sanitizeSteps(body.steps);
      if (!steps || !steps.some((st) => st.type !== "wait")) {
        return NextResponse.json({ success: false, error: "Invalid sequence steps" }, { status: 400 });
      }
      campaign.steps = steps;
      // Clamp enrollments that now point past the end of a shortened sequence
      await CampaignLead.updateMany(
        { campaignId: campaign._id, currentStep: { $gte: steps.length } },
        { $set: { currentStep: steps.length }, $unset: { nextActionAt: 1 } }
      );
    }

    if (typeof body.senderAccountId === "string") {
      campaign.senderAccountId = body.senderAccountId;
      const connection = body.senderAccountId
        ? await LinkedInConnection.findOne({ id: body.senderAccountId, userId: ctx.userId })
        : null;
      if (body.senderAccountId && !connection) {
        return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
      }
      campaign.senderName = connection?.linkedinName || "";
    }

    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      if (!(CAMPAIGN_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      if (status === "active") {
        const enrolled = await CampaignLead.countDocuments({ campaignId: campaign._id });
        if (enrolled === 0) {
          return NextResponse.json({ success: false, error: "Add at least one lead before launching" }, { status: 400 });
        }
        const connection = campaign.senderAccountId
          ? await LinkedInConnection.findOne({ id: campaign.senderAccountId, userId: ctx.userId })
          : null;
        if (!connection || !connection.confirmedAt) {
          return NextResponse.json({ success: false, error: "Confirm a LinkedIn sender account before launching" }, { status: 409 });
        }
        const verification = await verifyConnection(connection.id, ctx.userId);
        if (!verification?.verified) {
          return NextResponse.json({ success: false, error: "LinkedIn authorization expired. Queued work was stopped." }, { status: 409 });
        }
        if (!campaign.launchedAt) campaign.launchedAt = new Date();
      }
      campaign.status = status as (typeof CAMPAIGN_STATUSES)[number];
    }

    await campaign.save();
    const stats = await getCampaignStats(ctx.userId, [campaign._id as Types.ObjectId]);
    return NextResponse.json({ success: true, campaign: serializeCampaign(campaign.toObject(), stats.get(id)) });
  } catch (error) {
    return apiError(error, "Failed to update campaign");
  }
}

/** DELETE /api/campaigns/:id — removes campaign and its enrollments (leads are kept) */
export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const { deletedCount } = await Campaign.deleteOne({ _id: id, userId: ctx.userId });
    if (!deletedCount) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    await CampaignLead.deleteMany({ userId: ctx.userId, campaignId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to delete campaign");
  }
}
