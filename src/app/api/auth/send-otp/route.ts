import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { consumeRateLimit } from "@/lib/rate-limit";
import { issueOtpCode, sendOtpEmail } from "@/lib/mailer";
import type { VerificationPurpose } from "@/models/VerificationToken";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const purpose: VerificationPurpose = body.purpose || "login_otp";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    await connectDB();

    if (!(await consumeRateLimit(email, "send-otp-request", 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many OTP requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const { code } = await issueOtpCode(email, purpose, 10);
    const mailResult = await sendOtpEmail(email, code);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}.`,
      deliveryMode: mailResult.deliveryMode,
      previewCode: mailResult.previewCode,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
