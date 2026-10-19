import { NextResponse } from "next/server";
import Campaign from "@/models/Campaign";
import CampaignLead, { EnrollmentState } from "@/models/CampaignLead";
import Lead, { LeadStatus } from "@/models/Lead";
import LinkedInConnection from "@/models/LinkedInConnection";
import { verifyConnection } from "@/lib/linkedin-connections";
import { requireUser, apiError, isValidObjectId, nextActionable, funnelRank } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

const EVENTS = ["sent", "accepted", "replied", "meeting", "failed", "skipped", "reset"] as const;
type CampaignEvent = (typeof EVENTS)[number];

/** Funnel states only move forward; failed/skipped can always be overridden */
function canAdvance(from: EnrollmentState, to: EnrollmentState) {
  if (from === "failed" || from === "skipped") return true;
  return funnelRank(to) > funnelRank(from);
}

const LEAD_STATUS_FOR: Partial<Record<EnrollmentState, LeadStatus>> = {
  invited: "contacted",
  accepted: "contacted",
  replied: "replied",
  meeting: "meeting",
};
const LEAD_STATUS_RANK: LeadStatus[] = ["new", "contacted", "replied", "meeting"];

/**
 * POST /api/campaigns/:id/events  { enrollmentIds: string[], event, note? }
 *
 * - sent:      the current step was sent → connect ⇒ invited; message from queued ⇒ accepted (existing connection).
 *              Advances to the next step and schedules it.
 * - accepted / replied / meeting: move forward in the funnel. replied/meeting stop the sequence.
 * - failed / skipped: exit the sequence.
 * - reset:     back to queued at step 0.
 */
export async function POST(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const event = body.event as CampaignEvent;
    if (!EVENTS.includes(event)) {
      return NextResponse.json({ success: false, error: `event must be one of ${EVENTS.join(", ")}` }, { status: 400 });
    }
    const enrollmentIds: string[] = (Array.isArray(body.enrollmentIds) ? body.enrollmentIds : []).filter(isValidObjectId);
    if (enrollmentIds.length === 0) {
      return NextResponse.json({ success: false, error: "No enrollment ids provided" }, { status: 400 });
    }

    const campaign = await Campaign.findOne({ _id: id, userId: ctx.userId }).lean();
    if (!campaign) return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    if (event === "sent" && campaign.status !== "active") {
      return NextResponse.json({ success: false, error: "Launch or resume the campaign before sending" }, { status: 400 });
    }
    if (event === "sent") {
      let connection = campaign.senderAccountId
        ? await LinkedInConnection.findOne({ id: campaign.senderAccountId, userId: ctx.userId })
        : null;
      if (!connection) {
        connection = await LinkedInConnection.findOne({ userId: ctx.userId, confirmedAt: { $ne: null } }).sort({ updatedAt: -1 });
        if (connection) {
          await Campaign.updateOne({ _id: campaign._id }, { senderAccountId: connection.id, senderName: connection.linkedinName });
        }
      }
      if (!connection) return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
      if (!connection.confirmedAt) {
        return NextResponse.json({ success: false, error: "Confirm the LinkedIn sender account before sending" }, { status: 409 });
      }
      const verification = await verifyConnection(connection.id, ctx.userId);
      if (!verification?.verified) {
        return NextResponse.json({ success: false, error: "LinkedIn authorization expired. Queued work was stopped." }, { status: 409 });
      }
    }

    const steps = campaign.steps || [];
    const enrollments = await CampaignLead.find({ _id: { $in: enrollmentIds }, campaignId: campaign._id, userId: ctx.userId });
    const now = new Date();
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

    let updated = 0;
    let ignored = 0;
    const leadStatusUpdates: { leadId: string; status: LeadStatus }[] = [];

    for (const e of enrollments) {
      const before = e.state;

      switch (event) {
        case "sent": {
          const step = steps[e.currentStep];
          const sendable = step && step.type !== "wait" && (e.state === "queued" || e.state === "accepted");
          if (!sendable) {
            ignored++;
            continue;
          }
          if (step.type === "connect" && e.state === "queued") e.state = "invited";
          if (step.type === "message" && e.state === "queued") e.state = "accepted";
          e.history.push({ event: "step_sent", at: now, stepIndex: e.currentStep, note });
          const next = nextActionable(steps, e.currentStep + 1, now);
          e.currentStep = next.currentStep;
          e.nextActionAt = next.nextActionAt;
          break;
        }
        case "accepted":
        case "replied":
        case "meeting": {
          if (!canAdvance(e.state, event)) {
            ignored++;
            continue;
          }
          e.state = event;
          e.history.push({ event, at: now, note });
          if (event !== "accepted") e.nextActionAt = undefined; // a reply stops the automated sequence
          break;
        }
        case "failed":
        case "skipped": {
          e.state = event;
          e.nextActionAt = undefined;
          e.history.push({ event, at: now, note });
          break;
        }
        case "reset": {
          const first = nextActionable(steps, 0, now);
          e.state = "queued";
          e.currentStep = first.currentStep;
          e.nextActionAt = first.nextActionAt;
          e.history.push({ event: "reset", at: now, note });
          break;
        }
      }

      await e.save();
      updated++;
      const ls = LEAD_STATUS_FOR[e.state];
      if (ls && e.state !== before) leadStatusUpdates.push({ leadId: String(e.leadId), status: ls });
    }

    // Keep lead CRM status in sync — only ever move it forward
    for (const u of leadStatusUpdates) {
      const lower = LEAD_STATUS_RANK.slice(0, LEAD_STATUS_RANK.indexOf(u.status));
      await Lead.updateOne({ _id: u.leadId, userId: ctx.userId, status: { $in: lower } }, { $set: { status: u.status } });
    }

    return NextResponse.json({ success: true, updated, ignored, notFound: enrollmentIds.length - enrollments.length });
  } catch (error) {
    return apiError(error, "Failed to record campaign event");
  }
}
