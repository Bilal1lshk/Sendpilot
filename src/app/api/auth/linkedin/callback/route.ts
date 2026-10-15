import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { cookies } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { connectWithCredentials, migrateLegacyLinkedInConnections, disconnectOtherAccounts } from "@/lib/linkedin-connections";
import LinkedInConnection from "@/models/LinkedInConnection";

/**
 * GET /api/auth/linkedin/callback
 *
 * LinkedIn OAuth 2.0 callback.
 * Supports both full-page redirect flow and popup auto-closing with postMessage.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const reqOrigin = req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : new URL(req.url).origin;
  const baseUrl = process.env.NEXTAUTH_URL || reqOrigin || "http://localhost:3000";

  console.log("\n=======================================================");
  console.log("➡️ [GET /api/auth/linkedin/callback] Incoming Request");

  const returnError = (errorMessage: string) => {
    const errorUrl = `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(errorMessage)}`;
    const html = `<!DOCTYPE html>
<html>
<head><title>LinkedIn Connection Error</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#121415;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <h3 style="color:#ef4444;margin-bottom:8px;">Connection Failed</h3>
    <p style="color:#a3a3a3;font-size:14px;">${errorMessage}</p>
  </div>
  <script>
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: "LINKEDIN_AUTH_ERROR", error: "${errorMessage}" }, "*");
        setTimeout(function() { window.close(); }, 1500);
      } else {
        window.location.href = "${errorUrl}";
      }
    } catch(e) {
      window.location.href = "${errorUrl}";
    }
  </script>
</body>
</html>`;
    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    response.cookies.set("li_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  };

  // ── 0. Handle OAuth errors from LinkedIn ────────────────────────
  if (error) {
    return returnError("LinkedIn authorization was not completed");
  }

  if (!code) {
    console.error("❌ Missing authorization code in callback URL");
    return returnError("Missing authorization code");
  }

  // ── 1. Validate CSRF state & user identification ─────────────────
  const cookieStore = await cookies();
  const storedState = cookieStore.get("li_oauth_state")?.value;

  let stateValid = Boolean(storedState && storedState === stateParam);
  let hmacUserId: string | null = null;

  if (stateParam && stateParam.includes(".")) {
    try {
      const [payloadB64, signature] = stateParam.split(".");
      const hmacSecret = process.env.COOKIE_ENC_KEY || process.env.AUTH_SECRET || "default_sendpilot_secret";
      const expectedSig = createHmac("sha256", hmacSecret).update(payloadB64).digest("hex");
      if (signature === expectedSig) {
        const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
        const [uId, timestamp] = payload.split(":");
        if (Date.now() - Number(timestamp) < 15 * 60 * 1000) {
          stateValid = true;
          hmacUserId = uId;
        }
      }
    } catch (sigErr) {
      console.warn("HMAC state verification failed:", sigErr);
    }
  }

  if (!stateValid) {
    console.error("❌ OAuth state mismatch — possible CSRF attempt", {
      stored: storedState ? "present" : "missing",
      received: stateParam ? "present" : "missing",
    });
    return returnError("Authorization request expired or was tampered with. Please try connecting again.");
  }

  const session = await auth();
  const userId = session?.user?.id || hmacUserId;
  if (!userId) {
    return returnError("Sign in required to link LinkedIn account");
  }

  await connectDB();
  try {
    await migrateLegacyLinkedInConnections(userId);
  } catch (migErr) {
    console.warn("Legacy migration warning in callback:", migErr);
  }
  if (!(await consumeRateLimit(userId, "linkedin-callback", 5, 15 * 60 * 1000))) {
    return returnError("Too many connection attempts. Please wait a few minutes.");
  }

  // ── 2. Exchange code for tokens ─────────────────────────────────
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.Linkedin_Client_Secret;
    const configuredRedirectUri =
      process.env.LINKEDIN_REDIRECT_URI || `${baseUrl}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return returnError("LinkedIn credentials missing in server environment (.env)");
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
      return returnError("Failed to authorize LinkedIn connection. Code may have expired.");
    }

    const expiresIn = Number(tokenData.expires_in);
    const result = await connectWithCredentials(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    });
    if (!result?.verified) {
      return returnError("LinkedIn could not verify this profile. Please try again.");
    }

    // Auto-confirm the connection and disconnect all other accounts
    await LinkedInConnection.updateOne(
      { id: result.connection.id, userId },
      { $set: { confirmedAt: new Date(), status: "active" } }
    );
    await disconnectOtherAccounts(userId, result.connection.id);

    const statusParam = result.alreadyConnected ? "already_connected" : "connected";
    const redirectUrl = `${baseUrl}/dashboard/accounts?status=${statusParam}&id=${encodeURIComponent(result.connection.id)}`;

    // Return HTML that notifies window.opener if in popup, or redirects full page
    const html = `<!DOCTYPE html>
<html>
<head><title>LinkedIn Connected</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#121415;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <h3 style="margin-bottom:8px;">LinkedIn Connected!</h3>
    <p style="color:#a3a3a3;font-size:14px;">Updating accounts dashboard...</p>
  </div>
  <script>
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: "LINKEDIN_AUTH_SUCCESS", status: "${statusParam}", id: "${result.connection.id}" }, "*");
        setTimeout(function() { window.close(); }, 350);
      } else {
        window.location.href = "${redirectUrl}";
      }
    } catch(e) {
      window.location.href = "${redirectUrl}";
    }
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    response.cookies.set("li_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("LinkedIn OAuth callback exception:", err);
    return returnError("Internal error during LinkedIn connection");
  }
}
