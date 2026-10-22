/**
 * worker/server.ts
 *
 * Add-only Render / Docker entry-point that wraps scripts/linkedin-worker.ts.
 *
 * Frozen files — DO NOT touch:
 *   src/lib/linkedin-session-extractor.ts
 *   src/app/api/linkedin/extract-session/route.ts
 *   src/components/dashboard/ConnectLinkedInModal.tsx
 *   src/app/dashboard/accounts/direct-login/page.tsx
 *   src/app/get-started/connect/page.tsx
 *   src/lib/playwright-linkedin-extractor.ts
 *   src/app/api/extractor/linkedin/route.ts
 *   scripts/linkedin-worker.ts  ← parent worker (never edit)
 *
 * What this wrapper adds (without editing anything frozen):
 *   1. Hard crash at boot when LINKEDIN_WORKER_SECRET is missing.
 *   2. Ensures PORT comes from process.env.PORT (Render injects it).
 *   3. Forces AUTO_TUNNEL=false — no localtunnel/cloudflared on Render.
 *   4. Patches Playwright's chromium.launch and newContext to inject
 *      memory-optimised Render args and block heavy media without touching frozen modules.
 */

// ─── 1. Secret guard — crash before spawning any browser ─────────────────────
const secret = process.env.LINKEDIN_WORKER_SECRET?.trim();
if (!secret) {
  console.error(
    "[worker/server] FATAL: LINKEDIN_WORKER_SECRET is not set.\n" +
      "  Set it in the Render dashboard → Environment before deploying.\n" +
      "  Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}

// ─── 2. PORT (Render injects $PORT at runtime; default 10000) ─────────────────
if (!process.env.PORT) {
  process.env.PORT = "10000";
}

// ─── 3. Disable tunnel daemons — not available on a server host ───────────────
process.env.AUTO_TUNNEL = "false";

// ─── 4. Memory-optimised Chromium launch flags for 512 MB Render free tier ────
const RENDER_CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--no-zygote",
  "--single-process",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-ipc-flooding-protection",
  "--js-flags=--max-old-space-size=192",
];

async function patchPlaywrightCore(): Promise<void> {
  const pw = await import("playwright-core");
  const chromium = pw.chromium;
  const originalLaunch = chromium.launch.bind(chromium);

  // Patch chromium.launch to inject low-memory flags and route interception
  // @ts-expect-error monkey-patching launch
  chromium.launch = async function renderOptimisedLaunch(
    opts: Parameters<typeof originalLaunch>[0] = {}
  ) {
    const mergedArgs = Array.from(new Set([...(opts?.args ?? []), ...RENDER_CHROMIUM_ARGS]));
    const browser = await originalLaunch({ ...opts, headless: true, args: mergedArgs });

    // Intercept newContext on the returned browser to automatically block heavy media
    const originalNewContext = browser.newContext.bind(browser);
    // @ts-expect-error monkey-patching newContext
    browser.newContext = async function renderNewContext(contextOpts: Parameters<typeof originalNewContext>[0]) {
      const context = await originalNewContext(contextOpts);

      // Block images, media, and fonts on non-essential domains to stay within 512 MB RAM
      await context
        .route("**/*", (route) => {
          const type = route.request().resourceType();
          const url = route.request().url().toLowerCase();

          const isEssential =
            url.includes("linkedin.com") ||
            url.includes("licdn.com") ||
            url.includes("arkose") ||
            url.includes("recaptcha") ||
            url.includes("checkpoint") ||
            url.includes("challenge");

          if (!isEssential && ["image", "media", "font"].includes(type)) {
            return route.abort();
          }
          return route.continue();
        })
        .catch(() => {});

      return context;
    };

    return browser;
  };
}

// ─── Boot sequence ─────────────────────────────────────────────────────────────
async function main() {
  console.log(
    `[worker/server] SendPilot Render worker starting on PORT=${process.env.PORT} ` +
      `(headless, no-tunnel, NODE_OPTIONS=${process.env.NODE_OPTIONS ?? "default"})`
  );

  await patchPlaywrightCore();

  // Dynamic import ensures all patches above are applied BEFORE the frozen
  // worker module initialises its http.createServer and imports playwright libs.
  await import("../scripts/linkedin-worker");
}

main().catch((err) => {
  console.error("[worker/server] Boot error:", err);
  process.exit(1);
});
