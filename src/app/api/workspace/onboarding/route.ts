import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    await connectDB();

    let workspace = await Workspace.findOne({ userId });

    if (!workspace) {
      workspace = await Workspace.create({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
        step1: {
          status: "not_started",
          data: {
            fullName: session?.user?.name || "",
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

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    console.error("Error fetching workspace onboarding:", error);
    return NextResponse.json(
      { error: "Failed to load onboarding progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const body = await req.json();

    await connectDB();

    let workspace = await Workspace.findOne({ userId });

    if (!workspace) {
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

    // Update specific step if provided
    if (body.step1) {
      workspace.step1 = { ...workspace.step1, ...body.step1 };
    }
    if (body.step2) {
      workspace.step2 = { ...workspace.step2, ...body.step2 };
    }
    if (body.step3) {
      workspace.step3 = { ...workspace.step3, ...body.step3 };
    }
    if (body.step4) {
      workspace.step4 = { ...workspace.step4, ...body.step4 };
    }

    await workspace.save();

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    console.error("Error updating workspace onboarding:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding progress" },
      { status: 500 }
    );
  }
}
