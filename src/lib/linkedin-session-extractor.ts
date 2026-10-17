import type { Browser, BrowserContext, Page } from "playwright-core";
import {
  launchBrowser,
  createStealthContext,
  safeCloseBrowser,
} from "@/lib/browser-launcher";
import {
  decryptConnectionSecrets,
  encryptConnectionSecrets,
} from "@/lib/connection-crypto";

export type TwoFactorMethod = "otp" | "app";

export interface ExtractedSessionResult {
  success: boolean;
  li_at?: string;
  jsessionId?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    headline?: string;
    avatar?: string;
  };
  requiresTwoFactor?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  challengeMessage?: string;
  pendingChallengeToken?: string;
  error?: string;
}

export interface ExtractOptions {
  email: string;
  password: string;
  twoFactorMethod?: TwoFactorMethod;
  verificationCode?: string;
  pendingChallengeToken?: string;
  headless?: boolean;
  timeout?: number;
  onProgress?: (stage: string) => void;
}

interface CapturedChallengeForm {
  action: string;
  method: string;
  pinFieldName: string;
  hiddenFields: Record<string, string>;
}

interface PendingChallengePayload {
  email: string;
  checkpointUrl: string;
  userAgent?: string;
  capturedForm?: CapturedChallengeForm | null;
  storageState: {
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None";
    }>;
    origins: Array<{
      origin: string;
      localStorage: Array<{ name: string; value: string }>;
    }>;
  };
  createdAt: number;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

const PIN_INPUT_SELECTOR = [
  'input[name="pin"]:visible',
  "input#input__phone_verification_pin:visible",
  "input#input__email_verification_pin:visible",
  "input#input__totp_verification_pin:visible",
  'input[id*="verification_pin"]:visible',
  'input[autocomplete="one-time-code"]:visible',
  'input[name*="verification"]:visible',
  'input[name="challengeResponse"]:visible',
  'input[type="tel"]:visible',
  'input[type="number"]:visible',
].join(", ");

const PIN_SUBMIT_SELECTOR = [
  "button#two-step-submit-button:visible",
  "button#email-pin-submit-button:visible",
  'form[action*="challenge"] button[type="submit"]:visible',
  'button[type="submit"]:visible',
].join(", ");

function isValidLiAtValue(val: string | undefined | null): val is string {
  if (!val || typeof val !== "string") return false;
  const clean = val.trim();
  return clean.length > 25 && clean.toLowerCase() !== "delete me";
}

/**
 * Verifies active session using LinkedIn Voyager API (with cloud-IP fallback for Vercel)
 */
export async function verifyLinkedInSession(liAt: string, jsessionId?: string) {
  const cleanLiAt = liAt
    .trim()
    .replace(/^li_at\s*=\s*/i, "")
    .replace(/;.*$/, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!cleanLiAt || cleanLiAt.length < 30) {
    return { active: false, status: 400, error: "Invalid li_at cookie format" };
  }

  let cleanCsrf = jsessionId
    ? jsessionId
        .trim()
        .replace(/^JSESSIONID\s*=\s*/i, "")
        .replace(/;.*$/, "")
        .replace(/"/g, "")
        .trim()
    : "";

  if (!cleanCsrf) {
    cleanCsrf = `ajax:${Date.now()}`;
  }

  try {
    const res = await fetch("https://www.linkedin.com/voyager/api/me", {
      redirect: "manual",
      headers: {
        Cookie: `li_at=${cleanLiAt}; JSESSIONID="${cleanCsrf}"`,
        "csrf-token": cleanCsrf,
        "x-restli-protocol-version": "2.0.0",
        "x-li-lang": "en_US",
        "User-Agent": BROWSER_UA,
        Accept: "application/vnd.linkedin.normalized+json+2.1",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 200) {
      const json = await res.json().catch(() => null);
      const plainInfo = json?.data || json?.miniProfile || {};
      const firstName = plainInfo.firstName || plainInfo.localizedFirstName || "";
      const lastName = plainInfo.lastName || plainInfo.localizedLastName || "";
      const headline = plainInfo.occupation || plainInfo.headline || "";

      return {
        active: true,
        status: 200,
        profile: { firstName, lastName, headline },
      };
    }

    if (res.status === 401) {
      return { active: false, status: 401 };
    }

    const feedRes = await fetch("https://www.linkedin.com/feed/", {
      redirect: "manual",
      headers: {
        Cookie: `li_at=${cleanLiAt}; JSESSIONID="${cleanCsrf}"`,
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const location = (feedRes.headers.get("location") || "").toLowerCase();
    if (
      location.includes("/login") ||
      location.includes("/uas/login") ||
      location.includes("/authwall")
    ) {
      return { active: false, status: 401 };
    }

    if (feedRes.status === 200 || cleanLiAt.startsWith("AQ")) {
      let firstName = "";
      let lastName = "";
      let headline = "";

      if (feedRes.status === 200) {
        const html = await feedRes.text().catch(() => "");
        const fnMatch = html.match(/"firstName"\s*:\s*"([^"]+)"/);
        const lnMatch = html.match(/"lastName"\s*:\s*"([^"]+)"/);
        const occMatch = html.match(/"occupation"\s*:\s*"([^"]+)"/);
        if (fnMatch?.[1]) firstName = fnMatch[1];
        if (lnMatch?.[1]) lastName = lnMatch[1];
        if (occMatch?.[1]) headline = occMatch[1];
      }

      return {
        active: true,
        status: 200,
        profile: { firstName, lastName, headline },
      };
    }

    return {
      active: false,
      status: res.status,
    };
  } catch (err: unknown) {
    if (cleanLiAt.startsWith("AQ") && cleanLiAt.length >= 60) {
      return {
        active: true,
        status: 200,
        profile: { firstName: "", lastName: "", headline: "LinkedIn Profile" },
      };
    }
    const message = err instanceof Error ? err.message : "Network error during verification";
    return { active: false, error: message };
  }
}

/**
 * Inspects the current page to distinguish between:
 * - Login form (/checkpoint/lg/login)
 * - Bot security puzzle (captchaInternal / "Let's do a quick security check")
 * - Real 2FA Checkpoint (/checkpoint/challenge/... with PIN input or LinkedIn App push)
 */
async function detectCheckpointKind(
  page: Page,
  sawCaptchaNetwork = false
): Promise<{
  isCheckpoint: boolean;
  isCaptcha: boolean;
  hasPinInput: boolean;
  isAppPush: boolean;
  description: string;
}> {
  const currentUrl = page.url();
  const bodyText = await page.innerText("body").catch(() => "");
  const lowerText = bodyText.toLowerCase();

  const isLoginUrl =
    (currentUrl.includes("/checkpoint/lg/login") || currentUrl.endsWith("/login")) &&
    !currentUrl.includes("/checkpoint/challenge");

  const pinLocator = page.locator(PIN_INPUT_SELECTOR).first();
  const hasPinInput = !isLoginUrl && (await pinLocator.isVisible().catch(() => false));

  const hasAppPushText =
    lowerText.includes("linkedin app") ||
    lowerText.includes("open your linkedin") ||
    lowerText.includes("check your phone") ||
    lowerText.includes("tap yes") ||
    lowerText.includes("notification we sent") ||
    lowerText.includes("approve the sign-in") ||
    lowerText.includes("check your mobile");

  const hasTwoFactorText =
    lowerText.includes("verification code") ||
    lowerText.includes("two-step verification") ||
    lowerText.includes("enter the code") ||
    lowerText.includes("we sent a code") ||
    lowerText.includes("verify your identity") ||
    lowerText.includes("verify with sms") ||
    lowerText.includes("verify with email") ||
    lowerText.includes("try another way") ||
    lowerText.includes("send code");

  // Only match actual VISIBLE interactive CAPTCHA challenge frames.
  // Never match `iframe[src*="recaptcha"]` generally because LinkedIn embeds an invisible
  // `recaptcha/enterprise/anchor?...&size=invisible` badge on 100% of login & checkpoint pages!
  const visibleCaptchaFrameCount = await page
    .locator(
      '#captcha-internal:visible, iframe[src*="arkose"]:visible, iframe[src*="funcaptcha"]:visible, iframe[src*="recaptcha/api2/bframe"]:visible, iframe[src*="recaptcha/enterprise/bframe"]:visible'
    )
    .count()
    .catch(() => 0);

  const hasCaptchaText =
    lowerText.includes("quick security check") ||
    lowerText.includes("verify you are a human") ||
    lowerText.includes("solve this puzzle");

  const isCaptcha =
    !hasPinInput &&
    !hasAppPushText &&
    !hasTwoFactorText &&
    (currentUrl.includes("captchaInternal") ||
      visibleCaptchaFrameCount > 0 ||
      hasCaptchaText ||
      (sawCaptchaNetwork && lowerText.includes("security check")));

  const isAppPush = !isCaptcha && !hasPinInput && hasAppPushText;

  const isCheckpoint =
    !isCaptcha &&
    (currentUrl.includes("/checkpoint/challenge") ||
      hasPinInput ||
      isAppPush ||
      hasTwoFactorText);

  let description = "LinkedIn requested two-factor verification.";
  if (hasPinInput) {
    if (lowerText.includes("email")) {
      description = "LinkedIn sent a one-time verification code to your email.";
    } else if (
      lowerText.includes("sms") ||
      lowerText.includes("phone") ||
      lowerText.includes("text")
    ) {
      description = "LinkedIn sent a one-time verification code via SMS.";
    } else {
      description = "Enter the one-time verification code sent by LinkedIn (SMS or email).";
    }
  } else if (isAppPush) {
    description = "Open the LinkedIn mobile app and approve the sign-in request.";
  }

  return { isCheckpoint, isCaptcha, hasPinInput, isAppPush, description };
}

/**
 * Triggers sending the one-time code (SMS or email) if LinkedIn landed on the
 * mobile app push prompt or a "Send code" / "Try another way" chooser screen.
 * Uses combined locators to minimize CDP roundtrips and avoid serverless timeouts.
 */
async function ensurePreferredTwoFactorMethod(
  page: Page,
  preferred: TwoFactorMethod
): Promise<void> {
  const switchToOtpCombinedSelector = [
    "#try-another-way:visible",
    'form[action*="try-another-way"] button[type="submit"]:visible',
    'button:has-text("Try another way"):visible',
    'a:has-text("Try another way"):visible',
    'button:has-text("Verify another way"):visible',
    'a:has-text("Verify another way"):visible',
    'button:has-text("Verify with SMS"):visible',
    'a:has-text("Verify with SMS"):visible',
    'button:has-text("Verify using SMS"):visible',
    'a:has-text("Verify using SMS"):visible',
    'button:has-text("Verify with phone"):visible',
    'a:has-text("Verify with phone"):visible',
    'button:has-text("Verify with email"):visible',
    'a:has-text("Verify with email"):visible',
    'button:has-text("Send code"):visible',
    'a:has-text("Send code"):visible',
    'button:has-text("Get code"):visible',
    'button:has-text("Use a verification code"):visible',
    'a:has-text("Use a verification code"):visible',
    'form#otp-generation button[type="submit"]:visible',
  ].join(", ");

  const appCombinedSelector = [
    'button:has-text("Use LinkedIn app"):visible',
    'a:has-text("Use LinkedIn app"):visible',
    "#try-another-way:visible",
    'button:has-text("Try another way"):visible',
    'a:has-text("Try another way"):visible',
  ].join(", ");

  for (let attempt = 0; attempt < 2; attempt++) {
    const state = await detectCheckpointKind(page);
    if (!state.isCheckpoint) return;

    if (preferred === "otp") {
      if (state.hasPinInput) return;

      const switchBtn = page.locator(switchToOtpCombinedSelector).first();
      if (await switchBtn.isVisible().catch(() => false)) {
        await switchBtn.click().catch(() => {});
        await Promise.race([
          page
            .locator(PIN_INPUT_SELECTOR)
            .first()
            .waitFor({ state: "visible", timeout: 2000 })
            .catch(() => {}),
          page.waitForTimeout(1400),
        ]);
      }

      const recheck = await detectCheckpointKind(page);
      if (recheck.hasPinInput) return;

      const smsOrEmailRadio = page
        .locator(
          'input[type="radio"][value*="SMS" i], input[type="radio"][value*="EMAIL" i], input[type="radio"][value*="PHONE" i], label:has-text("SMS"), label:has-text("Email")'
        )
        .first();
      if (await smsOrEmailRadio.isVisible().catch(() => false)) {
        await smsOrEmailRadio.click().catch(() => {});
        await page.waitForTimeout(250);
        const submitChoice = page.locator('button[type="submit"]:visible').first();
        if (await submitChoice.isVisible().catch(() => false)) {
          await submitChoice.click().catch(() => {});
          await Promise.race([
            page
              .locator(PIN_INPUT_SELECTOR)
              .first()
              .waitFor({ state: "visible", timeout: 2000 })
              .catch(() => {}),
            page.waitForTimeout(1400),
          ]);
        }
      }
    } else if (preferred === "app") {
      if (state.isAppPush) return;
      const appBtn = page.locator(appCombinedSelector).first();
      if (await appBtn.isVisible().catch(() => false)) {
        await appBtn.click().catch(() => {});
        await page.waitForTimeout(1200);
      }
      return;
    }
  }
}

/**
 * Captures the active checkpoint <form> action, method, and all fields so the
 * one-time code can be submitted directly via HTTP POST or DOM form reconstruction.
 */
async function captureChallengeForm(page: Page): Promise<CapturedChallengeForm | null> {
  try {
    return await page.evaluate(() => {
      const pinInput = document.querySelector<HTMLInputElement>(
        'input[name="pin"], input#input__phone_verification_pin, input#input__email_verification_pin, input#input__totp_verification_pin, input[id*="verification_pin"], input[autocomplete="one-time-code"], input[name*="verification"], input[name="challengeResponse"], input[type="tel"], input[type="number"]'
      );
      const form =
        pinInput?.closest("form") ||
        document.querySelector<HTMLFormElement>(
          'form[action*="challenge"], form#email-pin-challenge, form#two-step-challenge, form[method="post" i]'
        );
      if (!form) return null;

      const pinFieldName = pinInput?.name || "pin";
      const hiddenFields: Record<string, string> = {};
      form.querySelectorAll<HTMLInputElement>("input").forEach((inp) => {
        if (!inp.name || inp.name === pinFieldName) return;
        const type = (inp.type || "").toLowerCase();
        if (type === "hidden") {
          hiddenFields[inp.name] = inp.value || "";
        } else if ((type === "checkbox" || type === "radio") && inp.checked) {
          hiddenFields[inp.name] = inp.value || "true";
        }
      });

      return {
        action: form.action || window.location.href,
        method: (form.method || "POST").toUpperCase(),
        pinFieldName,
        hiddenFields,
      };
    });
  } catch {
    return null;
  }
}

/**
 * Fast-path: Submits the captured 2FA challenge POST form directly over HTTP using
 * the cookies from Step 1. Completes in ~1s without needing to spin up Chromium.
 */
async function submitChallengeFormViaHttp(
  challenge: PendingChallengePayload,
  code: string
): Promise<{
  success: boolean;
  li_at?: string;
  jsessionId?: string;
  invalidCodeError?: string;
}> {
  const form = challenge.capturedForm;
  if (!form?.action || !challenge.storageState?.cookies?.length) {
    return { success: false };
  }

  const cleanCode = code.trim().replace(/\s+/g, "");
  const cookieJar = new Map<string, string>();
  for (const c of challenge.storageState.cookies) {
    if (c.name && c.value) {
      cookieJar.set(c.name, c.value);
    }
  }

  const parseSetCookies = (res: Response) => {
    const rawHeaders: string[] =
      typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie ===
      "function"
        ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : [res.headers.get("set-cookie") || ""].filter(Boolean);

    for (const header of rawHeaders) {
      const firstPart = header.split(";")[0]?.trim();
      if (!firstPart) continue;
      const eqIdx = firstPart.indexOf("=");
      if (eqIdx <= 0) continue;
      const name = firstPart.slice(0, eqIdx).trim();
      const val = firstPart.slice(eqIdx + 1).trim();
      if (!val || val.toLowerCase() === "delete me" || /max-age=0/i.test(header)) {
        if (name !== "li_at") cookieJar.delete(name);
        continue;
      }
      cookieJar.set(name, val);
    }
  };

  const buildCookieHeader = () =>
    Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

  try {
    const targetUrl = new URL(form.action, "https://www.linkedin.com").toString();
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(form.hiddenFields || {})) {
      params.set(k, v);
    }
    params.set(form.pinFieldName || "pin", cleanCode);

    const ua = challenge.userAgent || BROWSER_UA;
    let res = await fetch(targetUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: buildCookieHeader(),
        "User-Agent": ua,
        Origin: "https://www.linkedin.com",
        Referer: challenge.checkpointUrl || "https://www.linkedin.com/checkpoint/challenge/",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });

    parseSetCookies(res);

    // Follow up to 4 redirects to collect li_at cookie across hops
    let hops = 0;
    while (
      hops < 4 &&
      !isValidLiAtValue(cookieJar.get("li_at")) &&
      res.status >= 300 &&
      res.status < 400
    ) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const nextUrl = new URL(loc, targetUrl).toString();
      res = await fetch(nextUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          Cookie: buildCookieHeader(),
          "User-Agent": ua,
          Referer: targetUrl,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(6000),
      });
      parseSetCookies(res);
      hops++;
    }

    const liAt = cookieJar.get("li_at");
    if (isValidLiAtValue(liAt)) {
      const jsessionId = (cookieJar.get("JSESSIONID") || "").replace(/^"+|"+$/g, "");
      return {
        success: true,
        li_at: liAt,
        jsessionId,
      };
    }

    const bodyText = await res.text().catch(() => "");
    const lower = bodyText.toLowerCase();
    if (
      lower.includes("code you entered is incorrect") ||
      lower.includes("expired code") ||
      lower.includes("doesn't match") ||
      lower.includes("not the right code") ||
      lower.includes("please enter a valid code")
    ) {
      return {
        success: false,
        invalidCodeError:
          "The verification code entered was incorrect or expired. Please try again.",
      };
    }

    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Submits the 6-digit one-time code (SMS / Email) into LinkedIn's checkpoint form.
 */
async function submitOneTimeCode(
  page: Page,
  code: string,
  capturedForm?: CapturedChallengeForm | null
): Promise<{ error?: string }> {
  const cleanCode = code.trim().replace(/\s+/g, "");
  const pinInput = page.locator(PIN_INPUT_SELECTOR).first();

  const visible = await pinInput
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);

  if (visible) {
    await pinInput.fill(cleanCode);
    await page.waitForTimeout(150);

    const submitBtn = page.locator(PIN_SUBMIT_SELECTOR).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click().catch(async () => {
        await pinInput.press("Enter");
      });
    } else {
      await pinInput.press("Enter");
    }
    return {};
  }

  // Fallback: If GET on checkpointUrl didn't render the PIN input, reconstruct and submit the captured POST form
  if (capturedForm && capturedForm.action) {
    await page.evaluate(
      ({ formSpec, pinValue }) => {
        const form = document.createElement("form");
        form.method = formSpec.method || "POST";
        form.action = formSpec.action;
        for (const [k, v] of Object.entries(formSpec.hiddenFields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        const pin = document.createElement("input");
        pin.type = "hidden";
        pin.name = formSpec.pinFieldName || "pin";
        pin.value = pinValue;
        form.appendChild(pin);
        document.body.appendChild(form);
        form.submit();
      },
      { formSpec: capturedForm, pinValue: cleanCode }
    );
    return {};
  }

  return {
    error:
      "Could not locate the one-time code input field on LinkedIn's verification page. Please request a fresh code.",
  };
}

async function createPendingChallengeToken(
  context: BrowserContext,
  page: Page,
  email: string
): Promise<string | undefined> {
  try {
    const storageState =
      (await context.storageState()) as PendingChallengePayload["storageState"];
    const capturedForm = await captureChallengeForm(page);
    const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => BROWSER_UA);
    const payload: PendingChallengePayload = {
      email,
      checkpointUrl: page.url(),
      userAgent,
      capturedForm,
      storageState,
      createdAt: Date.now(),
    };
    return encryptConnectionSecrets(payload);
  } catch {
    return undefined;
  }
}

/**
 * Performs login on https://www.linkedin.com/checkpoint/lg/login using event-driven
 * waiting so it resolves immediately once LinkedIn responds.
 */
async function performCheckpointLogin(page: Page, email: string, password: string) {
  await page.goto("https://www.linkedin.com/checkpoint/lg/login", {
    waitUntil: "domcontentloaded",
    timeout: 12000,
  });

  // Allow anti-bot scripts (merchantpool1.linkedin.com, li.protechts.net, recaptcha/enterprise)
  // to initialize before typing credentials so `apfc` telemetry is populated naturally
  await page.waitForTimeout(700);
  await page.mouse.move(180, 260).catch(() => {});
  await page.mouse.move(480, 320, { steps: 4 }).catch(() => {});

  const emailInput = page
    .locator('#username:visible, input[name="session_key"]:visible, input[type="email"]:visible')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 8000 });
  await emailInput.click().catch(() => {});
  await emailInput.fill("");
  await emailInput.pressSequentially(email, { delay: 18 }).catch(async () => {
    await emailInput.fill(email);
  });

  await page.waitForTimeout(180);

  const passInput = page
    .locator(
      '#password:visible, input[name="session_password"]:visible, input[type="password"]:visible'
    )
    .first();
  await passInput.waitFor({ state: "visible", timeout: 8000 });
  await passInput.click().catch(() => {});
  await passInput.fill("");
  await passInput.pressSequentially(password, { delay: 18 }).catch(async () => {
    await passInput.fill(password);
  });

  await page.waitForTimeout(300);

  const submitBtn = page
    .locator(
      'form[action*="login-submit"] button[type="submit"]:visible, button[type="submit"]:visible'
    )
    .first();

  const navigationOrOutcomePromise = Promise.race([
    page
      .waitForURL(
        (u) =>
          !u.pathname.endsWith("/lg/login") &&
          !u.pathname.endsWith("/lg/login-submit") &&
          !u.pathname.endsWith("/login"),
        { timeout: 10000 }
      )
      .catch(() => {}),
    page
      .locator(PIN_INPUT_SELECTOR)
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {}),
    page
      .locator(
        '#error-for-username:visible, #error-for-password:visible, [data-qa-alert="error"]:visible'
      )
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {}),
    page.waitForTimeout(5000),
  ]);

  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.hover().catch(() => {});
    await page.waitForTimeout(120);
    await submitBtn.click();
  } else {
    await passInput.press("Enter");
  }

  await navigationOrOutcomePromise;
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
}

/**
 * Automates real browser login with full support for LinkedIn Two-Factor Authentication:
 * - "otp": One-time code (LinkedIn sends a code by SMS or email)
 * - "app": LinkedIn app (Approve the sign-in in the mobile app)
 * Enforces a strict time budget so serverless functions never hit FUNCTION_INVOCATION_TIMEOUT.
 */
export async function extractLinkedInSession({
  email,
  password,
  twoFactorMethod = "otp",
  verificationCode,
  pendingChallengeToken,
  headless = true,
  timeout = 24000,
  onProgress,
}: ExtractOptions): Promise<ExtractedSessionResult> {
  const overallStart = Date.now();
  // Cap total execution budget to 25s so Vercel never hits FUNCTION_INVOCATION_TIMEOUT
  const maxBudgetMs = Math.min(timeout || 24000, 25000);

  let restoredChallenge: PendingChallengePayload | null = null;
  if (pendingChallengeToken) {
    try {
      const parsed = decryptConnectionSecrets<PendingChallengePayload>(pendingChallengeToken);
      if (parsed && Date.now() - parsed.createdAt < 15 * 60 * 1000) {
        restoredChallenge = parsed;
      }
    } catch {
      restoredChallenge = null;
    }
  }

  // Fast-path: When submitting a 6-digit OTP code with a captured form from Step 1,
  // try direct HTTP POST first (~1s) before launching Chromium.
  if (verificationCode && verificationCode.trim() && restoredChallenge?.capturedForm) {
    onProgress?.("Submitting verification code...");
    const httpAttempt = await submitChallengeFormViaHttp(
      restoredChallenge,
      verificationCode
    );
    if (httpAttempt.success && httpAttempt.li_at) {
      const verification = await verifyLinkedInSession(
        httpAttempt.li_at,
        httpAttempt.jsessionId
      );
      return {
        success: true,
        li_at: httpAttempt.li_at,
        jsessionId: httpAttempt.jsessionId,
        profile: verification.profile,
      };
    }
    if (httpAttempt.invalidCodeError) {
      return {
        success: false,
        requiresTwoFactor: true,
        twoFactorMethod: "otp",
        pendingChallengeToken,
        error: httpAttempt.invalidCodeError,
      };
    }
  }

  let browser: Browser | null = null;
  onProgress?.("Launching browser engine...");

  try {
    browser = await launchBrowser({ headless });

    const context = await createStealthContext(browser, {
      userAgent: restoredChallenge?.userAgent,
      storageState: restoredChallenge?.storageState,
      blockHeavyResources: false,
    });

    const page = await context.newPage();

    let sawCaptchaNetwork = false;
    page.on("response", (res) => {
      if (res.url().includes("captchaInternal")) {
        sawCaptchaNetwork = true;
      }
    });

    if (restoredChallenge?.checkpointUrl) {
      onProgress?.("Resuming LinkedIn verification session...");
      await page
        .goto(restoredChallenge.checkpointUrl, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        })
        .catch(() => {});
      await page.waitForTimeout(800);

      const currentUrl = page.url();
      if (
        (currentUrl.includes("/login") || currentUrl.includes("/uas/login")) &&
        !restoredChallenge.capturedForm
      ) {
        await performCheckpointLogin(page, email, password);
      }
    } else {
      onProgress?.("Signing in to LinkedIn...");
      await performCheckpointLogin(page, email, password);
    }

    onProgress?.("Checking LinkedIn authentication & two-factor status...");
    let foundLiAt = "";
    let foundJsessionId = "";
    let codeSubmitted = false;
    let ensuredMethodOnce = false;
    let unresolvedCheckpointChecks = 0;
    let nonCheckpointChecks = 0;
    let captchaChecks = 0;

    while (Date.now() - overallStart < maxBudgetMs) {
      // 1. Check if li_at session cookie has been granted
      const cookies = await context.cookies();
      const liAtCookie = cookies.find((c) => c.name === "li_at" && isValidLiAtValue(c.value));
      const jsessionIdCookie = cookies.find((c) => c.name === "JSESSIONID");

      if (liAtCookie && isValidLiAtValue(liAtCookie.value)) {
        foundLiAt = liAtCookie.value;
        foundJsessionId = (jsessionIdCookie?.value || "").replace(/^"+|"+$/g, "");
        break;
      }

      // 2. Check for invalid email/password
      const bodyText = await page.innerText("body").catch(() => "");
      if (
        bodyText.includes("Wrong email or password") ||
        bodyText.includes("That's not the right password") ||
        bodyText.includes("Couldn't find a LinkedIn account") ||
        bodyText.includes("Wrong password") ||
        bodyText.includes("Please enter a valid username") ||
        bodyText.includes("recognize that email")
      ) {
        await safeCloseBrowser(browser);
        return { success: false, error: "Incorrect LinkedIn email or password provided." };
      }

      // 3. Check for invalid OTP code after submission
      if (
        codeSubmitted &&
        (bodyText.includes("code you entered is incorrect") ||
          bodyText.includes("expired code") ||
          bodyText.includes("doesn't match") ||
          bodyText.includes("Please enter a valid code") ||
          bodyText.includes("not the right code"))
      ) {
        const refreshedToken = await createPendingChallengeToken(context, page, email);
        await safeCloseBrowser(browser);
        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorMethod: "otp",
          pendingChallengeToken: refreshedToken || pendingChallengeToken,
          error: "The verification code entered was incorrect or expired. Please try again.",
        };
      }

      const errorElements = await page
        .locator(
          '#error-for-username:visible, #error-for-password:visible, #error-for-pin:visible, [data-qa-alert="error"]:visible'
        )
        .all();
      for (const el of errorElements) {
        const txt = (await el.innerText().catch(() => "")).trim();
        if (txt) {
          await safeCloseBrowser(browser);
          return { success: false, error: txt };
        }
      }

      // 4. Inspect checkpoint / CAPTCHA / 2FA state
      const checkpoint = await detectCheckpointKind(page, sawCaptchaNetwork);

      if (checkpoint.isCaptcha) {
        captchaChecks++;
        if (captchaChecks >= 2) {
          await safeCloseBrowser(browser);
          return {
            success: false,
            error:
              "LinkedIn blocked automated cloud login with a bot security puzzle (CAPTCHA), so it did not send a verification code. Please use the 'Paste Cookies' tab and paste your li_at cookie from your browser.",
          };
        }
        await page.waitForTimeout(800);
        continue;
      }
      captchaChecks = 0;

      if (checkpoint.isCheckpoint || restoredChallenge?.capturedForm) {
        if (checkpoint.isCheckpoint && !ensuredMethodOnce && !verificationCode) {
          ensuredMethodOnce = true;
          await ensurePreferredTwoFactorMethod(page, twoFactorMethod);
        }

        const updatedCheckpoint = await detectCheckpointKind(page, sawCaptchaNetwork);

        // Case A: User provided a 6-digit verification code -> submit it now
        if (verificationCode && verificationCode.trim() && !codeSubmitted) {
          onProgress?.("Submitting one-time verification code...");
          const submitRes = await submitOneTimeCode(
            page,
            verificationCode,
            restoredChallenge?.capturedForm
          );
          if (submitRes.error) {
            const token = await createPendingChallengeToken(context, page, email);
            await safeCloseBrowser(browser);
            return {
              success: false,
              requiresTwoFactor: true,
              twoFactorMethod: "otp",
              pendingChallengeToken: token || pendingChallengeToken,
              error: submitRes.error,
            };
          }
          codeSubmitted = true;
          await page.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(1200);
          continue;
        }

        // Case B: One-time code input is visible on the page -> return immediately so user can enter it
        if (updatedCheckpoint.hasPinInput && !verificationCode) {
          const token = await createPendingChallengeToken(context, page, email);
          await safeCloseBrowser(browser);
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorMethod: "otp",
            challengeMessage: updatedCheckpoint.description,
            pendingChallengeToken: token,
            error: updatedCheckpoint.description,
          };
        }

        // Case C: LinkedIn is showing the Mobile App Push screen ("Check your LinkedIn app")
        if (updatedCheckpoint.isAppPush && !verificationCode) {
          if (twoFactorMethod === "otp") {
            const token = await createPendingChallengeToken(context, page, email);
            await safeCloseBrowser(browser);
            return {
              success: false,
              requiresTwoFactor: true,
              twoFactorMethod: "app",
              challengeMessage:
                "LinkedIn sent a sign-in approval push to your LinkedIn mobile app instead of an SMS/email code. Approve it in your mobile app, then click Continue.",
              pendingChallengeToken: token,
              error: "Approve the sign-in request in your LinkedIn mobile app.",
            };
          }

          // For "app" push method: poll briefly (up to 4s on resume or 2s on initial login),
          // then return 202 with pendingChallengeToken so the serverless function never times out.
          onProgress?.("Checking LinkedIn mobile app approval status...");
          const appPollDuration = restoredChallenge ? 4500 : 2000;
          const appPollStart = Date.now();
          while (
            Date.now() - appPollStart < appPollDuration &&
            Date.now() - overallStart < maxBudgetMs - 1500
          ) {
            await page.waitForTimeout(750);
            const pollCookies = await context.cookies();
            const pollLiAt = pollCookies.find(
              (c) => c.name === "li_at" && isValidLiAtValue(c.value)
            );
            const pollJsession = pollCookies.find((c) => c.name === "JSESSIONID");
            if (pollLiAt && isValidLiAtValue(pollLiAt.value)) {
              foundLiAt = pollLiAt.value;
              foundJsessionId = (pollJsession?.value || "").replace(/^"+|"+$/g, "");
              break;
            }
          }

          if (foundLiAt) break;

          const token = await createPendingChallengeToken(context, page, email);
          await safeCloseBrowser(browser);
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorMethod: "app",
            challengeMessage:
              "Approve the sign-in notification in your LinkedIn mobile app, then click 'I Approved in App — Continue'.",
            pendingChallengeToken: token || pendingChallengeToken,
            error:
              "Open the LinkedIn mobile app and tap Yes on the sign-in prompt, then click Continue.",
          };
        }

        // Case D: Generic checkpoint screen without recognized PIN input or App Push text yet
        unresolvedCheckpointChecks++;
        if (!verificationCode && unresolvedCheckpointChecks >= 2) {
          const token = await createPendingChallengeToken(context, page, email);
          await safeCloseBrowser(browser);
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorMethod,
            challengeMessage: updatedCheckpoint.description,
            pendingChallengeToken: token || pendingChallengeToken,
            error: updatedCheckpoint.description,
          };
        }
      } else {
        nonCheckpointChecks++;
        if (nonCheckpointChecks >= 3) {
          break;
        }
      }

      await page.waitForTimeout(800);
    }

    if (!foundLiAt) {
      const checkpoint = await detectCheckpointKind(page, sawCaptchaNetwork);
      const token = checkpoint.isCheckpoint
        ? await createPendingChallengeToken(context, page, email)
        : pendingChallengeToken;
      await safeCloseBrowser(browser);

      if (checkpoint.isCaptcha) {
        return {
          success: false,
          error:
            "LinkedIn blocked automated cloud login with a bot security puzzle (CAPTCHA), so it did not send a verification code. Please use the 'Paste Cookies' tab and paste your li_at cookie.",
        };
      }

      if (checkpoint.isCheckpoint) {
        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorMethod: checkpoint.hasPinInput ? "otp" : twoFactorMethod,
          challengeMessage:
            twoFactorMethod === "app"
              ? "Approve the sign-in in your LinkedIn mobile app, then click 'I Approved in App — Continue'."
              : checkpoint.description,
          pendingChallengeToken: token,
          error:
            twoFactorMethod === "app"
              ? "Approve the sign-in in your LinkedIn mobile app, then click 'I Approved in App — Continue'."
              : checkpoint.description,
        };
      }

      return {
        success: false,
        error:
          "Authentication did not complete in time. Please verify your credentials or use the 'Paste Cookies' tab.",
      };
    }

    onProgress?.("Verifying session with LinkedIn Voyager API...");
    await safeCloseBrowser(browser);
    browser = null;

    const verification = await verifyLinkedInSession(foundLiAt, foundJsessionId);

    return {
      success: true,
      li_at: foundLiAt,
      jsessionId: foundJsessionId,
      profile: verification.profile,
    };
  } catch (err: unknown) {
    await safeCloseBrowser(browser);
    const message = err instanceof Error ? err.message : "Unknown browser automation error";
    return {
      success: false,
      error: `${message}. You can also connect using the 'Paste Cookies' tab with your li_at cookie.`,
    };
  }
}
