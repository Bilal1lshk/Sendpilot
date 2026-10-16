import { NextResponse } from "next/server";
import Workspace, { IWorkspace } from "@/models/Workspace";
import LinkedInConnection from "@/models/LinkedInConnection";
import { requireUser, apiError } from "@/lib/crm";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";

async function safeWorkspaceResponse(workspace: IWorkspace, userId: string) {
  const connections = await LinkedInConnection.find({ userId }).sort({ createdAt: -1 });
  const hasActiveConnection = connections.some((c) => c.status === "active");
  const value = workspace.toObject();
  return {
    id: String(workspace._id),
    name: value.name,
    onboardingCompleted: Boolean(value.onboardingCompleted),
    step1: value.step1,
    step2: {
      status: hasActiveConnection ? "completed" : value.step2?.status || "not_started",
      data: {
        connectedAccounts: connections.map(toSafeConnection),
        invitedTeammates: value.step2?.data?.invitedTeammates || [],
      },
    },
    step3: value.step3,
    step4: value.step4,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    let workspace = await Workspace.findOne({ userId: ctx.userId });

    if (!workspace) {
      workspace = await Workspace.create({
        userId: ctx.userId,
        name: ctx.userName ? `${ctx.userName}'s Workspace` : "My Workspace",
        step1: {
          status: "not_started",
          data: {
            fullName: ctx.userName || "",
            jobTitle: "",
            companyName: "",
            companyWebsite: "",
            offer: "",
            timezone: "America/New_York",
            workingHours: "9:00 AM - 5:00 PM",
          },
        },
      });
    }

    return NextResponse.json({ success: true, workspace: await safeWorkspaceResponse(workspace, ctx.userId) });
  } catch (error) {
    return apiError(error, "Failed to load onboarding progress");
  }
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json();
    let workspace = await Workspace.findOne({ userId: ctx.userId });

    if (!workspace) {
      workspace = new Workspace({
        userId: ctx.userId,
        name: ctx.userName ? `${ctx.userName}'s Workspace` : "My Workspace",
      });
    }

    // Update specific step if provided
    if (body.step1) {
      workspace.step1 = { ...workspace.step1, ...body.step1 };
    }
    if (body.step2) {
      const step2 = { ...body.step2, data: { ...body.step2.data } };
      delete step2.data.connectedAccounts;
      workspace.step2 = {
        ...workspace.step2,
        ...step2,
        data: {
          ...workspace.step2.data,
          ...step2.data,
          connectedAccounts: [],
        },
      };
    }
    if (body.step3) {
      workspace.step3 = { ...workspace.step3, ...body.step3 };
    }
    if (body.step4) {
      workspace.step4 = { ...workspace.step4, ...body.step4 };
    }
    if (typeof body.name === "string" && body.name.trim()) {
      workspace.name = body.name.trim();
    }
    if (body.onboardingCompleted !== undefined) {
      workspace.onboardingCompleted = Boolean(body.onboardingCompleted);
    }

    await workspace.save();

    return NextResponse.json({ success: true, workspace: await safeWorkspaceResponse(workspace, ctx.userId) });
  } catch (error) {
    return apiError(error, "Failed to update onboarding progress");
  }
}
