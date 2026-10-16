import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { consumeRateLimit } from "@/lib/rate-limit";
import { connectWithCredentials, disconnectOtherAccounts } from "@/lib/linkedin-connections";
import LinkedInConnection from "@/models/LinkedInConnection";
import Workspace from "@/models/Workspace";

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

    const { code, redirectUri: customRedirectUri } = body;

    if (!code) {
      return NextResponse.json({ error: "Authorization code or redirect URL is required" }, { status: 400 });
    }

    // Extract code and auto-detect redirect URI if a full URL was pasted
    let cleanCode = String(code).trim();
    let detectedRedirectUri: string | null = null;

    if (cleanCode.includes("http://") || cleanCode.includes("https://")) {
      try {
        const parsed = new URL(cleanCode);
        const codeParam = parsed.searchParams.get("code");
        if (codeParam) {
          cleanCode = codeParam;
          detectedRedirectUri = `${parsed.origin}${parsed.pathname}`;
        }
      } catch {
        const match = cleanCode.match(/[?&]code=([^&#]+)/);
        if (match) cleanCode = decodeURIComponent(match[1]);
      }
    } else if (cleanCode.includes("code=")) {
      const match = cleanCode.match(/(?:^|[?&])code=([^&#]+)/);
      if (match) cleanCode = decodeURIComponent(match[1]);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.Linkedin_Client_Secret;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "LinkedIn OAuth credentials (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET) must be configured in .env",
        },
        { status: 500 }
      );
    }

    // ── 1. Exchange code for tokens across candidate redirect URIs ──────────
    const candidateUris = [
      detectedRedirectUri,
      customRedirectUri,
      process.env.LINKEDIN_REDIRECT_URI,
      process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/linkedin/callback` : null,
      "https://sendpilot-gamma.vercel.app/api/auth/linkedin/callback",
      process.env.LINKEDIN_DEV_REDIRECT_URI,
      "https://www.linkedin.com/developers/tools/oauth/redirect",
      "http://localhost:3000/api/auth/linkedin/callback",
    ].filter(Boolean) as string[];

    const uniqueUris = Array.from(new Set(candidateUris.map((u) => u.trim())));

    interface LinkedInTokenResponse {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    }

    let tokenData: LinkedInTokenResponse | null = null;
    let tokenOk = false;

    for (const uri of uniqueUris) {
      try {
        const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: cleanCode,
            redirect_uri: uri,
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
          }),
        });

        const data = (await tokenResponse.json().catch(() => ({}))) as LinkedInTokenResponse;
        if (tokenResponse.ok && data.access_token) {
          tokenData = data;
          tokenOk = true;
          break;
        }
        tokenData = data;
      } catch (fetchErr) {
        console.warn(`Token exchange attempt failed for redirect URI ${uri}:`, fetchErr);
      }
    }

    if (!tokenOk || !tokenData?.access_token) {
      // Check if /api/auth/linkedin/callback already verified and connected this account moments ago
      const recentConn = await LinkedInConnection.findOne({
        userId: ctx.userId,
        status: "active",
        lastVerifiedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).sort({ lastVerifiedAt: -1 });

      if (recentConn) {
        const { toSafeConnection } = await import("@/lib/linkedin-connection-dto");
        return NextResponse.json({
          success: true,
          alreadyConnected: false,
          account: toSafeConnection(recentConn),
        });
      }

      console.error("LinkedIn token exchange failure:", tokenData);
      return NextResponse.json(
        {
          error:
            tokenData?.error_description ||
            "Failed to exchange authorization code with LinkedIn. The code may be invalid or expired.",
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

    // In the manual code paste path, the user explicitly chose and authorized this profile
    await LinkedInConnection.updateOne(
      { id: result.connection.id, userId: ctx.userId },
      { $set: { confirmedAt: new Date(), status: "active" } }
    );
    await disconnectOtherAccounts(ctx.userId, result.connection.id);

    // Automatically mark onboarding Step 2 as completed
    await Workspace.updateOne(
      { userId: ctx.userId },
      { $set: { "step2.status": "completed" } }
    );

    return NextResponse.json({
      success: true,
      alreadyConnected: result.alreadyConnected || false,
      account: result.connection,
    });
  } catch (error) {
    return apiError(error, "Failed to connect LinkedIn account");
  }
}
