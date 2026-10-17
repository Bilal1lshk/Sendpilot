import { createHmac, randomInt } from "crypto";
import nodemailer from "nodemailer";
import VerificationToken, { type VerificationPurpose } from "@/models/VerificationToken";

const DEFAULT_SMTP_HOST = "mail.mbstack.net";
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_USER = "contact@mbstack.net";

export function getTransporter() {
  const host = (process.env.SMTP_HOST || DEFAULT_SMTP_HOST).trim();
  const port = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);
  const secure =
    process.env.SMTP_SECURE === "true"
      ? true
      : process.env.SMTP_SECURE === "false"
      ? false
      : port === 465;
  const user = (process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD || "").trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      // Allows connection to self-signed or cPanel/Exim server certificates
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === "true",
    },
  });
}

export const transporter = getTransporter();

function getOtpSecret(): string {
  return (
    process.env.OTP_SECRET ||
    process.env.COOKIE_ENC_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "sendpilot_otp_secret"
  );
}

export function hashOtpCode(email: string, purpose: VerificationPurpose, code: string): string {
  return createHmac("sha256", getOtpSecret())
    .update(`${email.trim().toLowerCase()}:${purpose}:${code.trim()}`)
    .digest("hex");
}

export function generateSixDigitOtp(): string {
  return String(randomInt(100000, 1000000));
}

export async function issueOtpCode(
  email: string,
  purpose: VerificationPurpose = "login_otp",
  ttlMinutes = 10
): Promise<{ code: string; expiresAt: Date }> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateSixDigitOtp();
  const codeHash = hashOtpCode(normalizedEmail, purpose, code);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await VerificationToken.deleteMany({ email: normalizedEmail, purpose });
  await VerificationToken.create({
    email: normalizedEmail,
    purpose,
    codeHash,
    attempts: 0,
    expiresAt,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] 🔑 Code for ${normalizedEmail} (${purpose}): ${code}`);
  }

  return { code, expiresAt };
}

export async function verifyOtpCode(
  email: string,
  purpose: VerificationPurpose = "login_otp",
  code: string,
  consume = true
): Promise<{ valid: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, error: "Please enter a valid 6-digit verification code." };
  }

  const record = await VerificationToken.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!record) {
    return {
      valid: false,
      error: "Verification code not found or expired. Please request a new code.",
    };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await VerificationToken.deleteOne({ _id: record._id });
    return {
      valid: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (record.attempts >= 5) {
    await VerificationToken.deleteOne({ _id: record._id });
    return {
      valid: false,
      error: "Too many invalid attempts. Please request a new verification code.",
    };
  }

  const expectedHash = hashOtpCode(normalizedEmail, purpose, cleanCode);
  if (record.codeHash !== expectedHash) {
    record.attempts += 1;
    await record.save();
    return {
      valid: false,
      error: "Invalid verification code. Please check the 6-digit code and try again.",
    };
  }

  if (consume) {
    await VerificationToken.deleteOne({ _id: record._id });
  }

  return { valid: true };
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
  const user = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
  return Boolean(host && user && pass && pass.trim() && !pass.includes("your-"));
}

export type SendOtpOptions = {
  to: string;
  code: string;
  purpose?: VerificationPurpose;
  userName?: string;
};

export type SendOtpResult = {
  sent: boolean;
  deliveryMode: "smtp";
  error?: string;
  messageId?: string;
};

export async function sendOtpEmail(
  toOrOptions: string | SendOtpOptions,
  maybeCode?: string
): Promise<SendOtpResult> {
  let to: string;
  let code: string;
  let userName: string | undefined;

  if (typeof toOrOptions === "string") {
    to = toOrOptions.trim().toLowerCase();
    code = (maybeCode || "").trim();
  } else {
    to = toOrOptions.to.trim().toLowerCase();
    code = toOrOptions.code.trim();
    userName = toOrOptions.userName;
  }

  const smtpUser = (process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  const fromAddress = process.env.SMTP_FROM || `"MB Stack" <${smtpUser}>`;

  if (!isSmtpConfigured()) {
    return {
      sent: false,
      deliveryMode: "smtp",
      error: "SMTP server is not configured. Please configure SMTP credentials in .env.",
    };
  }

  const subject = `Your verification code: ${code}`;
  const text = `Your verification code is ${code}. It expires in 10 minutes. If you didn't request it, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;color:#171717;">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:#171717;color:#ffffff;font-weight:700;font-size:14px;padding:6px 12px;border-radius:10px;">SendPilot</span>
      </div>
      <p style="margin:0 0 8px;font-size:15px;color:#171717;">Hi ${userName || "there"},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#525252;line-height:1.5;">Your verification code is:</p>
      <div style="background:#f5f5f5;border:1px solid #e5e5e5;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px;">
        <h2 style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#171717;">${code}</h2>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#525252;line-height:1.5;">
        It expires in 10 minutes. If you didn't request it, ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #eaeaea;margin:20px 0;" />
      <p style="margin:0;font-size:11px;color:#a3a3a3;">
        Sent via ${smtpUser}
      </p>
    </div>
  `;

  try {
    const activeTransporter = getTransporter();
    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    return {
      sent: true,
      deliveryMode: "smtp",
      messageId: info.messageId,
    };
  } catch (error: any) {
    const errorMsg = error?.message || "Failed to deliver email via SMTP";
    return {
      sent: false,
      deliveryMode: "smtp",
      error: errorMsg,
    };
  }
}
