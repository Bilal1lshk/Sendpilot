import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import { classifyLinkedInReply } from "@/lib/ai-reply-classifier";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { messageText, leadName, companyName, previousOutreachSnippet, calendarLink } = body;

    if (!messageText || typeof messageText !== "string" || !messageText.trim()) {
      return NextResponse.json(
        { success: false, error: "Prospect message text is required." },
        { status: 400 }
      );
    }

    const result = await classifyLinkedInReply({
      messageText: messageText.trim(),
      leadName: typeof leadName === "string" ? leadName.trim() : undefined,
      companyName: typeof companyName === "string" ? companyName.trim() : undefined,
      previousOutreachSnippet:
        typeof previousOutreachSnippet === "string"
          ? previousOutreachSnippet.trim()
          : undefined,
      calendarLink: typeof calendarLink === "string" ? calendarLink.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    return apiError(err, "ai-classify-reply");
  }
}
