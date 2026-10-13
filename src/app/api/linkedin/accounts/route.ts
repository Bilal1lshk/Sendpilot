import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    console.log("\n➡️ [GET /api/linkedin/accounts] Request from User ID:", userId);

    await connectDB();

    const workspace = await Workspace.findOne({ userId });
    const rawAccounts = workspace?.step2?.data?.connectedAccounts || [];

    console.log(`📦 Loaded ${rawAccounts.length} accounts from DB for workspace:`, workspace?._id || "none");

    // Format accounts to ensure consistent structure for frontend
    const accounts = rawAccounts.map((acc: any) => ({
      id: acc.id || `acc_${Date.now()}`,
      name: acc.name || "LinkedIn User",
      headline: acc.headline || "LinkedIn Profile",
      type: acc.type || "Sales Navigator",
      photo: acc.photo || "",
      status: acc.status || "Active",
      connectedDate: acc.connectedDate || acc.connectedAt || "Recently",
      usedToday: acc.usedToday ?? 0,
      dailyCap: acc.dailyCap ?? 25,
      warmupStage: acc.warmupStage ?? 1,
    }));

    console.log("📤 Returning accounts to frontend:", accounts.map((a: any) => ({ id: a.id, name: a.name, status: a.status })));
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error("❌ Error fetching LinkedIn accounts:", error);
    return NextResponse.json(
      { error: "Failed to load LinkedIn accounts" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing account ID or status" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findOne({ userId });
    if (!workspace || !workspace.step2?.data?.connectedAccounts) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const accounts = workspace.step2.data.connectedAccounts.map((acc: any) => {
      if (acc.id === id) {
        return { ...acc, status };
      }
      return acc;
    });

    workspace.step2.data.connectedAccounts = accounts;
    workspace.markModified("step2.data.connectedAccounts");
    await workspace.save();

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error("Error updating LinkedIn account status:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing account ID" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findOne({ userId });
    if (!workspace || !workspace.step2?.data?.connectedAccounts) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const filteredAccounts = workspace.step2.data.connectedAccounts.filter(
      (acc: any) => acc.id !== id
    );

    workspace.step2.data.connectedAccounts = filteredAccounts;
    workspace.markModified("step2.data.connectedAccounts");
    await workspace.save();

    return NextResponse.json({ success: true, accounts: filteredAccounts });
  } catch (error: any) {
    console.error("Error removing LinkedIn account:", error);
    return NextResponse.json({ error: "Failed to remove account" }, { status: 500 });
  }
}
