import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  extractLinkedInSession,
  verifyLinkedInSession,
  type TwoFactorMethod,
  type ExtractedSessionResult,
} from "@/lib/linkedin-session-extractor";
import { createConnectionId, disconnectOtherAccounts } from "@/lib/linkedin-connections";
import { encryptConnectionSecrets, decryptConnectionSecrets } from "@/lib/connection-crypto";
import LinkedInConnection from "@/models/LinkedInConnection";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      email,
      password,
      li_at,
      jsessionId,
      method = "playwright",
      twoFactorMethod = "otp",
      verificationCode,
      pendingChallengeToken,
    } = body;

    // ── Method 1: Manual Cookie Submission ──────────────────────────────────
    if (method === "manual" || (li_at && !password)) {
      if (!li_at || typeof li_at !== "string" || !li_at.trim()) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid li_at cookie value." },
          { status: 400 }
        );
      }

      const cleanLiAt = li_at.trim();
      const cleanCsrf =
        jsessionId && typeof jsessionId === "string" && jsessionId.trim()
          ? jsessionId.trim()
          : `ajax:${Date.now()}`;

      // Verify the provided cookies against LinkedIn Voyager API
      const verification = await verifyLinkedInSession(cleanLiAt, cleanCsrf);
      if (!verification.active) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The provided li_at cookie is invalid or expired. Please copy a fresh cookie from your active browser session.",
          },
          { status: 400 }
        );
      }

      await connectDB();
      const memberName =
        [verification.profile?.firstName, verification.profile?.lastName]
          .filter(Boolean)
          .join(" ") || "LinkedIn Member";
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

    // ── Method 2: Automatic Playwright Browser Extraction (+ 2FA Support) ───
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid LinkedIn email address or phone number." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter your LinkedIn password." },
        { status: 400 }
      );
    }

    // Rate limit attempts to protect user account (allow more steps for 2FA verification)
    if (!(await consumeRateLimit(ctx.userId, "linkedin-extract-session", 20, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please wait 15 minutes before retrying." },
        { status: 429 }
      );
    }

    // Connect to DB and check for an existing persisted hardware fingerprint for this account
    await connectDB();
    let existingFingerprint: import("@/lib/browser-launcher").AccountFingerprint | undefined;
    try {
      const existingConn = await LinkedInConnection.findOne({
        userId: ctx.userId,
      }).lean();
      if (existingConn?.encryptedCredentials) {
        const decrypted = decryptConnectionSecrets<{
          fingerprint?: import("@/lib/browser-launcher").AccountFingerprint;
          extractedEmail?: string;
        }>(existingConn.encryptedCredentials);
        if (
          decrypted?.fingerprint &&
          (!decrypted.extractedEmail ||
            decrypted.extractedEmail.toLowerCase() === email.trim().toLowerCase())
        ) {
          existingFingerprint = decrypted.fingerprint;
        }
      }
    } catch {
      // Ignore fingerprint retrieval error
    }

    const normalized2FA: TwoFactorMethod = twoFactorMethod === "app" ? "app" : "otp";

    let result: ExtractedSessionResult;
    const clientWorkerUrl =
      typeof body.workerUrl === "string" && body.workerUrl.trim().startsWith("http")
        ? body.workerUrl.trim()
        : undefined;
    const workerUrl = (clientWorkerUrl || process.env.LINKEDIN_WORKER_URL?.trim())?.replace(/\/+$/, "");

    if (workerUrl) {
      // Offload Playwright browser extraction to dedicated local runner / Cloudflare tunnel
      const workerSecret = process.env.LINKEDIN_WORKER_SECRET?.trim();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "SendPilot-Worker-Client/1.0",
      };
      if (workerSecret) {
        headers["x-worker-secret"] = workerSecret;
      }

      try {
        const workerRes = await fetch(`${workerUrl.replace(/\/+$/, "")}/api/extract-session`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: email.trim(),
            password,
            twoFactorMethod: normalized2FA,
            verificationCode:
              typeof verificationCode === "string" && verificationCode.trim()
                ? verificationCode.trim()
                : undefined,
            pendingChallengeToken:
              typeof pendingChallengeToken === "string" && pendingChallengeToken.trim()
                ? pendingChallengeToken.trim()
                : undefined,
            existingFingerprint,
          }),
          signal: AbortSignal.timeout(50000),
        });

        const rawText = await workerRes.text().catch(() => "");
        let workerData: ExtractedSessionResult | null = null;
        try {
          workerData = JSON.parse(rawText);
        } catch {
          workerData = null;
        }

        if (!workerData) {
          const detail = rawText ? ` (${rawText.slice(0, 120).trim()})` : "";
          return NextResponse.json(
            {
              success: false,
              error: `LinkedIn worker at ${workerUrl} returned HTTP ${workerRes.status}${detail}.`,
            },
            { status: workerRes.status || 502 }
          );
        }

        result = workerData;
      } catch (workerErr: unknown) {
        const errMessage = workerErr instanceof Error ? workerErr.message : String(workerErr);
        return NextResponse.json(
          {
            success: false,
            error: `Unable to connect to LinkedIn runner (${workerUrl}): ${errMessage}. Ensure your local runner or VPS is active and the Cloudflare Tunnel is running.`,
          },
          { status: 504 }
        );
      }
    } else {
      result = await extractLinkedInSession({
        email: email.trim(),
        password,
        twoFactorMethod: normalized2FA,
        verificationCode:
          typeof verificationCode === "string" && verificationCode.trim()
            ? verificationCode.trim()
            : undefined,
        pendingChallengeToken:
          typeof pendingChallengeToken === "string" && pendingChallengeToken.trim()
            ? pendingChallengeToken.trim()
            : undefined,
        headless: true,
        timeout: 24000,
        existingFingerprint,
      });
    }

    if (result.proxyError) {
      return NextResponse.json(
        {
          success: false,
          error: `${result.proxyError.message} ${result.proxyError.hint}`,
          proxyError: result.proxyError,
          code: result.proxyError.code,
          stage: result.proxyError.stage,
          hint: result.proxyError.hint,
        },
        { status: 502 }
      );
    }

    if (result.requiresTwoFactor) {
      return NextResponse.json(
        {
          success: false,
          requiresTwoFactor: true,
          twoFactorMethod: result.twoFactorMethod || normalized2FA,
          challengeMessage:
            result.challengeMessage ||
            (normalized2FA === "app"
              ? "Approve the sign-in in the LinkedIn mobile app."
              : "LinkedIn sent a one-time code by SMS or email."),
          pendingChallengeToken: result.pendingChallengeToken,
          proxySessionId: result.proxySessionId,
          error: result.error,
        },
        { status: 202 }
      );
    }

    if (!result.success || !result.li_at) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Authentication failed. Please verify your email and password.",
        },
        { status: 400 }
      );
    }

    // Protectedly store encrypted credentials & deterministic hardware fingerprint in MongoDB (AES-256-GCM)
    const memberName =
      [result.profile?.firstName, result.profile?.lastName].filter(Boolean).join(" ") ||
      email.trim();
    const connId = createConnectionId();

    await LinkedInConnection.create({
      id: connId,
      userId: ctx.userId,
      encryptedCredentials: encryptConnectionSecrets({
        accessToken: result.li_at,
        li_at: result.li_at,
        jsessionId: result.jsessionId,
        extractedEmail: email.trim(),
        fingerprint: result.fingerprint,
        proxySessionId: result.proxySessionId,
      }),
      status: "active",
      linkedinName: memberName,
      linkedinAvatar: "",
      confirmedAt: new Date(),
      lastVerifiedAt: new Date(),
    });

    await disconnectOtherAccounts(ctx.userId, connId);

    // Security: Do NOT expose raw li_at, jsessionId, or proxy credentials in the client response
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
