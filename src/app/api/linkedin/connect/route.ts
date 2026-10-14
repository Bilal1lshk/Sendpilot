import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import { connectWithCredentials } from "@/lib/linkedin-connections";

/**
 * POST /api/linkedin/connect
 *
 * Manual code-submission path (used when the user pastes the auth code from
 * the redirect URL into the accounts page instead of being auto-redirected).
 *
 * Applies the same upsert-by-linkedinMemberId logic as the OAuth callback:
 *   - Known member → refresh tokens, return { success: true, alreadyConnected: true }.
 *   - New member   → insert a new account row, return { success: true, alreadyConnected: false }.
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json();
    if (!(await consumeRateLimit(ctx.userId, "linkedin-connect", 5, 15 * 60 * 1000))) {
      return NextResponse.json({ success: false, error: "Too many connection attempts" }, { status: 429 });
    }

    const { code } = body;

    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || process.env.LINKEDIN_DEV_REDIRECT_URI;

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.Linkedin_Client_Secret;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          error:
            "LinkedIn OAuth credentials (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI) must be configured in .env",
        },
        { status: 500 }
      );
    }

    // ── 1. Exchange code for tokens ───────────────────────────────
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code.trim(),
        redirect_uri: redirectUri.trim(),
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return NextResponse.json(
        {
          error:
            "Failed to exchange authorization code with LinkedIn",
        },
        { status: 400 }
      );
    }

    const expiresIn = Number(tokenData.expires_in);
    const result = await connectWithCredentials(ctx.userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    });
    if (!result?.verified) {
      return NextResponse.json(
        { success: false, error: "LinkedIn could not verify this account. Please authorize again." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyConnected: result.alreadyConnected || false,
      account: result.connection,
      confirmationRequired: true,
    });
  } catch (error: any) {
    return apiError(error, "Failed to connect LinkedIn account");
  }
}
