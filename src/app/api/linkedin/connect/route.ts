import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
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
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const body = await req.json();

    console.log("\n=======================================================");
    console.log("➡️ [POST /api/linkedin/connect] Incoming Request");
    console.log("User ID:", userId);
    console.log("Body:", { ...body, code: body.code ? `${body.code.substring(0, 20)}…` : "None" });

    const {
      code,
      accountType = "Sales Navigator",
      dailyCap = 25,
      profileName: customName,
      profileHeadline: customHeadline,
    } = body;

    const redirectUri =
      body.redirectUri ||
      process.env.LINKEDIN_REDIRECT_URI ||
      process.env.LINKEDIN_DEV_REDIRECT_URI;

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
    console.log("📡 Exchanging code with LinkedIn…");
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
      console.error("❌ LinkedIn token error:", tokenData);
      return NextResponse.json(
        {
          error:
            tokenData.error_description ||
            tokenData.error ||
            "Failed to exchange authorization code with LinkedIn",
        },
        { status: 400 }
      );
    }

    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number | undefined = tokenData.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // ── 2. Fetch profile / userinfo ───────────────────────────────
    let name = customName?.trim() || session?.user?.name || "LinkedIn User";
    let headline = customHeadline?.trim() || "Connected via LinkedIn OAuth";
    let photo = "";
    let linkedinMemberId = "";

    try {
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        name = userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() || name;
        photo = userInfo.picture || "";
        linkedinMemberId = userInfo.sub || "";
        if (userInfo.email) headline = `Verified (${userInfo.email})`;
      } else {
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          name = `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() || name;
          linkedinMemberId = meData.id || "";
        }
      }
    } catch (profileErr) {
      console.warn("Could not retrieve profile directly:", profileErr);
    }

    // ── 3. Upsert by (userId, linkedinMemberId) ───────────────────
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

    const existingIdx = linkedinMemberId
      ? existing.findIndex(
          (a: any) =>
            (a.linkedinMemberId && a.linkedinMemberId === linkedinMemberId) ||
            (a.linkedinId && a.linkedinId === linkedinMemberId)
        )
      : -1;

    let alreadyConnected = false;
    let savedAccount: any;

    if (existingIdx !== -1) {
      // Known member — refresh tokens only
      existing[existingIdx] = {
        ...existing[existingIdx],
        accessToken,
        refreshToken: refreshToken ?? existing[existingIdx].refreshToken,
        tokenExpiresAt,
        linkedinMemberId,
        name,
        headline,
        photo: photo || existing[existingIdx].photo,
        status: "Active",
      };
      workspace.step2.data.connectedAccounts = existing;
      savedAccount = existing[existingIdx];
      alreadyConnected = true;
    } else {
      // New member — insert
      savedAccount = {
        id: `acc_${Date.now()}`,
        name,
        headline,
        type: accountType,
        photo,
        status: "Active",
        connectedDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        usedToday: 0,
        dailyCap: Number(dailyCap) || 25,
        warmupStage: 1,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        linkedinMemberId,
        linkedinId: linkedinMemberId,
      };
      workspace.step2.data.connectedAccounts = [savedAccount, ...existing];
    }

    workspace.step2.status = "completed";
    workspace.markModified("step2.data.connectedAccounts");
    await workspace.save();

    // Strip server-only fields before returning to client
    const { accessToken: _at, refreshToken: _rt, ...publicAccount } = savedAccount;

    return NextResponse.json({
      success: true,
      alreadyConnected,
      account: publicAccount,
    });
  } catch (error: any) {
    console.error("Error in /api/linkedin/connect:", error);
    return NextResponse.json({ error: "Failed to connect LinkedIn account" }, { status: 500 });
  }
}
