import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { consumeRateLimit } from "@/lib/rate-limit";
import { issueOtpCode, sendOtpEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    await connectDB();

    if (!(await consumeRateLimit(email, "forgot-password-otp", 8, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many reset requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email address." },
        { status: 404 }
      );
    }

    const { code } = await issueOtpCode(email, "reset_password", 10);
    const mailResult = await sendOtpEmail({
      to: email,
      code,
      purpose: "reset_password",
      userName: user.name,
    });

    if (!mailResult.sent) {
      return NextResponse.json(
        {
          success: false,
          error: mailResult.error || "Failed to deliver reset code to your email address.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      senderEmail: process.env.SMTP_USER || "contact@mbstack.net",
      deliveryMode: "smtp",
    });
  } catch (error: any) {
    console.error("Forgot password OTP error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send password reset code." },
      { status: 500 }
    );
  }
}
