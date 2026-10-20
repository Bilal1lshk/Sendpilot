import { NextResponse } from "next/server";
import Workspace from "@/models/Workspace";
import Lead from "@/models/Lead";
import { requireUser, apiError } from "@/lib/crm";
import { invalidateDbCache } from "@/lib/db-cache";

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [userWorkspaces, totalLeads] = await Promise.all([
      Workspace.find({ userId: ctx.userId }).sort({ createdAt: 1 }).lean(),
      Lead.countDocuments({ userId: ctx.userId }),
    ]);

    const workspaces = userWorkspaces.map((w) => ({
      id: String(w._id),
      name: w.name || "My Workspace",
      plan: "Active Workspace",
      leads: `${Array.isArray(w.step3?.data?.leads) && w.step3.data.leads.length > 0 ? w.step3.data.leads.length : totalLeads} leads`,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    return apiError(error, "Failed to load workspaces");
  }
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const newWorkspace = await Workspace.create({
      userId: ctx.userId,
      name,
      step1: {
        status: "completed",
        data: {
          fullName: ctx.userName || "",
          companyName: name,
          timezone: "America/New_York (Eastern Time - US)",
          workingHours: "9:00 AM - 5:00 PM (Monday - Friday)",
        },
      },
    });

    invalidateDbCache(ctx.userId, ["settings", "overview"]);

    return NextResponse.json({
      success: true,
      workspace: {
        id: String(newWorkspace._id),
        name: newWorkspace.name,
        plan: "Active Workspace",
        leads: "0 leads",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to create workspace");
  }
}
