import { NextResponse } from "next/server";
import LinkedInConnection from "@/models/LinkedInConnection";
import { requireUser, apiError } from "@/lib/crm";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";
import { stopConnectionJobs, disconnectConnection, connectAccount } from "@/lib/linkedin-connections";
import { invalidateDbCache } from "@/lib/db-cache";

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

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { id, action, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing connection ID" }, { status: 400 });
    }

    const targetAction =
      action ||
      (status === "active" || status === "Active" ? "connect" : "disconnect");

    if (targetAction === "disconnect") {
      const result = await disconnectConnection(id, ctx.userId);
      if (!result) {
        return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
      }

      invalidateDbCache(ctx.userId, ["accounts", "overview", "settings", "campaigns"]);
      const accounts = await LinkedInConnection.find({ userId: ctx.userId }).sort({ createdAt: -1 });
      return NextResponse.json(
        {
          success: true,
          account: result,
          accounts: accounts.map(toSafeConnection),
          message: "LinkedIn account disconnected successfully.",
        },
        NO_STORE
      );
    }

    if (targetAction === "connect") {
      const result = await connectAccount(id, ctx.userId);
      if (!result) {
        return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
      }

      if (!result.verified) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            requiresAuth: true,
            error: result.error || "LinkedIn authorization expired. Please reconnect.",
          },
          { status: 409, ...NO_STORE }
        );
      }

      invalidateDbCache(ctx.userId, ["accounts", "overview", "settings", "campaigns"]);
      const accounts = await LinkedInConnection.find({ userId: ctx.userId }).sort({ createdAt: -1 });
      return NextResponse.json(
        {
          success: true,
          verified: true,
          account: result.connection,
          accounts: accounts.map(toSafeConnection),
          message: "LinkedIn account connected successfully.",
        },
        NO_STORE
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Expected 'connect' or 'disconnect'." },
      { status: 400, ...NO_STORE }
    );
  } catch (error) {
    return apiError(error, "Failed to update LinkedIn account status");
  }
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
    invalidateDbCache(ctx.userId, ["accounts", "overview", "settings", "campaigns"]);
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
