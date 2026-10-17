import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import { extractLinkedInSession } from "@/lib/linkedin-session-extractor";
import { createConnectionId } from "@/lib/linkedin-connections";
import { encryptConnectionSecrets } from "@/lib/connection-crypto";
import LinkedInConnection from "@/models/LinkedInConnection";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow sufficient time for browser navigation and 2FA

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, headless = false, saveAccount = false } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid LinkedIn email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide your LinkedIn password." },
        { status: 400 }
      );
    }

    // Rate limit session extractions to protect user account
    if (!(await consumeRateLimit(ctx.userId, "linkedin-extract-session", 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many extraction attempts. Please wait 15 minutes before retrying." },
        { status: 429 }
      );
    }

    // Execute Playwright Browser Automation
    const result = await extractLinkedInSession({
      email: email.trim(),
      password,
      headless: Boolean(headless),
      timeout: 90000
    });

    if (!result.success || !result.li_at) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to extract LinkedIn session."
        },
        { status: 400 }
      );
    }

    let connectionId: string | undefined;

    // Optionally save the account directly to the user's workspace
    if (saveAccount) {
      await connectDB();
      const memberName = [result.profile?.firstName, result.profile?.lastName].filter(Boolean).join(" ") || email;
      const connId = createConnectionId();

      await LinkedInConnection.create({
        id: connId,
        userId: ctx.userId,
        encryptedCredentials: encryptConnectionSecrets({
          accessToken: result.li_at,
          li_at: result.li_at,
          jsessionId: result.jsessionId,
          extractedEmail: email.trim(),
        }),
        status: "active",
        linkedinName: memberName,
        linkedinAvatar: "",
        confirmedAt: new Date(),
        lastVerifiedAt: new Date(),
      });

      connectionId = connId;
    }

    return NextResponse.json({
      success: true,
      li_at: result.li_at,
      jsessionId: result.jsessionId,
      profile: result.profile,
      saved: Boolean(saveAccount),
      connectionId
    });

  } catch (err: unknown) {
    return apiError(err, "extract-linkedin-session");
  }
}
