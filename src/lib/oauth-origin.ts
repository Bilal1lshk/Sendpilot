/**
 * Utilities for reliably resolving app origins and OAuth redirect URIs.
 * Prevents localhost development URLs from leaking into production on Vercel.
 */

export function resolveAppOrigin(req?: Request): string {
  // 1. Check standard reverse proxy headers (Vercel, AWS, Cloudflare, etc.)
  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    const host = req.headers.get("host");
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }

    try {
      const parsed = new URL(req.url);
      if (parsed.origin && !parsed.origin.includes("localhost") && !parsed.origin.includes("127.0.0.1")) {
        return parsed.origin;
      }
    } catch {
      // ignore parse failure
    }
  }

  // 2. Check explicit production environment variables (e.g. Vercel)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost") && !process.env.NEXTAUTH_URL.includes("127.0.0.1")) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  // 3. Fallback for production when no headers or env variables are present
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "https://sendpilot-gamma.vercel.app";
  }

  // 4. Local development fallback
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      // ignore
    }
  }
  return "http://localhost:3000";
}

/**
 * Resolves the LinkedIn OAuth redirect URI for account connection.
 * In production, it actively ignores any misconfigured LINKEDIN_REDIRECT_URI
 * pointing to localhost and forces the production origin callback.
 */
export function resolveLinkedInRedirectUri(req: Request, options?: { isManual?: boolean }): string {
  if (options?.isManual) {
    return process.env.LINKEDIN_DEV_REDIRECT_URI || "https://www.linkedin.com/developers/tools/oauth/redirect";
  }

  const origin = resolveAppOrigin(req);
  const isProd =
    Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === "production" ||
    (!origin.includes("localhost") && !origin.includes("127.0.0.1"));

  const envRedirect = process.env.LINKEDIN_REDIRECT_URI?.trim();

  // If in production and env contains localhost, ignore it to prevent broken redirects
  if (envRedirect) {
    const isLocalhostEnv = envRedirect.includes("localhost") || envRedirect.includes("127.0.0.1");
    if (!isProd || !isLocalhostEnv) {
      return envRedirect;
    }
  }

  return `${origin}/api/auth/linkedin/callback`;
}

/**
 * Returns candidate redirect URIs to attempt during token exchange in case of
 * slight mismatch between configured domain and redirect URL.
 */
export function getLinkedInRedirectUriCandidates(primaryUri: string, origin: string): string[] {
  const list = [
    primaryUri,
    `${origin}/api/auth/linkedin/callback`,
    "https://sendpilot-gamma.vercel.app/api/auth/linkedin/callback",
    process.env.LINKEDIN_REDIRECT_URI,
    process.env.LINKEDIN_DEV_REDIRECT_URI,
    "https://www.linkedin.com/developers/tools/oauth/redirect",
  ];

  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    list.push("http://localhost:3000/api/auth/linkedin/callback");
  }

  return Array.from(new Set(list.filter(Boolean).map((u) => u!.trim())));
}
