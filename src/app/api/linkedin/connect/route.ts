import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const body = await req.json();

    console.log("\n=======================================================");
    console.log("➡️ [POST /api/linkedin/connect] Incoming Request");
    console.log("User ID:", userId);
    console.log("Body:", { ...body, code: body.code ? `${body.code.substring(0, 20)}...` : "None" });

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
      console.error("❌ Authorization code missing");
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    const clientId =
      process.env.LINKEDIN_CLIENT_ID ||
      process.env.Linkedin_Client_ID;
    const clientSecret =
      process.env.LINKEDIN_CLIENT_SECRET ||
      process.env.Linkedin_Client_Secret;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("❌ Missing LinkedIn OAuth credentials in .env");
      return NextResponse.json(
        {
          error:
            "LinkedIn OAuth credentials (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI) must be configured in .env",
        },
        { status: 500 }
      );
    }

    console.log("📡 Direct Connect: Exchanging code with LinkedIn...");
    console.log("Redirect URI:", redirectUri);

    // 1. Exchange code for access token with LinkedIn
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code.trim(),
          redirect_uri: redirectUri.trim(),
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("📥 LinkedIn Token API Status:", tokenResponse.status);
    console.log("📥 LinkedIn Token API Response:", {
      has_access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      error: tokenData.error,
      error_description: tokenData.error_description,
    });

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("❌ LinkedIn direct connect token error:", tokenData);
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

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // 2. Fetch LinkedIn Profile
    let name = customName?.trim() || session?.user?.name || "LinkedIn User";
    let headline = customHeadline?.trim() || "Connected via LinkedIn OAuth";
    let photo = "";
    let linkedinSub = "";

    try {
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        name = userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() || name;
        photo = userInfo.picture || "";
        linkedinSub = userInfo.sub || "";
        if (userInfo.email) {
          headline = `Verified (${userInfo.email})`;
        }
      } else {
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          name = `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() || name;
          linkedinSub = meData.id || "";
        }
      }
    } catch (profileErr) {
      console.warn("Could not retrieve profile directly:", profileErr);
    }

    // 3. Save Connected Account in Database
    await connectDB();

    let workspace = await Workspace.findOne({ userId });
    if (!workspace) {
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

    const newAccount = {
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
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      linkedinId: linkedinSub,
    };

    if (!workspace.step2) {
      workspace.step2 = { status: "completed", data: { connectedAccounts: [], invitedTeammates: [] } };
    }
    if (!workspace.step2.data) {
      workspace.step2.data = { connectedAccounts: [], invitedTeammates: [] };
    }

    const existing = workspace.step2.data.connectedAccounts || [];
    const filtered = existing.filter((acc: any) => acc.linkedinId !== linkedinSub || !linkedinSub);
    workspace.step2.data.connectedAccounts = [newAccount, ...filtered];
    workspace.step2.status = "completed";
    workspace.markModified("step2.data.connectedAccounts");

    await workspace.save();

    return NextResponse.json({
      success: true,
      account: newAccount,
    });
  } catch (error: any) {
    console.error("Error in /api/linkedin/connect:", error);
    return NextResponse.json(
      { error: "Failed to connect LinkedIn account" },
      { status: 500 }
    );
  }
}
