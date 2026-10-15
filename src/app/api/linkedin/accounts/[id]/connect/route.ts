import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { connectAccount } from "@/lib/linkedin-connections";
import LinkedInConnection from "@/models/LinkedInConnection";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const result = await connectAccount(id, ctx.userId);
    if (!result) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404, ...NO_STORE });
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
  } catch (error) {
    return apiError(error, "Failed to connect LinkedIn account");
  }
}
