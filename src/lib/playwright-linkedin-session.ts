import type { BrowserContext, Page, Response } from "playwright-core";

export interface LinkedInSessionCredentials {
  liAt: string;
  jsessionId?: string;
}

export function cleanCookieValue(raw: string, cookieName: string): string {
  let val = raw.trim();
  const namedMatch = val.match(new RegExp(`(?:^|;\\s*)${cookieName}\\s*=\\s*([^;]+)`, "i"));
  if (namedMatch?.[1]) {
    val = namedMatch[1].trim();
  } else {
    const prefixRegex = new RegExp(`^${cookieName}\\s*=\\s*`, "i");
    val = val.replace(prefixRegex, "").replace(/;.*$/, "").trim();
  }
  return val.replace(/^["']+|["']+$/g, "").trim();
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
      targetUrl = `https://www.linkedin.com/in/${slug}`;
    }
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname === "linkedin.com") {
      parsed.hostname = "www.linkedin.com";
    }
    // Profile canonical URLs on LinkedIn do not have a trailing slash
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.hostname}${cleanPath}`;
  } catch {
    return targetUrl.replace(/\/+$/, "");
  }
}

/**
 * Builds resilient LinkedIn cookies:
 * - Uses .www.linkedin.com for li_at and JSESSIONID to match LinkedIn's Set-Cookie domain
 *   and prevent duplicate/stale .linkedin.com cookies from causing 302 redirect loops
 * - SameSite explicitly set to "Lax"
 * - Auto-generates standard JSESSIONID / CSRF token if missing
 */
export function buildLinkedInCookies(cleanLiAt: string, rawJSession?: string) {
  const sanitizedLiAt = cleanCookieValue(cleanLiAt, "li_at");
  const cleanJSessionRaw = rawJSession
    ? cleanCookieValue(rawJSession, "JSESSIONID")
    : "";

  const csrfToken =
    cleanJSessionRaw ||
    `ajax:${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

  const bcookieVal = `v=2&${Date.now()}`;

  const cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Lax";
  }> = [
    {
      name: "li_at",
      value: sanitizedLiAt,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "JSESSIONID",
      value: `"${csrfToken}"`,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "lang",
      value: "v=2&lang=en-us",
      domain: ".linkedin.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "liap",
      value: "true",
      domain: ".linkedin.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "bcookie",
      value: bcookieVal,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ];

  return { cookies, csrfToken };
}

/**
 * Injects session cookies and anti-webdriver evasions without clobbering
 * the matching User-Agent / Client Hints configured by createStealthContext.
 */
export async function setupLinkedInContext(
  context: BrowserContext,
  page: Page,
  session: LinkedInSessionCredentials
): Promise<string> {
  const cleanLiAt = cleanCookieValue(session.liAt, "li_at");
  const { cookies, csrfToken } = buildLinkedInCookies(cleanLiAt, session.jsessionId);

  await context.addCookies(cookies);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // @ts-expect-error chrome polyfill for stealth
    if (!window.chrome) window.chrome = { runtime: {} };
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
): Promise<{ ok: boolean; error?: string; requiresReconnect?: boolean }> {
  let cookieRevoked = false;

  const onResponse = async (response: Response) => {
    try {
      const url = response.url().toLowerCase();
      // Only examine responses from core LinkedIn domains
      if (
        (!url.includes("linkedin.com") && !url.includes("www.linkedin.com")) ||
        url.includes("px.ads.linkedin.com") ||
        url.includes("licdn.com") ||
        url.includes("doubleclick")
      ) {
        return;
      }

      const headers = response.headers();
      const setCookieList = await response.headerValues("set-cookie").catch(() => [
        headers["set-cookie"] || "",
      ]);
      const setCookieCombined = setCookieList.join("\n").toLowerCase();

      // Only flag revocation if LinkedIn explicitly deletes the li_at session cookie
      if (
        setCookieCombined.includes("li_at=delete me") ||
        setCookieCombined.includes("li_at=delete%20me") ||
        setCookieCombined.includes('li_at=""')
      ) {
        cookieRevoked = true;
      }
    } catch {}
  };

  page.on("response", onResponse);

  try {
    const res = await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    page.off("response", onResponse);

    const currentUrl = page.url().toLowerCase();

    // Verify whether the browser context still holds an active, valid li_at cookie
    const cookies = await page.context().cookies().catch(() => []);
    const activeLiAt = cookies.find((c) => c.name === "li_at");
    const hasValidCookie = Boolean(
      activeLiAt?.value &&
      activeLiAt.value.length > 25 &&
      !activeLiAt.value.toLowerCase().includes("delete me")
    );

    const isLoginPage =
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint") ||
      currentUrl.includes("/uas/");

    if (isLoginPage) {
      // If feed encountered an authwall or checkpoint, but the li_at session cookie is still valid and not explicitly /login,
      // allow the process to continue to the target URL rather than terminating early
      if (hasValidCookie && !currentUrl.includes("/login")) {
        return { ok: true };
      }

      return {
        ok: false,
        requiresReconnect: true,
        error:
          "LinkedIn redirected this session to an authentication or checkpoint page. Please reconnect your LinkedIn account.",
      };
    }

    const status = res?.status() || 200;

    if (status === 401 || (cookieRevoked && !hasValidCookie)) {
      return {
        ok: false,
        requiresReconnect: true,
        error:
          "LinkedIn rejected the current account session (cookie was revoked or logged out). Please reconnect your LinkedIn account using Paste Cookies.",
      };
    }

    if (status === 999 || status === 403 || status === 429) {
      return {
        ok: false,
        error:
          status === 429
            ? "LinkedIn is temporarily rate limiting the session check. Please wait and retry extraction."
            : "LinkedIn temporarily blocked the session check. Please retry extraction; the account was not marked expired.",
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    page.off("response", onResponse);
    const msg = err instanceof Error ? err.message : String(err);

    const currentUrl = page.url().toLowerCase();
    const isLoginPage =
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint") ||
      currentUrl.includes("/uas/login");

    if (isLoginPage) {
      return {
        ok: false,
        requiresReconnect: true,
        error:
          "Your LinkedIn session cookie was revoked by LinkedIn. Please reconnect your LinkedIn account using the Paste Cookies tab.",
      };
    }

    if (msg.includes("status 999")) {
      return {
        ok: false,
        error:
          "LinkedIn temporarily blocked the session check (HTTP 999). Please retry extraction; the account was not marked expired.",
      };
    }

    // If /feed/ hit a non-revoked redirect loop or transient timeout, proceed to the target URL rather than aborting early
    return { ok: true };
  }
}
