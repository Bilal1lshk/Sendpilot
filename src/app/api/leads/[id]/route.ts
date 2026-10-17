import { NextResponse } from "next/server";
import Lead, { LEAD_STATUSES } from "@/models/Lead";
import CampaignLead from "@/models/CampaignLead";
import Campaign from "@/models/Campaign";
import { requireUser, serializeLead, apiError, isValidObjectId, normalizeLinkedInUrl } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const lead = await Lead.findOne({ _id: id, userId: ctx.userId }).lean();
    if (!lead) return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });

    const enrollments = await CampaignLead.find({ userId: ctx.userId, leadId: id }).lean();
    const campaigns = await Campaign.find(
      { _id: { $in: enrollments.map((e) => e.campaignId) } },
      { name: 1, status: 1 }
    ).lean();
    const nameById = new Map(campaigns.map((c) => [String(c._id), c]));

    return NextResponse.json({
      success: true,
      lead: serializeLead(lead),
      enrollments: enrollments.map((e) => ({
        id: String(e._id),
        campaignId: String(e.campaignId),
        campaignName: nameById.get(String(e.campaignId))?.name || "Deleted campaign",
        state: e.state,
        currentStep: e.currentStep,
        nextActionAt: e.nextActionAt,
        history: e.history,
      })),
    });
  } catch (error) {
    return apiError(error, "Failed to fetch lead");
  }
}

const EDITABLE = ["firstName", "lastName", "title", "company", "location", "notes"] as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const update: Record<string, any> = {};

    for (const key of EDITABLE) {
      if (typeof body[key] === "string") update[key] = body[key].trim();
    }
    if (body.status !== undefined) {
      if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
    }
    if (Array.isArray(body.tags)) update.tags = body.tags.map((t: string) => String(t).trim()).filter(Boolean);
    if (body.icpScore !== undefined) update.icpScore = Math.max(0, Math.min(100, Number(body.icpScore) || 0));
    if (typeof body.isSample === "boolean") update.isSample = body.isSample;
    if (typeof body.email === "string") update.email = body.email.trim().toLowerCase() || undefined;
    if (typeof body.linkedinUrl === "string") update.linkedinUrl = normalizeLinkedInUrl(body.linkedinUrl);

    const lead = await Lead.findOneAndUpdate({ _id: id, userId: ctx.userId }, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
    if (!lead) return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });

    return NextResponse.json({ success: true, lead: serializeLead(lead) });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: "Another lead already has that email or LinkedIn URL" }, { status: 409 });
    }
    return apiError(error, "Failed to update lead");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const { deletedCount } = await Lead.deleteOne({ _id: id, userId: ctx.userId });
    if (!deletedCount) return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    await CampaignLead.deleteMany({ userId: ctx.userId, leadId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to delete lead");
  }
}
