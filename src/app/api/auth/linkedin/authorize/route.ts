import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jsonMode = searchParams.get("json") === "true";

    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.Linkedin_Client_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    const scope = process.env.LINKEDIN_SCOPE || "openid profile email w_member_social";

    if (!clientId || !redirectUri) {
      console.error(
        "❌ Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI in environment variables (.env)"
      );
      return NextResponse.json(
        {
          error:
            "LinkedIn OAuth credentials are not properly configured in the server environment (.env).",
        },
        { status: 500 }
      );
    }

    const state = Math.random().toString(36).substring(2, 15);

    // Standard OAuth 2.0 authorization URL - NEVER include client_secret in client-facing authorization URLs!
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${encodeURIComponent(
      clientId.trim()
    )}&redirect_uri=${encodeURIComponent(
      redirectUri.trim()
    )}&scope=${encodeURIComponent(
      scope.trim()
    )}&response_type=code&state=${state}`;

    if (jsonMode) {
      return NextResponse.json({
        success: true,
        url: authUrl,
      });
    }

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Error creating LinkedIn authorization URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn authorization" },
      { status: 500 }
    );
  }
}
