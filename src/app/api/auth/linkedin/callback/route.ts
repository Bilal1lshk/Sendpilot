import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const responseType = url.searchParams.get("response_type");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  console.log("\n=======================================================");
  console.log("➡️ [GET /api/auth/linkedin/callback] Incoming Request");
  console.log("URL:", req.url);

  // If this endpoint is invoked with OAuth initiation parameters (response_type=code)
  if (responseType === "code") {
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || process.env.LINKEDIN_DEV_REDIRECT_URI;
    const scope = process.env.LINKEDIN_SCOPE || "openid profile email w_member_social";

    if (!clientId || !redirectUri) {
      console.error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI in environment variables (.env)");
      return NextResponse.redirect(`${baseUrl}/dashboard/accounts?error=LinkedIn configuration missing in .env`);
    }

    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${encodeURIComponent(
      clientId.trim()
    )}&redirect_uri=${encodeURIComponent(
      redirectUri.trim()
    )}&scope=${encodeURIComponent(
      scope.trim()
    )}&response_type=code`;

    console.log("↪️ Redirecting to LinkedIn OAuth authorization screen:", linkedInAuthUrl);
    return NextResponse.redirect(linkedInAuthUrl);
  }

  console.log("Code received:", code ? `${code.substring(0, 20)}...` : "None");
  console.log("Error:", error || "None");
  console.log("Error Description:", errorDescription || "None");

  if (error) {
    console.error("❌ LinkedIn OAuth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
        errorDescription || error
      )}`
    );
  }

  if (!code) {
    console.error("❌ Missing authorization code in callback URL");
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=Missing authorization code`
    );
  }

  try {
    const clientId =
      process.env.LINKEDIN_CLIENT_ID ||
      process.env.Linkedin_Client_ID;
    const clientSecret =
      process.env.LINKEDIN_CLIENT_SECRET ||
      process.env.Linkedin_Client_Secret;
    const configuredRedirectUri =
      process.env.LINKEDIN_REDIRECT_URI ||
      `${baseUrl}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      console.error("❌ Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in .env");
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=LinkedIn credentials missing in server environment (.env)`
      );
    }

    console.log("📡 Exchanging authorization code for access token with LinkedIn...");
    console.log("Target:", "https://www.linkedin.com/oauth/v2/accessToken");
    console.log("Redirect URI:", configuredRedirectUri);

    // 1. Exchange authorization code for access token
    let tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: configuredRedirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    let tokenData = await tokenResponse.json();

    // If exchange fails due to redirect_uri mismatch, fallback to dev redirect URI if defined in .env
    const devRedirectUri = process.env.LINKEDIN_DEV_REDIRECT_URI;
    if (!tokenResponse.ok && tokenData.error_description?.includes("redirect uri") && devRedirectUri) {
      console.log("🔄 Retrying token exchange with LinkedIn developer redirect URI from .env...");
      tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: devRedirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );
      tokenData = await tokenResponse.json();
    }
    console.log("📥 LinkedIn Token API Response Status:", tokenResponse.status);
    console.log("📥 LinkedIn Token API Data:", {
      has_access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      error: tokenData.error,
      error_description: tokenData.error_description,
    });

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("❌ LinkedIn token exchange error:", tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=${encodeURIComponent(
          tokenData.error_description || "Failed to exchange LinkedIn token"
        )}`
      );
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // 2. Fetch LinkedIn Profile
    let profileName = "LinkedIn User";
    let profileHeadline = "Connected LinkedIn Account";
    let profilePhoto = "";
    let linkedinSub = "";

    try {
      console.log("📡 Calling LinkedIn /v2/userinfo...");
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("📥 Userinfo Status:", userinfoRes.status);

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        console.log("📥 Userinfo Data:", userInfo);
        profileName = userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() || profileName;
        profilePhoto = userInfo.picture || "";
        linkedinSub = userInfo.sub || "";
        if (userInfo.email) {
          profileHeadline = `Verified Member (${userInfo.email})`;
        }
      } else {
        console.log("📡 Userinfo not permitted, trying /v2/me...");
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log("📥 /v2/me Status:", meRes.status);
        if (meRes.ok) {
          const meData = await meRes.json();
          console.log("📥 /v2/me Data:", meData);
          profileName = `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() || profileName;
          linkedinSub = meData.id || "";
        }
      }
    } catch (profileErr) {
      console.warn("⚠️ Could not retrieve profile info directly, using defaults:", profileErr);
    }

    // 3. Save Connected Account to Workspace in Database
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    console.log("👤 Current User / Session ID:", userId);

    await connectDB();

    let workspace = await Workspace.findOne({ userId });
    if (!workspace) {
      console.log("Creating new workspace document for user:", userId);
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

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
    // If linkedinSub is known, replace only that specific profile; otherwise append as a new account
    const filtered = linkedinSub
      ? existing.filter((acc: any) => acc.linkedinId !== linkedinSub)
      : existing;
    workspace.step2.data.connectedAccounts = [newAccount, ...filtered];
    workspace.step2.status = "completed";
    workspace.markModified("step2.data.connectedAccounts");

    await workspace.save();
    console.log("✅ Successfully saved LinkedIn account to MongoDB for workspace:", workspace._id);
    console.log("=======================================================\n");

    return NextResponse.redirect(`${baseUrl}/dashboard/accounts?connected=true`);
  } catch (error: any) {
    console.error("❌ Error processing LinkedIn callback:", error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=Internal server error during LinkedIn connection`
    );
  }
}
