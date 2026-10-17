import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm";

/**
 * POST /api/linkedin/connect
 *
 * Deprecated: The LinkedIn OAuth code exchange flow has been replaced with the
 * direct Session Extractor (/api/linkedin/extract-session) supporting automated
 * Playwright background extraction and manual li_at cookie submission.
 */
export async function POST() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json(
    {
      success: false,
      error:
        "The legacy OAuth connection method has been removed. Please use the Session Extractor (/api/linkedin/extract-session) with automatic login or manual session cookies.",
      useEndpoint: "/api/linkedin/extract-session",
    },
    { status: 410 }
  );
}
