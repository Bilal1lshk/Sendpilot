import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { cookies } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { connectWithCredentials, migrateLegacyLinkedInConnections } from "@/lib/linkedin-connections";

/**
 * GET /api/auth/linkedin/callback
 *
 * LinkedIn OAuth 2.0 callback.  Flow:
 *   1. Validate CSRF state (li_oauth_state cookie ↔ `state` query param).
 *   2. Exchange authorization code for tokens.
 *   3. Fetch userinfo → extract `sub` as the stable LinkedIn member id.
 *   4. Upsert by (userId, linkedinMemberId):
 *        - New member  → insert a new account row.
 *        - Known member → update tokens only; redirect with ?status=already_connected.
 *        - sub unknown  → always insert (cannot deduplicate without it).
 *   5. Redirect back to the accounts page with an appropriate status param.
 *
 * Redirect URI (fixed, registered in LinkedIn Developer Portal):
 *   http://localhost:3000/api/auth/linkedin/callback
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  console.log("\n=======================================================");
  console.log("➡️ [GET /api/auth/linkedin/callback] Incoming Request");

  // ── 0. Handle OAuth errors from LinkedIn ────────────────────────
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent("LinkedIn authorization was not completed")}`
    );
  }

  if (!code) {
    console.error("❌ Missing authorization code in callback URL");
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=Missing+authorization+code`
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/login?error=SignInRequired`);
  }

  await connectDB();
  await migrateLegacyLinkedInConnections(userId);
  if (!(await consumeRateLimit(userId, "linkedin-callback", 5, 15 * 60 * 1000))) {
    return NextResponse.redirect(`${baseUrl}/dashboard/accounts?error=TooManyAttempts`);
  }

  // ── 1. Validate CSRF state ──────────────────────────────────────
  const cookieStore = await cookies();
  const storedState = cookieStore.get("li_oauth_state")?.value;

  // Build a redirect that also clears the cookie
  const clearStateCookie = (destination: string) => {
    const response = NextResponse.redirect(destination);
    response.cookies.set("li_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  };

  if (!storedState || storedState !== stateParam) {
    console.error("❌ OAuth state mismatch — possible CSRF attempt", {
      stored: storedState ? "present" : "missing",
      received: stateParam ? "present" : "missing",
    });
    return clearStateCookie(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
        "Authorization request expired or was tampered with. Please try connecting again."
      )}`
    );
  }

  // ── 2. Exchange code for tokens ─────────────────────────────────
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.Linkedin_Client_Secret;
    const configuredRedirectUri =
      process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return clearStateCookie(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
          "LinkedIn credentials missing in server environment (.env)"
        )}`
      );
    }

    console.log("📡 Exchanging authorization code for access token…");
    console.log("Redirect URI:", configuredRedirectUri);

    let tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: configuredRedirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    let tokenData = await tokenResponse.json();

    // Fallback: retry with dev redirect URI if configured and first attempt failed
    const devRedirectUri = process.env.LINKEDIN_DEV_REDIRECT_URI;
    if (!tokenResponse.ok && tokenData.error_description?.includes("redirect uri") && devRedirectUri) {
      console.log("🔄 Retrying token exchange with LINKEDIN_DEV_REDIRECT_URI…");
      tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: devRedirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      tokenData = await tokenResponse.json();
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return clearStateCookie(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
          "Failed to authorize LinkedIn connection"
        )}`
      );
    }

    const expiresIn = Number(tokenData.expires_in);
    const result = await connectWithCredentials(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    });
    if (!result?.verified) {
      return clearStateCookie(`${baseUrl}/dashboard/accounts?status=verification_failed`);
    }

    return clearStateCookie(
      `${baseUrl}/dashboard/accounts?status=connected&id=${encodeURIComponent(result.connection.id)}`
    );
  } catch (error: any) {
    console.error("LinkedIn OAuth callback failed");
    const baseUrl2 = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl2}/dashboard/accounts?error=${encodeURIComponent(
        "Internal server error during LinkedIn connection"
      )}`
    );
  }
}
