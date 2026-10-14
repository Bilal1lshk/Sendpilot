import { NextResponse } from "next/server";
import Campaign from "@/models/Campaign";
import CampaignLead, { ENROLLMENT_STATES } from "@/models/CampaignLead";
import Lead from "@/models/Lead";
import { requireUser, apiError, isValidObjectId, nextActionable, renderTemplate, serializeLead } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

async function loadCampaign(id: string, userId: string) {
  if (!isValidObjectId(id)) return null;
  return Campaign.findOne({ _id: id, userId }).lean();
}

/**
 * GET /api/campaigns/:id/leads?state=&due=true&page=&limit=
 * Each row includes the lead, its enrollment state and the rendered next action.
 */
export async function GET(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const campaign = await loadCampaign(id, ctx.userId);
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");
    const dueOnly = searchParams.get("due") === "true";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));
    const now = new Date();

    const filter: Record<string, any> = { userId: ctx.userId, campaignId: campaign._id };
    if (state && (ENROLLMENT_STATES as readonly string[]).includes(state)) filter.state = state;
    if (dueOnly) {
      // "queued" = ready for first touch, "accepted" = ready for follow-ups. "invited" waits for acceptance.
      filter.state = { $in: ["queued", "accepted"] };
      filter.nextActionAt = { $lte: now };
    }

    const [rows, total] = await Promise.all([
      CampaignLead.find(filter)
        .sort(dueOnly ? { nextActionAt: 1 } : { updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CampaignLead.countDocuments(filter),
    ]);

    const leads = await Lead.find({ _id: { $in: rows.map((r) => r.leadId) }, userId: ctx.userId }).lean();
    const leadById = new Map(leads.map((l) => [String(l._id), l]));
    const steps = campaign.steps || [];

    const items = rows
      .filter((r) => leadById.has(String(r.leadId)))
      .map((r) => {
        const lead = leadById.get(String(r.leadId))!;
        const step = steps[r.currentStep];
        const active = ["queued", "invited", "accepted"].includes(r.state) && !!step;
        const waitingForAcceptance = active && r.state === "invited" && step?.type === "message";
        return {
          enrollmentId: String(r._id),
          state: r.state,
          currentStep: r.currentStep,
          totalSteps: steps.length,
          nextActionAt: r.nextActionAt,
          history: r.history,
          lead: serializeLead(lead),
          nextAction: active
            ? {
                stepIndex: r.currentStep,
                type: step.type,
                message: renderTemplate(step.template, lead),
                due: !waitingForAcceptance && !!r.nextActionAt && r.nextActionAt <= now,
                waitingForAcceptance,
              }
            : null,
        };
      });

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      campaignStatus: campaign.status,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch enrolled leads");
  }
}

/** POST /api/campaigns/:id/leads  { leadIds: string[] } — enroll (skips duplicates & sample leads) */
export async function POST(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const campaign = await loadCampaign(id, ctx.userId);
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    if (campaign.status === "completed") {
      return NextResponse.json({ success: false, error: "Campaign is completed" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds.filter(isValidObjectId) : [];
    if (leadIds.length === 0) return NextResponse.json({ success: false, error: "No lead ids provided" }, { status: 400 });

    const leads = await Lead.find({ userId: ctx.userId, _id: { $in: leadIds } }, { _id: 1, isSample: 1 }).lean();
    const realLeads = leads.filter((l) => !l.isSample);
    const sampleSkipped = leads.length - realLeads.length;

    const already = await CampaignLead.find(
      { campaignId: campaign._id, leadId: { $in: realLeads.map((l) => l._id) } },
      { leadId: 1 }
    ).lean();
    const alreadySet = new Set(already.map((a) => String(a.leadId)));
    const toEnroll = realLeads.filter((l) => !alreadySet.has(String(l._id)));

    const first = nextActionable(campaign.steps || [], 0);
    let enrolled = 0;
    if (toEnroll.length > 0) {
      try {
        const docs = await CampaignLead.insertMany(
          toEnroll.map((l) => ({
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
      } catch (err: any) {
        if (err?.code !== 11000 && !err?.writeErrors) throw err;
        enrolled = (err.insertedDocs || []).length;
      }
    }

    return NextResponse.json({
      success: true,
      enrolled,
      alreadyEnrolled: alreadySet.size,
      sampleSkipped,
      notFound: leadIds.length - leads.length,
    });
  } catch (error) {
    return apiError(error, "Failed to enroll leads");
  }
}

/** DELETE /api/campaigns/:id/leads  { enrollmentIds?: string[], leadIds?: string[] } — unenroll */
export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const campaign = await loadCampaign(id, ctx.userId);
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const enrollmentIds: string[] = (body.enrollmentIds || []).filter(isValidObjectId);
    const leadIds: string[] = (body.leadIds || []).filter(isValidObjectId);
    if (enrollmentIds.length === 0 && leadIds.length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to remove" }, { status: 400 });
    }

    const { deletedCount } = await CampaignLead.deleteMany({
      userId: ctx.userId,
      campaignId: campaign._id,
      $or: [{ _id: { $in: enrollmentIds } }, { leadId: { $in: leadIds } }],
    });
    return NextResponse.json({ success: true, removed: deletedCount });
  } catch (error) {
    return apiError(error, "Failed to remove leads from campaign");
  }
}
