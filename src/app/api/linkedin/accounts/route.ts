import { NextResponse } from "next/server";
import LinkedInConnection from "@/models/LinkedInConnection";
import { requireUser, apiError } from "@/lib/crm";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";
import { stopConnectionJobs } from "@/lib/linkedin-connections";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const connections = await LinkedInConnection.find({ userId: ctx.userId }).sort({ createdAt: -1 });
    return NextResponse.json(
      { success: true, accounts: connections.map(toSafeConnection) },
      NO_STORE
    );
  } catch (error) {
    return apiError(error, "Failed to load LinkedIn accounts");
  }
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: "Connection status is managed through verify and disconnect" },
    { status: 405, ...NO_STORE }
  );
}

export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const id = new URL(req.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing connection ID" }, { status: 400 });
    }

    const exists = await LinkedInConnection.exists({ id, userId: ctx.userId });
    if (!exists) return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
    await stopConnectionJobs(id, ctx.userId);
    await LinkedInConnection.deleteOne({ id, userId: ctx.userId });
    const accounts = await LinkedInConnection.find({ userId: ctx.userId }).sort({ createdAt: -1 });
    return NextResponse.json(
      {
        success: true,
        accounts: accounts.map(toSafeConnection),
        message: "LinkedIn account disconnected successfully.",
      },
      NO_STORE
    );
  } catch (error) {
    return apiError(error, "Failed to disconnect LinkedIn account");
  }
}
