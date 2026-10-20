import type { BrowserContext, Page } from "playwright-core";

export interface LinkedInSessionCredentials {
  liAt: string;
  jsessionId?: string;
}

export function cleanCookieValue(raw: string, cookieName: string): string {
  let val = raw.trim();
  const prefixRegex = new RegExp(`^${cookieName}\\s*=\\s*`, "i");
  val = val.replace(prefixRegex, "").replace(/;.*$/, "").trim();
  return val;
}

/**
 * Normalizes a LinkedIn profile URL:
 * - Prepends https:// if missing
 * - Rewrites apex linkedin.com to www.linkedin.com to avoid an extra 301 hop
 * - Strips tracking query parameters
 * - Ensures a clean trailing slash
 */
export function normalizeLinkedInProfileUrl(profileUrl: string): string {
  let targetUrl = profileUrl.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    if (targetUrl.includes("linkedin.com/")) {
      targetUrl = `https://${targetUrl}`;
    } else {
      const slug = targetUrl.replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-");
      targetUrl = `https://www.linkedin.com/in/${slug}/`;
    }
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname === "linkedin.com") {
      parsed.hostname = "www.linkedin.com";
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.hostname}${cleanPath}/`;
  } catch {
    return targetUrl;
  }
}

/**
 * Builds resilient LinkedIn cookies:
 * - Domain set to .linkedin.com and .www.linkedin.com
 * - SameSite explicitly set to "Lax" (browser default, avoids cross-site rejection)
 * - Auto-generates standard JSESSIONID / CSRF token if missing
 * - Adds edge routing and language cookies (bcookie, bscookie, lang, liap)
 */
export function buildLinkedInCookies(cleanLiAt: string, rawJSession?: string) {
  const cleanJSessionRaw = rawJSession
    ? cleanCookieValue(rawJSession, "JSESSIONID").replace(/^"+|"+$/g, "")
    : "";

  const csrfToken =
    cleanJSessionRaw ||
    `ajax:${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

  const bcookieVal = `v=2&${Date.now()}`;

  const domains = [".linkedin.com", ".www.linkedin.com"];
  const cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Lax";
  }> = [];

  for (const domain of domains) {
    cookies.push(
      {
        name: "li_at",
        value: cleanLiAt,
        domain,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "JSESSIONID",
        value: `"${csrfToken}"`,
        domain,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "lang",
        value: "v=2&lang=en-us",
        domain,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "liap",
        value: "true",
        domain,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "bcookie",
        value: bcookieVal,
        domain,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "bscookie",
        value: bcookieVal,
        domain,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      }
    );
  }

  return { cookies, csrfToken };
}

/**
 * Injects session cookies, browser headers, and anti-webdriver evasions.
 */
export async function setupLinkedInContext(
  context: BrowserContext,
  page: Page,
  session: LinkedInSessionCredentials
): Promise<string> {
  const cleanLiAt = cleanCookieValue(session.liAt, "li_at");
  const { cookies, csrfToken } = buildLinkedInCookies(cleanLiAt, session.jsessionId);

  await context.addCookies(cookies);

  await context.setExtraHTTPHeaders({
    "csrf-token": csrfToken,
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua":
      '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-expect-error chrome polyfill for stealth
    window.chrome = { runtime: {} };
  });

  return csrfToken;
}

/**
 * Pre-flights navigation to LinkedIn feed before accessing deep URLs.
 * This primes Akamai/Cloudflare edge session affinity, fetches the routing cookie `lidc`,
 * and avoids ERR_TOO_MANY_REDIRECTS when navigating directly to vanity URLs (/in/...).
 */
export async function warmupLinkedInSession(
  page: Page,
  timeoutMs = 25000
): Promise<{ ok: boolean; error?: string }> {
  try {
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    const currentUrl = page.url().toLowerCase();

    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint") ||
      currentUrl.includes("/uas/")
    ) {
      return {
        ok: false,
        error:
          "LinkedIn session cookie (li_at) is invalid, expired, or blocked by LinkedIn checkpoint. Please reconnect your LinkedIn account with a fresh session.",
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR_TOO_MANY_REDIRECTS")) {
      return {
        ok: false,
        error:
          "LinkedIn session cookie (li_at) is invalid or expired (caused an infinite redirect loop). Please re-authenticate your LinkedIn account.",
      };
    }
    // If feed warmup experienced a minor DOM timeout, session cookies are still injected; continue to target
    return { ok: true };
  }
}
