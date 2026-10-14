import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { cookies } from "next/headers";

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
  console.log("URL:", req.url);

  // ── 0. Handle OAuth errors from LinkedIn ────────────────────────
  if (error) {
    console.error("❌ LinkedIn OAuth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    console.error("❌ Missing authorization code in callback URL");
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=Missing+authorization+code`
    );
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
      console.error("❌ Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in .env");
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

    console.log("📥 LinkedIn Token API Status:", tokenResponse.status, {
      has_access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      error: tokenData.error,
    });

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("❌ LinkedIn token exchange error:", tokenData);
      return clearStateCookie(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
          tokenData.error_description || "Failed to exchange LinkedIn token"
        )}`
      );
    }

    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number | undefined = tokenData.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // ── 3. Fetch LinkedIn profile (userinfo) ──────────────────────
    let profileName = "LinkedIn User";
    let profileHeadline = "Connected LinkedIn Account";
    let profilePhoto = "";
    let linkedinMemberId = ""; // OIDC sub — our dedup key

    try {
      console.log("📡 Calling LinkedIn /v2/userinfo…");
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        console.log("📥 Userinfo sub:", userInfo.sub);
        profileName =
          userInfo.name ||
          `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() ||
          profileName;
        profilePhoto = userInfo.picture || "";
        linkedinMemberId = userInfo.sub || "";
        if (userInfo.email) {
          profileHeadline = `Verified Member (${userInfo.email})`;
        }
      } else {
        // Fallback: /v2/me (legacy)
        console.log("📡 Userinfo not permitted, trying /v2/me…");
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          profileName =
            `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() ||
            profileName;
          linkedinMemberId = meData.id || "";
        }
      }
    } catch (profileErr) {
      console.warn("⚠️ Could not retrieve profile info, using defaults:", profileErr);
    }

    // ── 4. Upsert by (userId, linkedinMemberId) ───────────────────
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    console.log("👤 Current User ID:", userId);

    await connectDB();

    let workspace = await Workspace.findOne({ userId });
    if (!workspace) {
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

    if (!workspace.step2) {
      workspace.step2 = { status: "completed", data: { connectedAccounts: [], invitedTeammates: [] } };
    }
    if (!workspace.step2.data) {
      workspace.step2.data = { connectedAccounts: [], invitedTeammates: [] };
    }

    const existing: any[] = workspace.step2.data.connectedAccounts || [];

    // Find an account that already represents this LinkedIn member
    const existingIdx = linkedinMemberId
      ? existing.findIndex(
          (a: any) =>
            (a.linkedinMemberId && a.linkedinMemberId === linkedinMemberId) ||
            // backwards-compat: old field name
            (a.linkedinId && a.linkedinId === linkedinMemberId)
        )
      : -1;

    let redirectStatus: "connected" | "already_connected" = "connected";

    if (existingIdx !== -1) {
      // ── Known member: update tokens only, do NOT create a duplicate ──
      console.log("🔄 Existing LinkedIn member found — refreshing tokens only.");
      existing[existingIdx] = {
        ...existing[existingIdx],
        accessToken,
        refreshToken: refreshToken ?? existing[existingIdx].refreshToken,
        tokenExpiresAt,
        linkedinMemberId,
        // Refresh visible profile fields in case they changed
        name: profileName,
        headline: profileHeadline,
        photo: profilePhoto || existing[existingIdx].photo,
        status: "Active",
      };
      workspace.step2.data.connectedAccounts = existing;
      redirectStatus = "already_connected";
    } else {
      // ── New member: prepend a fresh account row ───────────────────
      console.log("✅ New LinkedIn member — inserting account row.");
      const newAccount = {
        id: `acc_${Date.now()}`,
        name: profileName,
        headline: profileHeadline,
        type: "LinkedIn Social",
        photo: profilePhoto,
        status: "Active",
        connectedDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        usedToday: 0,
        dailyCap: 25,
        warmupStage: 1,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        linkedinMemberId,
        linkedinId: linkedinMemberId, // keep legacy field in sync
      };
      workspace.step2.data.connectedAccounts = [newAccount, ...existing];
    }

    workspace.step2.status = "completed";
    workspace.markModified("step2.data.connectedAccounts");
    await workspace.save();

    console.log(`✅ Saved. Status: ${redirectStatus}`);
    console.log("=======================================================\n");

    // Clear the state cookie and redirect
    return clearStateCookie(
      `${baseUrl}/dashboard/accounts?status=${redirectStatus}`
    );
  } catch (error: any) {
    console.error("❌ Error processing LinkedIn callback:", error);
    const baseUrl2 = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl2}/dashboard/accounts?error=${encodeURIComponent(
        "Internal server error during LinkedIn connection"
      )}`
    );
  }
}
