import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { register } from "node:module";
import mongoose from "mongoose";

register("./loader.mjs", import.meta.url);
try { process.loadEnvFile(".env"); } catch {}

let connectDB;
let User;
let issueOtpCode;
let verifyOtpCode;
let bcrypt;

const TEST_EMAIL = `test_otp_roundtrip_${Date.now()}@example.com`;
const TEST_PASSWORD = "ValidPassword123!";

before(async () => {
  ({ default: connectDB } = await import("../src/lib/mongodb.ts"));
  ({ default: User } = await import("../src/models/User.ts"));
  ({ issueOtpCode, verifyOtpCode } = await import("../src/lib/mailer.ts"));
  bcrypt = (await import("bcryptjs")).default;

  await connectDB();
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  await User.create({
    name: "OTP Test User",
    email: TEST_EMAIL,
    password: hashedPassword,
  });
});

after(async () => {
  const { default: VerificationToken } = await import("../src/models/VerificationToken.ts");
  await User.deleteOne({ email: TEST_EMAIL });
  await VerificationToken.deleteMany({ email: TEST_EMAIL });
  await mongoose.disconnect();
});

test("issueOtpCode creates verifiable code and rejects invalid code", async () => {
  const { code } = await issueOtpCode(TEST_EMAIL, "login_otp", 10);
  assert.equal(code.length, 6);

  // Wrong code
  const wrongRes = await verifyOtpCode(TEST_EMAIL, "login_otp", "000000", false);
  assert.equal(wrongRes.valid, false);

  // Correct code
  const correctRes = await verifyOtpCode(TEST_EMAIL, "login_otp", code, true);
  assert.equal(correctRes.valid, true);
});

test("HTTP dev server handles CSRF and credentials OTP signin", async () => {
  // Issue a fresh OTP
  const { code } = await issueOtpCode(TEST_EMAIL, "login_otp", 10);

  // 1. Fetch CSRF token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  assert.equal(csrfRes.status, 200);
  const csrfData = await csrfRes.json();
  assert.ok(csrfData.csrfToken);

  const cookies = csrfRes.headers.get("set-cookie") || "";
  // Must NOT contain __Host- or Secure on localhost HTTP
  assert.ok(!cookies.includes("__Host-authjs.csrf-token"), "Should not use __Host- prefix on localhost");
  assert.ok(cookies.includes("authjs.csrf-token="), "Must contain standard authjs.csrf-token");

  // 2. Submit credentials + OTP
  const signinRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      Cookie: cookies,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      otp: code,
      callbackUrl: "http://localhost:3000/dashboard",
    }),
  });

  assert.equal(signinRes.status, 200);
  const signinData = await signinRes.json();
  console.log("Signin response:", signinData);

  // URL should redirect to dashboard and NOT have error
  assert.ok(signinData.url);
  const urlObj = new URL(signinData.url);
  assert.equal(urlObj.searchParams.get("error"), null, `Expected no error but got: ${urlObj.searchParams.get("error")}`);
  assert.ok(urlObj.pathname.includes("/dashboard"));

  // Must have set sendpilot.session cookie without __Host-
  const responseCookies = signinRes.headers.get("set-cookie") || "";
  assert.ok(responseCookies.includes("sendpilot.session="), "Must set sendpilot.session cookie");
  assert.ok(!responseCookies.includes("__Host-sendpilot.session="), "Must not have __Host- prefix on localhost");
});
