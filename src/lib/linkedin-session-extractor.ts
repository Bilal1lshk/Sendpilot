import type { Browser, BrowserContext, Page } from "playwright-core";
import { launchBrowser } from "@/lib/browser-launcher";
import { decryptConnectionSecrets, encryptConnectionSecrets } from "@/lib/connection-crypto";

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

interface PendingChallengePayload {
  email: string;
  checkpointUrl: string;
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const PIN_INPUT_SELECTOR = [
  'input[name="pin"]:visible',
  "input#input__phone_verification_pin:visible",
  "input#input__email_verification_pin:visible",
  "input#input__totp_verification_pin:visible",
  'input[id*="verification_pin"]:visible',
  'input[autocomplete="one-time-code"]:visible',
  'input[name*="verification"]:visible',
  'input[type="tel"]:visible',
  'input[type="number"]:visible',
].join(", ");

const PIN_SUBMIT_SELECTOR = [
  "button#two-step-submit-button:visible",
  "button#email-pin-submit-button:visible",
  'button[type="submit"]:visible',
].join(", ");

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
 * Helper to detect whether LinkedIn is currently on a 2FA checkpoint page
 * and switch between "One-time code (SMS/Email)" and "LinkedIn app" if requested.
 */
async function detectCheckpointKind(page: Page): Promise<{
  isCheckpoint: boolean;
  hasPinInput: boolean;
  isAppPush: boolean;
  description: string;
}> {
  const currentUrl = page.url();
  const bodyText = await page.innerText("body").catch(() => "");
  const lowerText = bodyText.toLowerCase();

  const pinLocator = page.locator(PIN_INPUT_SELECTOR).first();
  const hasPinInput = await pinLocator.isVisible().catch(() => false);

  const isAppPush =
    lowerText.includes("linkedin app") ||
    lowerText.includes("open your linkedin") ||
    lowerText.includes("check your phone") ||
    lowerText.includes("tap yes") ||
    lowerText.includes("notification we sent") ||
    lowerText.includes("approve the sign-in");

  const isCheckpoint =
    currentUrl.includes("/checkpoint/") ||
    hasPinInput ||
    isAppPush ||
    lowerText.includes("verification code") ||
    lowerText.includes("two-step verification") ||
    lowerText.includes("enter the code") ||
    lowerText.includes("we sent a code");

  let description = "LinkedIn requested two-factor verification.";
  if (hasPinInput) {
    if (lowerText.includes("email")) {
      description = "LinkedIn sent a one-time verification code to your email.";
    } else if (lowerText.includes("sms") || lowerText.includes("phone") || lowerText.includes("text")) {
      description = "LinkedIn sent a one-time verification code via SMS.";
    } else {
      description = "Enter the one-time verification code sent by LinkedIn (SMS or email).";
    }
  } else if (isAppPush) {
    description = "Open the LinkedIn mobile app and approve the sign-in request.";
  }

  return { isCheckpoint, hasPinInput, isAppPush, description };
}

/**
 * If the user requested "otp" (One-time code via SMS/email) but LinkedIn defaulted
 * to the mobile app push screen, clicks "Try another way" / "Send code" so LinkedIn
 * sends the SMS or email one-time code.
 */
async function ensurePreferredTwoFactorMethod(
  page: Page,
  preferred: TwoFactorMethod
): Promise<void> {
  const state = await detectCheckpointKind(page);
  if (!state.isCheckpoint) return;

  if (preferred === "otp" && !state.hasPinInput) {
    // Look for "Try another way", "Verify using SMS", "Send code", etc.
    const tryAnotherSelectors = [
      'button:has-text("Try another way")',
      'a:has-text("Try another way")',
      "#try-another-way",
      'button:has-text("Verify with SMS")',
      'a:has-text("Verify with SMS")',
      'button:has-text("Send code")',
      'a:has-text("Send code")',
      'button:has-text("Use a verification code")',
      'a:has-text("Use a verification code")',
    ];

    for (const sel of tryAnotherSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1500);
        break;
      }
    }
  } else if (preferred === "app" && state.hasPinInput && !state.isAppPush) {
    const appSelectors = [
      'button:has-text("Use LinkedIn app")',
      'a:has-text("Use LinkedIn app")',
      'button:has-text("Try another way")',
      'a:has-text("Try another way")',
    ];
    for (const sel of appSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1500);
        break;
      }
    }
  }
}

/**
 * Submits the 6-digit one-time code (SMS / Email) into LinkedIn's checkpoint form.
 */
async function submitOneTimeCode(page: Page, code: string): Promise<{ error?: string }> {
  const cleanCode = code.trim().replace(/\s+/g, "");
  const pinInput = page.locator(PIN_INPUT_SELECTOR).first();

  const visible = await pinInput
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return {
      error:
        "Could not locate the one-time code input field on LinkedIn's verification page. Please try requesting a new code.",
    };
  }

  await pinInput.fill(cleanCode);
  await page.waitForTimeout(300);

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

async function createPendingChallengeToken(
  context: BrowserContext,
  page: Page,
  email: string
): Promise<string | undefined> {
  try {
    const storageState = (await context.storageState()) as PendingChallengePayload["storageState"];
    const payload: PendingChallengePayload = {
      email,
      checkpointUrl: page.url(),
      storageState,
      createdAt: Date.now(),
    };
    return encryptConnectionSecrets(payload);
  } catch {
    return undefined;
  }
}

/**
 * Automates real browser login with full support for LinkedIn Two-Factor Authentication:
 * - "otp": One-time code (LinkedIn sends a code by SMS or email)
 * - "app": LinkedIn app (Approve the sign-in in the mobile app)
 */
export async function extractLinkedInSession({
  email,
  password,
  twoFactorMethod = "otp",
  verificationCode,
  pendingChallengeToken,
  headless = true,
  timeout = 48000,
  onProgress,
}: ExtractOptions): Promise<ExtractedSessionResult> {
  let browser: Browser | null = null;
  onProgress?.("Launching browser engine...");

  try {
    browser = await launchBrowser({ headless });

    let restoredChallenge: PendingChallengePayload | null = null;
    if (pendingChallengeToken) {
      try {
        const parsed = decryptConnectionSecrets<PendingChallengePayload>(pendingChallengeToken);
        // Valid for 15 minutes
        if (parsed && Date.now() - parsed.createdAt < 15 * 60 * 1000) {
          restoredChallenge = parsed;
        }
      } catch {
        restoredChallenge = null;
      }
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: BROWSER_UA,
      ...(restoredChallenge?.storageState ? { storageState: restoredChallenge.storageState } : {}),
    });

    const page = await context.newPage();

    if (restoredChallenge?.checkpointUrl) {
      onProgress?.("Resuming LinkedIn verification session...");
      await page.goto(restoredChallenge.checkpointUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
    } else {
      onProgress?.("Loading LinkedIn login page...");
      await page.goto("https://www.linkedin.com/login", {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });

      onProgress?.("Filling credentials...");
      const emailInput = page
        .locator('input[type="email"]:visible, input[name="session_key"]:visible, #username:visible')
        .first();
      await emailInput.waitFor({ state: "visible", timeout: 15000 });
      await emailInput.fill(email);

      const passInput = page
        .locator(
          'input[type="password"]:visible, input[name="session_password"]:visible, #password:visible'
        )
        .first();
      await passInput.waitFor({ state: "visible", timeout: 15000 });
      await passInput.fill(password);

      onProgress?.("Submitting login form...");
      await passInput.press("Enter");

      await page.waitForTimeout(1200);
      const exactSignInBtn = page.getByRole("button", { name: /^sign in$/i }).first();
      if (await exactSignInBtn.isVisible().catch(() => false)) {
        await exactSignInBtn.click().catch(() => {});
      }
    }

    onProgress?.("Checking LinkedIn authentication & two-factor status...");
    const startTime = Date.now();
    let foundLiAt = "";
    let foundJsessionId = "";
    let codeSubmitted = false;

    while (Date.now() - startTime < timeout) {
      // 1. Check if li_at session cookie has been granted
      const cookies = await context.cookies();
      const liAtCookie = cookies.find((c) => c.name === "li_at");
      const jsessionIdCookie = cookies.find((c) => c.name === "JSESSIONID");

      if (liAtCookie && liAtCookie.value) {
        foundLiAt = liAtCookie.value;
        foundJsessionId = jsessionIdCookie?.value || "";
        break;
      }

      // 2. Check for invalid email/password or invalid OTP code errors
      const bodyText = await page.innerText("body").catch(() => "");
      if (
        bodyText.includes("That's not the right password") ||
        bodyText.includes("Couldn't find a LinkedIn account") ||
        bodyText.includes("Wrong password") ||
        bodyText.includes("Please enter a valid username")
      ) {
        await browser.close();
        return { success: false, error: "Incorrect LinkedIn email or password provided." };
      }

      if (
        codeSubmitted &&
        (bodyText.includes("code you entered is incorrect") ||
          bodyText.includes("expired code") ||
          bodyText.includes("doesn't match") ||
          bodyText.includes("Please enter a valid code"))
      ) {
        const refreshedToken = await createPendingChallengeToken(context, page, email);
        await browser.close();
        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorMethod: "otp",
          pendingChallengeToken: refreshedToken,
          error: "The verification code entered was incorrect or expired. Please try again.",
        };
      }

      const errorElements = await page
        .locator('[role="alert"], #error-for-username, #error-for-password, [data-qa-alert="error"]')
        .all();
      for (const el of errorElements) {
        if (await el.isVisible().catch(() => false)) {
          const txt = (await el.innerText().catch(() => "")).trim();
          if (txt && !txt.toLowerCase().includes("verification")) {
            await browser.close();
            return { success: false, error: txt };
          }
        }
      }

      // 3. Handle 2FA / Checkpoint Challenge
      const checkpoint = await detectCheckpointKind(page);
      if (checkpoint.isCheckpoint) {
        await ensurePreferredTwoFactorMethod(page, twoFactorMethod);
        const updatedCheckpoint = await detectCheckpointKind(page);

        // Case A: User provided a one-time verification code -> fill and submit it now!
        if (verificationCode && verificationCode.trim() && !codeSubmitted) {
          onProgress?.("Submitting one-time verification code...");
          const submitRes = await submitOneTimeCode(page, verificationCode);
          if (submitRes.error) {
            const token = await createPendingChallengeToken(context, page, email);
            await browser.close();
            return {
              success: false,
              requiresTwoFactor: true,
              twoFactorMethod: "otp",
              pendingChallengeToken: token,
              error: submitRes.error,
            };
          }
          codeSubmitted = true;
          await page.waitForTimeout(2000);
          continue;
        }

        // Case B: One-time code (SMS/email) is needed, and user hasn't entered it yet ->
        // Save browser challenge state and immediately prompt user in UI for the code!
        if (
          (twoFactorMethod === "otp" || updatedCheckpoint.hasPinInput) &&
          !verificationCode &&
          !(twoFactorMethod === "app" && updatedCheckpoint.isAppPush)
        ) {
          const token = await createPendingChallengeToken(context, page, email);
          await browser.close();
          return {
            success: false,
            requiresTwoFactor: true,
            twoFactorMethod: "otp",
            challengeMessage: updatedCheckpoint.description,
            pendingChallengeToken: token,
            error: updatedCheckpoint.description,
          };
        }

        // Case C: LinkedIn Mobile App Push Approval ("app") ->
        // Keep polling while user approves sign-in in the LinkedIn mobile app
        onProgress?.("Waiting for you to approve the sign-in in the LinkedIn mobile app...");
      }

      await page.waitForTimeout(1500);
    }

    if (!foundLiAt) {
      const checkpoint = await detectCheckpointKind(page);
      const token = checkpoint.isCheckpoint
        ? await createPendingChallengeToken(context, page, email)
        : undefined;
      await browser.close();

      if (checkpoint.isCheckpoint) {
        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorMethod: twoFactorMethod,
          challengeMessage:
            twoFactorMethod === "app"
              ? "Still waiting for LinkedIn app approval. Approve the sign-in on your phone and click 'Complete Sign-In', or switch to a one-time code."
              : checkpoint.description,
          pendingChallengeToken: token,
          error:
            twoFactorMethod === "app"
              ? "Approve the sign-in in your LinkedIn mobile app, then click 'Complete Sign-In'."
              : "Please enter the one-time code sent by LinkedIn via SMS or email.",
        };
      }

      return {
        success: false,
        error: "Authentication timed out. Please verify your credentials or try again.",
      };
    }

    onProgress?.("Verifying session with LinkedIn Voyager API...");
    const verification = await verifyLinkedInSession(foundLiAt, foundJsessionId);

    await browser.close();

    return {
      success: true,
      li_at: foundLiAt,
      jsessionId: foundJsessionId,
      profile: verification.profile,
    };
  } catch (err: unknown) {
    if (browser) await browser.close().catch(() => {});
    const message = err instanceof Error ? err.message : "Unknown browser automation error";
    return {
      success: false,
      error: `${message}. You can also connect using the 'Paste Cookies' tab with your li_at cookie.`,
    };
  }
}
