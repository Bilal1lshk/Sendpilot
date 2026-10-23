export const LINKEDIN_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

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
        "User-Agent": LINKEDIN_BROWSER_USER_AGENT,
        Accept: "application/vnd.linkedin.normalized+json+2.1",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const resSetCookie = (res.headers.get("set-cookie") || "").toLowerCase();
    if (resSetCookie.includes("delete me")) {
      return {
        active: false,
        status: 401,
        error: "LinkedIn session cookie was revoked by LinkedIn (delete me).",
      };
    }

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

    if (res.status === 401 || res.status === 403) {
      return { active: false, status: res.status, error: "Unauthorized session credentials." };
    }

    const feedRes = await fetch("https://www.linkedin.com/feed/", {
      redirect: "manual",
      headers: {
        Cookie: `li_at=${cleanLiAt}; JSESSIONID="${cleanCsrf}"`,
        "User-Agent": LINKEDIN_BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const feedSetCookie = (feedRes.headers.get("set-cookie") || "").toLowerCase();
    if (feedSetCookie.includes("delete me")) {
      return {
        active: false,
        status: 401,
        error: "LinkedIn session cookie was revoked by LinkedIn (delete me).",
      };
    }

    const location = (feedRes.headers.get("location") || "").toLowerCase();
    if (
      location.includes("/login") ||
      location.includes("/uas/login") ||
      location.includes("/authwall") ||
      location.includes("/checkpoint") ||
      location.includes("/feed") ||
      location.includes("/voyager/api/me")
    ) {
      return { active: false, status: 401, error: "Session redirected away from feed." };
    }

    if (feedRes.status === 200) {
      const html = await feedRes.text().catch(() => "");
      const firstName = html.match(/"firstName"\s*:\s*"([^"]+)"/)?.[1] || "";
      const lastName = html.match(/"lastName"\s*:\s*"([^"]+)"/)?.[1] || "";
      const headline = html.match(/"occupation"\s*:\s*"([^"]+)"/)?.[1] || "";

      return {
        active: true,
        status: 200,
        profile: { firstName, lastName, headline },
      };
    }

    return {
      active: false,
      status: feedRes.status || res.status,
      error: "Session verification failed.",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error during verification";
    return { active: false, error: message };
  }
}
