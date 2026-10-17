import type { Browser, BrowserContext, Page } from "playwright-core";
import { launchBrowser, createStealthContext } from "@/lib/browser-launcher";
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

interface CapturedChallengeForm {
  action: string;
  method: string;
  pinFieldName: string;
  hiddenFields: Record<string, string>;
}

interface PendingChallengePayload {
  email: string;
  checkpointUrl: string;
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
 * Inspects the current page to distinguish between:
 * - Login form (/checkpoint/lg/login or /checkpoint/lg/login-submit)
 * - Bot security puzzle (captchaInternal / "Let's do a quick security check")
 * - Real 2FA Checkpoint (/checkpoint/challenge/... with PIN input or LinkedIn App push)
 */
async function detectCheckpointKind(page: Page, sawCaptchaNetwork = false): Promise<{
  isCheckpoint: boolean;
  isCaptcha: boolean;
  hasPinInput: boolean;
  isAppPush: boolean;
  description: string;
}> {
  const currentUrl = page.url();
  const bodyText = await page.innerText("body").catch(() => "");
  const lowerText = bodyText.toLowerCase();

  // Do NOT treat the login page itself (/checkpoint/lg/login) as a 2FA challenge
  const isLoginUrl =
    currentUrl.includes("/checkpoint/lg/login") ||
    currentUrl.endsWith("/login") ||
    currentUrl.endsWith("/login/");

  const pinLocator = page.locator(PIN_INPUT_SELECTOR).first();
  const hasPinInput = !isLoginUrl && (await pinLocator.isVisible().catch(() => false));

  const captchaFrameCount = await page
    .locator('iframe[src*="captcha"], iframe[src*="arkose"], #captcha-internal')
    .count()
    .catch(() => 0);

  const isCaptcha =
    !hasPinInput &&
    (sawCaptchaNetwork ||
      currentUrl.includes("captchaInternal") ||
      captchaFrameCount > 0 ||
      lowerText.includes("quick security check") ||
      lowerText.includes("verify you are a human"));

  const isAppPush =
    !isCaptcha &&
    (lowerText.includes("linkedin app") ||
      lowerText.includes("open your linkedin") ||
      lowerText.includes("check your phone") ||
      lowerText.includes("tap yes") ||
      lowerText.includes("notification we sent") ||
      lowerText.includes("approve the sign-in") ||
      lowerText.includes("check your mobile"));

  const isCheckpoint =
    !isLoginUrl &&
    !isCaptcha &&
    (currentUrl.includes("/checkpoint/challenge") ||
      hasPinInput ||
      isAppPush ||
      lowerText.includes("verification code") ||
      lowerText.includes("two-step verification") ||
      lowerText.includes("enter the code") ||
      lowerText.includes("we sent a code"));

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
 * Waits until the PIN input field actually renders on the page.
 */
async function ensurePreferredTwoFactorMethod(
  page: Page,
  preferred: TwoFactorMethod
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await detectCheckpointKind(page);
    if (!state.isCheckpoint) return;

    if (preferred === "otp") {
      if (state.hasPinInput) return;

      // 1. If on the LinkedIn App Push screen, click "Try another way" / "Verify using SMS" / "Send code"
      const switchToOtpSelectors = [
        "#try-another-way:visible",
        'button:has-text("Try another way"):visible',
        'a:has-text("Try another way"):visible',
        'button:has-text("Verify with SMS"):visible',
        'a:has-text("Verify with SMS"):visible',
        'button:has-text("Verify using SMS"):visible',
        'a:has-text("Verify using SMS"):visible',
        'button:has-text("Verify with email"):visible',
        'a:has-text("Verify with email"):visible',
        'button:has-text("Send code"):visible',
        'a:has-text("Send code"):visible',
        'button:has-text("Get code"):visible',
        'button:has-text("Use a verification code"):visible',
        'a:has-text("Use a verification code"):visible',
        'form#otp-generation button[type="submit"]:visible',
      ];

      let clicked = false;
      for (const sel of switchToOtpSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click().catch(() => {});
          clicked = true;
          await page.waitForTimeout(2000);
          break;
        }
      }

      // 2. If a radio option for SMS/Email appeared after clicking "Try another way", select it and submit
      const recheck = await detectCheckpointKind(page);
      if (!recheck.hasPinInput) {
        const smsOrEmailRadio = page
          .locator(
            'input[type="radio"][value*="SMS" i], input[type="radio"][value*="EMAIL" i], input[type="radio"][value*="PHONE" i], label:has-text("SMS"), label:has-text("Email")'
          )
          .first();
        if (await smsOrEmailRadio.isVisible().catch(() => false)) {
          await smsOrEmailRadio.click().catch(() => {});
          await page.waitForTimeout(400);
          const submitChoice = page.locator('button[type="submit"]:visible').first();
          if (await submitChoice.isVisible().catch(() => false)) {
            await submitChoice.click().catch(() => {});
            await page.waitForTimeout(2000);
          }
        }
      }

      if (!clicked) {
        await page.waitForTimeout(1200);
      }
    } else if (preferred === "app") {
      if (state.isAppPush) return;
      const appSelectors = [
        'button:has-text("Use LinkedIn app"):visible',
        'a:has-text("Use LinkedIn app"):visible',
        "#try-another-way:visible",
        'button:has-text("Try another way"):visible',
        'a:has-text("Try another way"):visible',
      ];
      for (const sel of appSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click().catch(() => {});
          await page.waitForTimeout(2000);
          break;
        }
      }
      return;
    }
  }
}

/**
 * Captures the active checkpoint <form> action, method, and hidden fields so the
 * one-time code can be submitted reliably even if GET checkpointUrl redirects.
 */
async function captureChallengeForm(page: Page): Promise<CapturedChallengeForm | null> {
  try {
    return await page.evaluate(() => {
      const pinInput =
        document.querySelector<HTMLInputElement>(
          'input[name="pin"], input#input__phone_verification_pin, input#input__email_verification_pin, input#input__totp_verification_pin, input[id*="verification_pin"]'
        );
      const form = pinInput?.closest("form") || document.querySelector<HTMLFormElement>('form[action*="challenge"], form[method="post" i]');
      if (!form) return null;

      const hiddenFields: Record<string, string> = {};
      form.querySelectorAll<HTMLInputElement>("input").forEach((inp) => {
        if (inp.name && inp.type === "hidden") {
          hiddenFields[inp.name] = inp.value || "";
        }
      });

      return {
        action: form.action || window.location.href,
        method: (form.method || "POST").toUpperCase(),
        pinFieldName: pinInput?.name || "pin",
        hiddenFields,
      };
    });
  } catch {
    return null;
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
    .waitFor({ state: "visible", timeout: 6000 })
    .then(() => true)
    .catch(() => false);

  if (visible) {
    await pinInput.click().catch(() => {});
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
    const storageState = (await context.storageState()) as PendingChallengePayload["storageState"];
    const capturedForm = await captureChallengeForm(page);
    const payload: PendingChallengePayload = {
      email,
      checkpointUrl: page.url(),
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
 * Performs the login on https://www.linkedin.com/checkpoint/lg/login using human-paced typing
 * and single form submission to avoid SDUI / PerimeterX captchaInternal blocks.
 */
async function performCheckpointLogin(page: Page, email: string, password: string) {
  await page.goto("https://www.linkedin.com/checkpoint/lg/login", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForTimeout(1000);

  const emailInput = page
    .locator('#username:visible, input[name="session_key"]:visible, input[type="email"]:visible')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.click();
  await emailInput.fill("");
  await emailInput.pressSequentially(email, { delay: 25 });

  const passInput = page
    .locator('#password:visible, input[name="session_password"]:visible, input[type="password"]:visible')
    .first();
  await passInput.waitFor({ state: "visible", timeout: 15000 });
  await passInput.click();
  await passInput.fill("");
  await passInput.pressSequentially(password, { delay: 25 });

  await page.waitForTimeout(400);

  const submitBtn = page
    .locator(
      'form[action*="login-submit"] button[type="submit"]:visible, button[type="submit"]:visible'
    )
    .first();
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
  } else {
    await passInput.press("Enter");
  }

  // Wait for navigation / response after login submit
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
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
  timeout = 45000,
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
        if (parsed && Date.now() - parsed.createdAt < 15 * 60 * 1000) {
          restoredChallenge = parsed;
        }
      } catch {
        restoredChallenge = null;
      }
    }

    const context = await createStealthContext(browser, {
      storageState: restoredChallenge?.storageState,
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
          timeout: 18000,
        })
        .catch(() => {});
      await page.waitForTimeout(1500);

      // If GET on checkpointUrl redirected back to login and we have no captured form, re-login
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
        await browser.close();
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
        .locator("#error-for-username:visible, #error-for-password:visible, [data-qa-alert='error']:visible")
        .all();
      for (const el of errorElements) {
        const txt = (await el.innerText().catch(() => "")).trim();
        if (txt) {
          await browser.close();
          return { success: false, error: txt };
        }
      }

      // 4. Inspect checkpoint / CAPTCHA / 2FA state
      const checkpoint = await detectCheckpointKind(page, sawCaptchaNetwork);

      if (checkpoint.isCaptcha) {
        await browser.close();
        return {
          success: false,
          error:
            "LinkedIn blocked automated cloud login with a bot security puzzle (CAPTCHA), so it did not send a verification code. Please use the 'Paste Cookies' tab and paste your li_at cookie from your browser.",
        };
      }

      if (checkpoint.isCheckpoint || restoredChallenge?.capturedForm) {
        // Ensure LinkedIn is switched to the user's preferred 2FA method (e.g. click "Try another way" -> "Send code")
        if (checkpoint.isCheckpoint) {
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
          await page.waitForLoadState("domcontentloaded", { timeout: 12000 }).catch(() => {});
          await page.waitForTimeout(2500);
          continue;
        }

        // Case B: One-time code is visible on the page (meaning LinkedIn HAS sent the SMS/email code!)
        if (updatedCheckpoint.hasPinInput && !verificationCode) {
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

        // Case C: LinkedIn is showing the Mobile App Push screen ("Check your LinkedIn app")
        // If user selected "otp" and LinkedIn didn't offer an SMS/email fallback on this account,
        // inform the user and switch to app approval or return challenge state after waiting briefly.
        if (updatedCheckpoint.isAppPush && !verificationCode && twoFactorMethod === "otp") {
          const token = await createPendingChallengeToken(context, page, email);
          await browser.close();
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

        // Case D: LinkedIn Mobile App Push Approval ("app") -> keep polling for li_at cookie
        onProgress?.("Waiting for you to approve the sign-in in the LinkedIn mobile app...");
      }

      await page.waitForTimeout(1500);
    }

    if (!foundLiAt) {
      const checkpoint = await detectCheckpointKind(page, sawCaptchaNetwork);
      const token = checkpoint.isCheckpoint
        ? await createPendingChallengeToken(context, page, email)
        : undefined;
      await browser.close();

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
        error: "Authentication timed out. Please verify your credentials or use the 'Paste Cookies' tab.",
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
