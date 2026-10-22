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
 *   4. Monkey-patches playwright-core's chromium.launch() to inject
 *      memory-optimised Render args BEFORE the frozen worker imports it.
 *   5. Monkey-patches createStealthContext() to always block heavy assets.
 */

// Make this a module so top-level await works
export {};

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
//
//  We patch playwright-core's chromium.launch() HERE, before the frozen worker
//  is imported, so every launchBrowser() call in the codebase gets these args.
//
//  Flags explained:
//   --no-sandbox / --disable-setuid-sandbox  required in Docker (no root ns)
//   --disable-dev-shm-usage                 use /tmp instead of /dev/shm (64 MB)
//   --disable-gpu                           no GPU in a container
//   --disable-extensions                    saves ~20 MB RSS
//   --no-zygote                             prevents a forked zygote process
//   --js-flags=--max-old-space-size=192     cap V8 heap inside renderer to 192 MB

const RENDER_CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--no-zygote",
  "--js-flags=--max-old-space-size=192",
];

async function patchPlaywrightCore(): Promise<void> {
  const pw = await import("playwright-core");
  const chromium = pw.chromium;
  const originalLaunch = chromium.launch.bind(chromium);

  // Cast through unknown to avoid TypeScript readonly complaints
  (chromium as unknown as Record<string, unknown>).launch = async function renderOptimisedLaunch(
    opts: Parameters<typeof originalLaunch>[0] = {}
  ) {
    const mergedArgs = Array.from(new Set([...(opts?.args ?? []), ...RENDER_CHROMIUM_ARGS]));
    return originalLaunch({ ...opts, headless: true, args: mergedArgs });
  };
}

// ─── 5. Block heavy assets on every context to cut renderer RSS ───────────────
//
//  browser-launcher.ts already has a route interceptor for images/media/fonts,
//  guarded by `options.blockHeavyResources === true`.  The callers in
//  playwright-linkedin-connect.ts and playwright-linkedin-messaging.ts don't
//  pass that flag (frozen — can't edit).  So we patch createStealthContext()
//  via its ESM live binding to always inject the flag before the frozen files
//  call it.

async function patchBrowserLauncher(): Promise<void> {
  const launcher = await import("@/lib/browser-launcher");
  const originalFn = launcher.createStealthContext;

  // Replace the live binding via the module namespace object
  (launcher as unknown as Record<string, unknown>).createStealthContext =
    async function renderCreateStealthContext(
      browser: Parameters<typeof originalFn>[0],
      opts: Parameters<typeof originalFn>[1] = {}
    ) {
      return originalFn(browser, {
        ...opts,
        blockHeavyResources: true,
        bandwidthSaver: true,
      });
    };
}

// ─── Boot sequence ─────────────────────────────────────────────────────────────
console.log(
  `[worker/server] SendPilot Render worker starting on PORT=${process.env.PORT} ` +
    `(headless, no-tunnel, NODE_OPTIONS=${process.env.NODE_OPTIONS ?? "default"})`
);

await patchPlaywrightCore();
await patchBrowserLauncher();

// Dynamic import ensures all patches above are applied BEFORE the frozen
// worker module initialises its http.createServer and imports playwright libs.
// We strip the .ts extension so allowImportingTsExtensions is not required;
// tsx resolves the file by convention when run from the project root.
await import("../scripts/linkedin-worker");
