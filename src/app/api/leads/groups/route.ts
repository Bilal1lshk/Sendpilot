import { NextResponse } from "next/server";
import Lead from "@/models/Lead";
import LeadGroup from "@/models/LeadGroup";
import { requireUser, apiError } from "@/lib/crm";
import { invalidateDbCache } from "@/lib/db-cache";

/**
 * GET /api/leads/groups
 * Returns all lead groups for the user with dynamic real-time lead counts.
 */
export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [groups, leadGroupCounts] = await Promise.all([
      LeadGroup.find({ userId: ctx.userId }).sort({ createdAt: -1 }).lean(),
      Lead.aggregate([
        { $match: { userId: ctx.userId, group: { $nin: ["", null] } } },
        { $group: { _id: "$group", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const g of leadGroupCounts) {
      if (g._id) countMap.set(String(g._id).trim(), g.count);
    }

    // Include registered groups
    const registeredNames = new Set<string>();
    const items = groups.map((g) => {
      registeredNames.add(g.name.trim());
      return {
        id: String(g._id),
        name: g.name,
        description: g.description || "",
        color: g.color || "#16a34a",
        leadCount: countMap.get(g.name.trim()) || 0,
        createdAt: g.createdAt,
      };
    });

    // Also include any groups found on leads that don't have a LeadGroup document yet
    for (const [groupName, count] of countMap.entries()) {
      if (!registeredNames.has(groupName)) {
        // Auto-create doc in background
        LeadGroup.create({
          userId: ctx.userId,
          name: groupName,
          description: "Auto-created from leads",
        }).catch(() => {});

        items.push({
          id: `virtual_${groupName}`,
          name: groupName,
          description: "",
          color: "#16a34a",
          leadCount: count,
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, groups: items });
  } catch (error) {
    return apiError(error, "Failed to fetch lead groups");
  }
}

/**
 * POST /api/leads/groups
 * Creates or updates a named lead group.
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 });
    }

    const description = String(body.description || "").trim();
    const color = String(body.color || "#16a34a").trim();

    const group = await LeadGroup.findOneAndUpdate(
      { userId: ctx.userId, name },
      { $set: { description, color } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    invalidateDbCache(ctx.userId, ["leads", "overview"]);

    return NextResponse.json({
      success: true,
      group: {
        id: String(group._id),
        name: group.name,
        description: group.description,
        color: group.color,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to create lead group");
  }
}

/**
 * PATCH /api/leads/groups
 * Renames a group and cascades the rename to all associated leads.
 */
export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const oldName = String(body.oldName || "").trim();
    const newName = String(body.newName || body.name || "").trim();

    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, error: "Both old and new group names are required" },
        { status: 400 }
      );
    }

    // Update the group record
    await LeadGroup.findOneAndUpdate(
      { userId: ctx.userId, name: oldName },
      { $set: { name: newName, description: body.description } }
    );

    // Cascade update to all leads
    const { modifiedCount } = await Lead.updateMany(
      { userId: ctx.userId, group: oldName },
      { $set: { group: newName } }
    );

    invalidateDbCache(ctx.userId, ["leads", "overview"]);

    return NextResponse.json({
      success: true,
      message: `Renamed group to "${newName}" across ${modifiedCount} leads`,
      modifiedCount,
    });
  } catch (error) {
    return apiError(error, "Failed to rename lead group");
  }
}

/**
 * DELETE /api/leads/groups
 * Deletes a lead group, optionally deleting or unassigning its leads.
 */
export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const name = String(searchParams.get("name") || body.name || "").trim();
    const deleteLeads = searchParams.get("deleteLeads") === "true" || body.deleteLeads === true;

    if (!name) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 });
    }

    await LeadGroup.deleteOne({ userId: ctx.userId, name });

    let leadsAffected = 0;
    if (deleteLeads) {
      const res = await Lead.deleteMany({ userId: ctx.userId, group: name });
      leadsAffected = res.deletedCount;
    } else {
      const res = await Lead.updateMany({ userId: ctx.userId, group: name }, { $set: { group: "" } });
      leadsAffected = res.modifiedCount;
    }

    invalidateDbCache(ctx.userId, ["leads", "overview"]);

    return NextResponse.json({
      success: true,
      message: deleteLeads
        ? `Deleted group and ${leadsAffected} leads`
        : `Deleted group and unassigned ${leadsAffected} leads`,
    });
  } catch (error) {
    return apiError(error, "Failed to delete lead group");
  }
}
