import { createHmac, randomInt } from "crypto";
import nodemailer from "nodemailer";
import VerificationToken, { VerificationPurpose } from "@/models/VerificationToken";

const DEFAULT_SMTP_USER = "contact@mbstack.net";

function getOtpSecret(): string {
  return (
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
  purpose: VerificationPurpose,
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

  return { code, expiresAt };
}

export async function verifyOtpCode(
  email: string,
  purpose: VerificationPurpose,
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
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
  return Boolean(pass && pass.trim() && !pass.includes("your_"));
}

export async function sendOtpEmail({
  to,
  code,
  purpose,
  userName,
}: {
  to: string;
  code: string;
  purpose: VerificationPurpose;
  userName?: string;
}): Promise<{ sent: boolean; deliveryMode: "smtp" | "preview"; previewCode?: string }> {
  const smtpUser = (process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD || "").trim();
  const smtpHost = (process.env.SMTP_HOST || "mail.mbstack.net").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : smtpPort === 465;
  const fromAddress = process.env.SMTP_FROM || `SendPilot Security <${smtpUser}>`;

  const isLogin = purpose === "login_otp";
  const subject = isLogin
    ? `${code} is your SendPilot sign-in verification code`
    : `${code} is your SendPilot password reset code`;

  const title = isLogin ? "Verify your sign-in" : "Reset your password";
  const description = isLogin
    ? "Use the 6-digit verification code below to complete signing in to your SendPilot workspace."
    : "Use the 6-digit verification code below to reset your SendPilot account password.";

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;color:#171717;">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:#171717;color:#ffffff;font-weight:700;font-size:14px;padding:6px 12px;border-radius:10px;">SendPilot</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#171717;">${title}</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#525252;">
        Hi ${userName || "there"},<br/>${description}
      </p>
      <div style="background:#f5f5f5;border:1px solid #e5e5e5;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px;">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:8px;color:#171717;">${code}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#737373;line-height:1.5;">
        This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #eaeaea;margin:20px 0;" />
      <p style="margin:0;font-size:11px;color:#a3a3a3;">
        Sent by SendPilot (${smtpUser})
      </p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    console.info(
      `[SendPilot OTP Preview — SMTP_PASS not set yet for ${smtpUser}] To: ${to} | Purpose: ${purpose} | OTP: ${code}`
    );
    return {
      sent: false,
      deliveryMode: "preview",
      previewCode: code,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: `${title}: Your SendPilot verification code is ${code}. It expires in 10 minutes.`,
      html,
    });

    return {
      sent: true,
      deliveryMode: "smtp",
    };
  } catch (err) {
    console.error(`Failed to send OTP email via ${smtpUser}:`, err);
    return {
      sent: false,
      deliveryMode: "preview",
      previewCode: code,
    };
  }
}
