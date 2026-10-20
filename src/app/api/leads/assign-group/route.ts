import { NextResponse } from "next/server";
import Lead from "@/models/Lead";
import LeadGroup from "@/models/LeadGroup";
import { requireUser, apiError, isValidObjectId } from "@/lib/crm";
import { invalidateDbCache } from "@/lib/db-cache";

/**
 * POST /api/leads/assign-group
 * Assigns or unassigns selected leads to a named group.
 * Body: { leadIds: string[], group: string }
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const leadIds = Array.isArray(body.leadIds) ? body.leadIds.filter(isValidObjectId) : [];
    const groupName = String(body.group || "").trim();

    if (leadIds.length === 0) {
      return NextResponse.json({ success: false, error: "No valid lead IDs provided" }, { status: 400 });
    }

    // Update the leads
    const { modifiedCount } = await Lead.updateMany(
      { userId: ctx.userId, _id: { $in: leadIds } },
      { $set: { group: groupName } }
    );

    // If a group name is given, ensure the LeadGroup document exists
    if (groupName) {
      await LeadGroup.findOneAndUpdate(
        { userId: ctx.userId, name: groupName },
        { $setOnInsert: { description: "Created via lead assignment", color: "#16a34a" } },
        { upsert: true }
      );
    }

    invalidateDbCache(ctx.userId, ["leads", "overview"]);

    return NextResponse.json({
      success: true,
      message: groupName
        ? `Assigned ${modifiedCount} leads to group "${groupName}"`
        : `Removed ${modifiedCount} leads from group`,
      modifiedCount,
      group: groupName,
    });
  } catch (error) {
    return apiError(error, "Failed to assign group to leads");
  }
}
