import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { consumeRateLimit } from "@/lib/rate-limit";
import { issueOtpCode, sendOtpEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    await connectDB();

    if (!(await consumeRateLimit(email, "login-otp-request", 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, error: "Too many OTP requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const { code } = await issueOtpCode(email, "login_otp", 10);
    const mailResult = await sendOtpEmail({
      to: email,
      code,
      purpose: "login_otp",
      userName: user.name,
    });

    if (!mailResult.sent) {
      return NextResponse.json(
        {
          success: false,
          error: mailResult.error || "Failed to deliver verification email. Please check your email or SMTP configuration.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      otpRequired: true,
      senderEmail: process.env.SMTP_USER || "contact@mbstack.net",
      deliveryMode: "smtp",
    });
  } catch (error: any) {
    console.error("Login OTP error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
