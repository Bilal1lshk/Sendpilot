import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const { issueOtpCode, sendOtpEmail } = await import("@/lib/mailer");
    const { code } = await issueOtpCode(newUser.email, "login_otp", 10);
    const mailResult = await sendOtpEmail({
      to: newUser.email,
      code,
      purpose: "login_otp",
      userName: newUser.name,
    });

    if (!mailResult.sent) {
      await User.deleteOne({ _id: newUser._id });
      return NextResponse.json(
        {
          error: mailResult.error || "Failed to send verification email. Please check your email address or SMTP configuration.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        message: "User registered successfully. Please verify the OTP sent to your email.",
        otpRequired: true,
        senderEmail: process.env.SMTP_USER || "contact@mbstack.net",
        deliveryMode: "smtp",
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
