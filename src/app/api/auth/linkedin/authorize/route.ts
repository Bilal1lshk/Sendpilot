import { NextResponse } from "next/server";
import { resolveAppOrigin } from "@/lib/oauth-origin";

/**
 * GET /api/auth/linkedin/authorize
 *
 * Deprecated: The LinkedIn OAuth redirect flow has been replaced with the
 * direct Session Extractor (Playwright background automation and manual li_at cookies).
 * Any requests to this route are redirected to the session extractor page.
 */
export async function GET(req: Request) {
  const origin = resolveAppOrigin(req);
  const { searchParams } = new URL(req.url);
  const jsonMode = searchParams.get("json") === "true";
  const returnTo = searchParams.get("returnTo") || "/dashboard/accounts/direct-login";
  const targetPath = returnTo.startsWith("/") ? returnTo : "/dashboard/accounts/direct-login";
  const targetUrl = `${origin}${targetPath}`;

  if (jsonMode) {
    return NextResponse.json({
      success: true,
      url: targetUrl,
      redirectUri: targetUrl,
      method: "session-extractor",
    });
  }

  return NextResponse.redirect(targetUrl);
}
