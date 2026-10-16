import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { cookies } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { connectWithCredentials, migrateLegacyLinkedInConnections, disconnectOtherAccounts } from "@/lib/linkedin-connections";
import LinkedInConnection from "@/models/LinkedInConnection";
import {
  resolveAppOrigin,
  resolveLinkedInRedirectUri,
  getLinkedInRedirectUriCandidates,
} from "@/lib/oauth-origin";

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
  const baseUrl = resolveAppOrigin(req);

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
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      const hmacSecret =
        process.env.COOKIE_ENC_KEY ||
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "default_sendpilot_secret";
      const expectedSigB64 = createHmac("sha256", hmacSecret).update(payloadB64).digest("hex");
      const expectedSigRaw = createHmac("sha256", hmacSecret).update(payload).digest("hex");
      if (signature === expectedSigB64 || signature === expectedSigRaw) {
        const [uId, timestamp] = payload.split(":");
        if (uId && Number(timestamp) && Date.now() - Number(timestamp) < 30 * 60 * 1000) {
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
  if (!(await consumeRateLimit(userId, "linkedin-callback", 30, 15 * 60 * 1000))) {
    return returnError("Too many connection attempts. Please wait a few minutes.");
  }

  // ── 2. Exchange code for tokens ─────────────────────────────────
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.Linkedin_Client_Secret;
    const primaryRedirectUri = resolveLinkedInRedirectUri(req);
    const candidateUris = getLinkedInRedirectUriCandidates(primaryRedirectUri, baseUrl);

    if (!clientId || !clientSecret) {
      return returnError("LinkedIn credentials missing in server environment (.env)");
    }

    interface LinkedInTokenResponse {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    }

    let tokenResponse: Response | null = null;
    let tokenData: LinkedInTokenResponse | null = null;

    for (const uri of candidateUris) {
      try {
        const resp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: uri,
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
          }),
        });

        const data = (await resp.json().catch(() => ({}))) as LinkedInTokenResponse;
        tokenResponse = resp;
        tokenData = data;

        if (resp.ok && data.access_token) {
          break;
        }

        // If error is NOT a redirect uri mismatch, don't keep trying candidate URIs
        const errDesc = String(data.error_description || data.error || "").toLowerCase();
        if (!errDesc.includes("redirect_uri") && !errDesc.includes("redirect uri")) {
          break;
        }
      } catch {
        // try next candidate uri
      }
    }

    if (!tokenResponse?.ok || !tokenData?.access_token) {
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
    const hasBrowserSession = Boolean(session?.user?.id);
    const connectedName = (result.connection.linkedinName || "LinkedIn Profile").replace(/[<>"'&]/g, "");

    // Return HTML that notifies window.opener if in popup, redirects if logged in, or shows Incognito completion card
    const html = `<!DOCTYPE html>
<html>
<head><title>LinkedIn Connected</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#121415;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;max-width:420px;padding:24px;border:1px solid #262626;border-radius:16px;background:#17191a;">
    <div style="width:48px;height:48px;border-radius:12px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:24px;font-weight:bold;">✓</div>
    <h3 style="margin:0 0 8px;color:#10b981;">LinkedIn Connected!</h3>
    <p style="color:#d4d4d4;font-size:14px;margin:0 0 8px;"><strong>${connectedName}</strong> is now connected to your SendPilot workspace.</p>
    <p id="subtext" style="color:#a3a3a3;font-size:12px;margin:0;">${
      hasBrowserSession
        ? "Updating accounts dashboard..."
        : "You can now close this Incognito window and return to your main SendPilot tab."
    }</p>
  </div>
  <script>
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: "LINKEDIN_AUTH_SUCCESS", status: "${statusParam}", id: "${result.connection.id}" }, "*");
        setTimeout(function() { window.close(); }, 350);
      } else if (${hasBrowserSession ? "true" : "false"}) {
        window.location.href = "${redirectUrl}";
      }
    } catch(e) {
      if (${hasBrowserSession ? "true" : "false"}) {
        window.location.href = "${redirectUrl}";
      }
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
