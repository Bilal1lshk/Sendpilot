import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  extractLinkedInSession,
  verifyLinkedInSession,
} from "@/lib/linkedin-session-extractor";
import { createConnectionId, disconnectOtherAccounts } from "@/lib/linkedin-connections";
import { encryptConnectionSecrets } from "@/lib/connection-crypto";
import LinkedInConnection from "@/models/LinkedInConnection";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, li_at, jsessionId, method = "playwright" } = body;

    // ── Method 1: Manual Cookie Submission ──────────────────────────────────
    if (method === "manual" || (li_at && !password)) {
      if (!li_at || typeof li_at !== "string" || !li_at.trim()) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid li_at cookie value." },
          { status: 400 }
        );
      }

      const cleanLiAt = li_at.trim();
      const cleanCsrf = jsessionId && typeof jsessionId === "string" && jsessionId.trim()
        ? jsessionId.trim()
        : `ajax:${Date.now()}`;

      // Verify the provided cookies against LinkedIn Voyager API
      const verification = await verifyLinkedInSession(cleanLiAt, cleanCsrf);
      if (!verification.active) {
        return NextResponse.json(
          {
            success: false,
            error: "The provided li_at cookie is invalid or expired. Please copy a fresh cookie from your active browser session.",
          },
          { status: 400 }
        );
      }

      await connectDB();
      const memberName =
        [verification.profile?.firstName, verification.profile?.lastName].filter(Boolean).join(" ") ||
        "LinkedIn Member";
      const connId = createConnectionId();

      await LinkedInConnection.create({
        id: connId,
        userId: ctx.userId,
        encryptedCredentials: encryptConnectionSecrets({
          accessToken: cleanLiAt,
          li_at: cleanLiAt,
          jsessionId: cleanCsrf,
        }),
        status: "active",
        linkedinName: memberName,
        linkedinAvatar: "",
        confirmedAt: new Date(),
        lastVerifiedAt: new Date(),
      });

      await disconnectOtherAccounts(ctx.userId, connId);

      return NextResponse.json({
        success: true,
        saved: true,
        connectionId: connId,
        profile: {
          name: memberName,
          firstName: verification.profile?.firstName,
          lastName: verification.profile?.lastName,
          headline: verification.profile?.headline || "LinkedIn Profile",
        },
      });
    }

    // ── Method 2: Automatic Playwright Browser Extraction ───────────────────
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid LinkedIn email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter your LinkedIn password." },
        { status: 400 }
      );
    }

    // Rate limit attempts to protect user account
    if (!(await consumeRateLimit(ctx.userId, "linkedin-extract-session", 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please wait 15 minutes before retrying." },
        { status: 429 }
      );
    }

    // Execute completely in headless (silent background) mode
    const result = await extractLinkedInSession({
      email: email.trim(),
      password,
      headless: true,
      timeout: 50000,
    });

    if (!result.success || !result.li_at) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Authentication failed. Please verify your email and password.",
        },
        { status: 400 }
      );
    }

    // Protectedly store encrypted credentials in backend (AES-256-GCM)
    await connectDB();
    const memberName =
      [result.profile?.firstName, result.profile?.lastName].filter(Boolean).join(" ") || email.trim();
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

    await disconnectOtherAccounts(ctx.userId, connId);

    // Security: Do NOT expose raw li_at or jsessionId in the client response
    return NextResponse.json({
      success: true,
      saved: true,
      connectionId: connId,
      profile: {
        name: memberName,
        firstName: result.profile?.firstName,
        lastName: result.profile?.lastName,
        headline: result.profile?.headline || "LinkedIn Profile",
      },
    });
  } catch (err: unknown) {
    return apiError(err, "extract-linkedin-session");
  }
}
