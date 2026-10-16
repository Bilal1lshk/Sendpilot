import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyOtpCode } from "@/lib/mailer";
import type { VerificationPurpose } from "@/models/VerificationToken";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const purpose: VerificationPurpose = body.purpose || "login_otp";
    const consume = body.consume !== false;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    await connectDB();

    const verification = await verifyOtpCode(email, purpose, code, consume);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: "Verification code verified successfully.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
