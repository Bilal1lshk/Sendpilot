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
//
//  We patch playwright-core's chromium.launch() HERE, before the frozen worker
//  is imported, so every launchBrowser() call in the codebase gets these args.
//
//  Flags explained:
//   --no-sandbox / --disable-setuid-sandbox  required in Docker (no root namespace)
//   --disable-dev-shm-usage                 use /tmp instead of /dev/shm (64 MB)
//   --disable-gpu                           no GPU in a container
//   --disable-extensions                    saves ~20 MB RSS
//   --no-zygote                             prevents forking a zygote process
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

  // @ts-expect-error — intentional monkey-patch to inject Render flags
  chromium.launch = async function renderOptimisedLaunch(
    opts: Parameters<typeof originalLaunch>[0] = {}
  ) {
    const mergedArgs = Array.from(new Set([...(opts?.args ?? []), ...RENDER_CHROMIUM_ARGS]));
    return originalLaunch({ ...opts, headless: true, args: mergedArgs });
  };
}

/**
 * Patches createStealthContext from browser-launcher.ts to always inject
 * blockHeavyResources:true so images/media/fonts are blocked on every context.
 * This reduces renderer RSS on the 512 MB free tier significantly.
 *
 * We patch the ESM live binding BEFORE the frozen worker files import it —
 * the only way to do this without editing any frozen file.
 */
async function patchBrowserLauncher(): Promise<void> {
  const launcher = await import("@/lib/browser-launcher");
  const originalCreateStealthContext = launcher.createStealthContext;

  // @ts-expect-error — intentional patch of ESM live binding
  launcher.createStealthContext = async function renderCreateStealthContext(
    browser: Parameters<typeof originalCreateStealthContext>[0],
    opts: Parameters<typeof originalCreateStealthContext>[1] = {}
  ) {
    return originalCreateStealthContext(browser, {
      ...opts,
      blockHeavyResources: true,
      bandwidthSaver: true,
    });
  };
}

// ─── Boot sequence ─────────────────────────────────────────────────────────────
console.log(
  `[worker/server] SendPilot Render worker starting on PORT=${process.env.PORT} ` +
    `(headless, no-tunnel, max-old-space=${process.env.NODE_OPTIONS ?? "default"})`
);

await patchPlaywrightCore();
await patchBrowserLauncher();

// Dynamic import ensures all patches above are applied BEFORE the frozen
// worker module initialises its http.createServer and imports playwright libs.
await import("../scripts/linkedin-worker.ts");
