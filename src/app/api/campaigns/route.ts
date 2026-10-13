import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    await connectDB();
    const workspace = await Workspace.findOne({ userId });

    const step4 = workspace?.step4?.data;
    const leads = workspace?.step3?.data?.leads || [];
    const accounts = workspace?.step2?.data?.connectedAccounts || [];

    const campaigns: any[] = [];

    // If a primary campaign is configured in workspace step4
    if (step4?.campaignName) {
      campaigns.push({
        id: "c_primary",
        name: step4.campaignName,
        status: step4.status === "active" ? "Active" : "Paused",
        sender: accounts[0]?.name || "Connected Sender",
        leadsCount: step4.targetLeadsCount || leads.length || 0,
        sentCount: step4.stats?.sent || 0,
        acceptRate:
          step4.stats?.sent && step4.stats.accepted !== undefined
            ? Math.round((step4.stats.accepted / step4.stats.sent) * 100)
            : 48,
        replyRate:
          step4.stats?.accepted && step4.stats.replied !== undefined
            ? Math.round((step4.stats.replied / step4.stats.accepted) * 100)
            : 34,
        variantA: 44,
        variantB: 52,
        messages: step4.messages || {
          connectionNote: "",
          followUp1: "",
          followUp2: "",
        },
      });
    }

    return NextResponse.json({
      success: true,
      campaigns,
      availableLeadsCount: leads.length,
      availableAccountsCount: accounts.length,
    });
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    const body = await req.json().catch(() => ({}));
    const {
      name = "Outreach Sequence #1",
      targetLeadsCount = 50,
      niche = "B2B SaaS",
      tone = "Professional & Direct",
      messages = {},
      dailyCap = 25,
      status = "Active",
    } = body;

    await connectDB();
    let workspace = await Workspace.findOne({ userId });

    if (!workspace) {
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

    if (!workspace.step4) {
      workspace.step4 = {
        status: "completed",
        data: {},
      };
    }

    workspace.step4.status = "completed";
    workspace.step4.data = {
      campaignName: name,
      targetLeadsCount: Number(targetLeadsCount) || 50,
      niche,
      tone,
      messages: {
        connectionNote: messages.connectionNote || "Hi {{firstName}}, would love to connect and share insights.",
        followUp1: messages.followUp1 || "Hey {{firstName}}, following up on my previous message.",
        followUp2: messages.followUp2 || "Just wanted to make sure this didn't get buried.",
      },
      humanApproved: true,
      dailyCap: Number(dailyCap) || 25,
      warmUpActive: true,
      status: status.toLowerCase(),
      stats: {
        sent: 0,
        accepted: 0,
        replied: 0,
        meetingsBooked: 0,
      },
    };

    workspace.markModified("step4.data");
    await workspace.save();

    return NextResponse.json({
      success: true,
      campaign: {
        id: "c_primary",
        name,
        status,
        leadsCount: Number(targetLeadsCount) || 50,
        sentCount: 0,
        acceptRate: 0,
        replyRate: 0,
      },
    });
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    const body = await req.json().catch(() => ({}));
    const { status } = body;

    await connectDB();
    const workspace = await Workspace.findOne({ userId });

    if (workspace && workspace.step4?.data) {
      workspace.step4.data.status = status?.toLowerCase() === "active" ? "active" : "paused";
      workspace.markModified("step4.data");
      await workspace.save();
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json(
      { error: "Failed to update campaign", message: error.message },
      { status: 500 }
    );
  }
}
