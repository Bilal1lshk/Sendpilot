import { NextResponse } from "next/server";
import AutomationFlow from "@/models/AutomationFlow";
import { requireUser, apiError, isValidObjectId, sanitizeSteps } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid flow ID" }, { status: 400 });
  }

  try {
    const flow = await AutomationFlow.findOne({ _id: id, userId: ctx.userId }).lean();
    if (!flow) {
      return NextResponse.json({ success: false, error: "Automation flow not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      flow: {
        id: String(flow._id),
        name: flow.name,
        description: flow.description,
        steps: flow.steps,
        config: flow.config || {},
        isTemplate: flow.isTemplate,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch automation flow");
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid flow ID" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ success: false, error: "Flow name cannot be empty" }, { status: 400 });
      update.name = name;
    }

    if (body.description !== undefined) {
      update.description = String(body.description).trim();
    }

    if (body.steps !== undefined) {
      const steps = sanitizeSteps(body.steps);
      if (!steps || steps.length === 0) {
        return NextResponse.json({ success: false, error: "Invalid flow steps" }, { status: 400 });
      }
      update.steps = steps;
    }

    if (body.config !== undefined && typeof body.config === "object") {
      update.config = body.config;
    }

    const flow = await AutomationFlow.findOneAndUpdate(
      { _id: id, userId: ctx.userId },
      { $set: update },
      { new: true }
    ).lean();

    if (!flow) {
      return NextResponse.json({ success: false, error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      flow: {
        id: String(flow._id),
        name: flow.name,
        description: flow.description,
        steps: flow.steps,
        config: flow.config || {},
        updatedAt: flow.updatedAt,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to update automation flow");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid flow ID" }, { status: 400 });
  }

  try {
    const res = await AutomationFlow.deleteOne({ _id: id, userId: ctx.userId });
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Flow deleted successfully" });
  } catch (error) {
    return apiError(error, "Failed to delete automation flow");
  }
}
