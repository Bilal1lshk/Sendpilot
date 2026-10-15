import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { disconnectConnection } from "@/lib/linkedin-connections";
import LinkedInConnection from "@/models/LinkedInConnection";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const result = await disconnectConnection(id, ctx.userId);
    if (!result) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404, ...NO_STORE });
    }

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
  } catch (error) {
    return apiError(error, "Failed to disconnect LinkedIn account");
  }
}
