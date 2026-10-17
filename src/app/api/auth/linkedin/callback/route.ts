import { NextResponse } from "next/server";
import { resolveAppOrigin } from "@/lib/oauth-origin";

/**
 * GET /api/auth/linkedin/callback
 *
 * Deprecated: The OAuth callback flow has been retired in favor of the direct
 * session extractor (Playwright background automation & manual li_at cookies).
 * Redirects directly back to the session extractor dashboard.
 */
export async function GET(req: Request) {
  const baseUrl = resolveAppOrigin(req);
  const response = NextResponse.redirect(`${baseUrl}/dashboard/accounts/direct-login`);
  response.cookies.set("li_oauth_state", "", { maxAge: 0, path: "/" });
  response.cookies.set("li_oauth_return_to", "", { maxAge: 0, path: "/" });
  return response;
}
