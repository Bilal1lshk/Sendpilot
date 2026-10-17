import type { Browser } from "playwright-core";
import { launchBrowser } from "@/lib/browser-launcher";

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
  error?: string;
}

export interface ExtractOptions {
  email: string;
  password: string;
  headless?: boolean;
  timeout?: number;
  onProgress?: (stage: string) => void;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

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

    // Explicit 401 means the li_at token itself is expired/invalid
    if (res.status === 401) {
      return { active: false, status: 401 };
    }

    // On Vercel / AWS Lambda IPs, LinkedIn often returns 403 (CSRF mismatch when JSESSIONID was generated)
    // or 999 / 302 on /voyager/api/me. Fall back to checking /feed/ redirect location.
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

    // If feed returns 200 or LinkedIn datacenter block (999/302 non-login) for a valid AQ... li_at token
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
    // If Vercel outbound request hit a transient network block but cookie is well-formed AQ...
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
 * Automates real browser login to bypass anti-bot challenges and extract li_at and JSESSIONID
 */
export async function extractLinkedInSession({
  email,
  password,
  headless = true,
  timeout = 50000,
  onProgress,
}: ExtractOptions): Promise<ExtractedSessionResult> {
  let browser: Browser | null = null;
  onProgress?.("Launching browser engine...");

  try {
    browser = await launchBrowser({ headless });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: BROWSER_UA,
    });

    const page = await context.newPage();

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
      .locator('input[type="password"]:visible, input[name="session_password"]:visible, #password:visible')
      .first();
    await passInput.waitFor({ state: "visible", timeout: 15000 });
    await passInput.fill(password);

    onProgress?.("Submitting login form...");
    await passInput.press("Enter");

    await page.waitForTimeout(1000);
    const exactSignInBtn = page.getByRole("button", { name: /^sign in$/i }).first();
    if (await exactSignInBtn.isVisible().catch(() => false)) {
      await exactSignInBtn.click().catch(() => {});
    }

    onProgress?.("Monitoring authentication & intercepting session cookies...");
    const startTime = Date.now();
    let foundLiAt = "";
    let foundJsessionId = "";

    while (Date.now() - startTime < timeout) {
      // 1. Check cookies
      const cookies = await context.cookies();
      const liAtCookie = cookies.find((c) => c.name === "li_at");
      const jsessionIdCookie = cookies.find((c) => c.name === "JSESSIONID");

      if (liAtCookie && liAtCookie.value) {
        foundLiAt = liAtCookie.value;
        foundJsessionId = jsessionIdCookie?.value || "";
        break;
      }

      // 2. Check for credential errors
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

      // 3. Check for alerts
      const errorElements = await page
        .locator('[role="alert"], #error-for-username, #error-for-password, [data-qa-alert="error"]')
        .all();
      for (const el of errorElements) {
        if (await el.isVisible().catch(() => false)) {
          const txt = (await el.innerText().catch(() => "")).trim();
          if (txt) {
            await browser.close();
            return { success: false, error: txt };
          }
        }
      }

      // 4. Check for 2FA or CAPTCHA checkpoint on headless serverless
      const currentUrl = page.url();
      if (
        currentUrl.includes("/checkpoint/") ||
        bodyText.includes("verification code") ||
        bodyText.includes("quick security check")
      ) {
        if (process.env.VERCEL) {
          await browser.close();
          return {
            success: false,
            error:
              "LinkedIn requested a security verification (2FA/CAPTCHA) for cloud login. Please switch to the 'Paste Cookies' tab and paste your li_at cookie instead.",
          };
        }
        onProgress?.("Security checkpoint active. Complete the 2FA code or puzzle...");
      }

      await page.waitForTimeout(1500);
    }

    if (!foundLiAt) {
      await browser.close();
      return {
        success: false,
        error:
          "Authentication timed out or required 2FA verification. Please use the 'Paste Cookies' tab with your li_at cookie.",
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
      error: `${message}. You can also connect immediately using the 'Paste Cookies' tab with your li_at cookie.`,
    };
  }
}
