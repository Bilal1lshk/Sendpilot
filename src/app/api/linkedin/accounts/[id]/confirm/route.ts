import { NextResponse } from "next/server";
import LinkedInConnection from "@/models/LinkedInConnection";
import { requireUser } from "@/lib/crm";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";
import { disconnectOtherAccounts } from "@/lib/linkedin-connections";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const connection = await LinkedInConnection.findOneAndUpdate(
    { id, userId: ctx.userId, status: "active", lastVerifiedAt: { $ne: null } },
    { $set: { confirmedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!connection) {
    return NextResponse.json({ success: false, error: "Verified connection not found" }, { status: 404 });
  }

  await disconnectOtherAccounts(ctx.userId, id);

  return NextResponse.json({ success: true, connection: toSafeConnection(connection) });
}