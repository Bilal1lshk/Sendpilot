import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import { verifyConnection } from "@/lib/linkedin-connections";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    if (!(await consumeRateLimit(ctx.userId, "linkedin-verify", 8, 15 * 60 * 1000))) {
      return NextResponse.json({ success: false, error: "Too many verification attempts" }, { status: 429 });
    }

    const { id } = await params;
    const result = await verifyConnection(id, ctx.userId);
    if (!result) return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
    if (!result.verified) {
      return NextResponse.json(
        { success: false, verified: false, connection: result.connection, error: "LinkedIn authorization expired. Reconnect this account." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, verified: true, connection: result.connection });
  } catch (error) {
    return apiError(error, "Failed to verify LinkedIn connection");
  }
}