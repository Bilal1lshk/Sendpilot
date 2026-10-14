import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { migrateLegacyLinkedInConnections } from "@/lib/linkedin-connections";
import { consumeRateLimit } from "@/lib/rate-limit";

/** GET /api/auth/linkedin/authorize
 *
 * Generates a CSRF-proof `state` value, stores it in an httpOnly cookie
 * (li_oauth_state, 10-minute TTL), then redirects the browser to LinkedIn's
 * OAuth 2.0 authorization screen.
 *
 * The redirect_uri is always the single registered callback:
 *   http://localhost:3000/api/auth/linkedin/callback
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jsonMode = searchParams.get("json") === "true";
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.redirect(new URL("/login", req.url));

    await connectDB();
    try {
      await migrateLegacyLinkedInConnections(userId);
    } catch (migErr) {
      console.warn("Legacy migration warning in authorize:", migErr);
    }
    if (!(await consumeRateLimit(userId, "linkedin-authorize", 5, 15 * 60 * 1000))) {
      return NextResponse.json({ success: false, error: "Too many connection attempts" }, { status: 429 });
    }

    const isManual = searchParams.get("mode") === "manual" || searchParams.get("dev") === "true";
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const redirectUri = isManual
      ? (process.env.LINKEDIN_DEV_REDIRECT_URI || "https://www.linkedin.com/developers/tools/oauth/redirect")
      : (process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/auth/linkedin/callback");
    const scope = "openid profile email";

    if (!clientId || !redirectUri) {
      console.error("❌ Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI in environment variables (.env)");
      return NextResponse.json(
        { error: "LinkedIn OAuth credentials are not properly configured in the server environment (.env)." },
        { status: 500 }
      );
    }

    // 16-byte hex state — cryptographically random, cannot be guessed
    const state = randomBytes(16).toString("hex");

    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization` +
      `?client_id=${encodeURIComponent(clientId.trim())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri.trim())}` +
      `&scope=${encodeURIComponent(scope.trim())}` +
      `&response_type=code` +
      `&state=${state}`;

    if (jsonMode) {
      return NextResponse.json({ success: true, url: authUrl, redirectUri: redirectUri.trim() });
    }

    // Set state in an httpOnly cookie so the callback can verify it
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("li_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error creating LinkedIn authorization URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn authorization" },
      { status: 500 }
    );
  }
}
