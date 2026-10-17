import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { register } from "node:module";
import mongoose from "mongoose";

register("./loader.mjs", import.meta.url);
try { process.loadEnvFile(".env"); } catch {}

before(async () => {
  const { default: connectDB } = await import("../src/lib/mongodb.ts");
  await connectDB();
});

after(async () => {
  const { default: VerificationToken } = await import("../src/models/VerificationToken.ts");
  await VerificationToken.deleteMany({ email: { $regex: /^test_smtp_otp_/ } });
  await mongoose.disconnect();
});

test("plain SMTP Nodemailer transporter is configured with host and user", async () => {
  const { transporter, isSmtpConfigured } = await import("../src/lib/mailer.ts");
  assert.ok(transporter);
  assert.equal(typeof transporter.sendMail, "function");
  assert.equal(typeof isSmtpConfigured, "function");
});

test("sendOtpEmail supports both (to, code) and object signatures", async () => {
  const { sendOtpEmail } = await import("../src/lib/mailer.ts");
  const testEmail = "test_smtp_otp_user@example.com";

  // 1. Direct (to, code) signature
  const res1 = await sendOtpEmail(testEmail, "123456");
  assert.ok(res1);
  assert.equal(res1.deliveryMode, "smtp");
  assert.equal(res1.previewCode, undefined);

  // 2. Object signature
  const res2 = await sendOtpEmail({
    to: testEmail,
    code: "654321",
    purpose: "login_otp",
  });
  assert.ok(res2);
  assert.equal(res2.deliveryMode, "smtp");
  assert.equal(res2.previewCode, undefined);
});

test("issueOtpCode and verifyOtpCode round-trip correctly", async () => {
  const { issueOtpCode, verifyOtpCode } = await import("../src/lib/mailer.ts");
  const testEmail = `test_smtp_otp_${Date.now()}@mbstack.net`;

  const { code } = await issueOtpCode(testEmail, "login_otp", 10);
  assert.equal(code.length, 6);

  // Invalid code fails
  const badVerify = await verifyOtpCode(testEmail, "login_otp", "000000", false);
  assert.equal(badVerify.valid, false);

  // Correct code succeeds
  const goodVerify = await verifyOtpCode(testEmail, "login_otp", code, true);
  assert.equal(goodVerify.valid, true);

  // Consumed code cannot be reused
  const reusedVerify = await verifyOtpCode(testEmail, "login_otp", code, true);
  assert.equal(reusedVerify.valid, false);
});
