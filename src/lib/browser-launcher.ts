import type { Browser, BrowserContext } from "playwright-core";

export interface LaunchBrowserOptions {
  headless?: boolean;
}

export interface StealthContextOptions {
  userAgent?: string;
  blockHeavyResources?: boolean;
  storageState?: {
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
}

const PLAYWRIGHT_REQUIRED_DISABLED_FEATURES = [
  "AvoidUnnecessaryBeforeUnloadCheckSync",
  "DestroyProfileOnBrowserClose",
  "DialMediaRouteProvider",
  "GlobalMediaControls",
  "HttpsUpgrades",
  "LensOverlay",
  "MediaRouter",
  "PaintHolding",
  "ThirdPartyStoragePartitioning",
  "BlockOriginHeaderModificationOnRedirect",
  "AvoidCorsURLLoaderRestartOnRedirect",
  "Translate",
  "AutoDeElevate",
  "OptimizationHints",
  "NetworkTimeServiceQuerying",
  "AimEnabled",
  "msForceBrowserSignIn",
  "msEdgeUpdateLaunchServicesPreferredVersion",
];

/**
 * Builds clean Chromium launch arguments for @sparticuz/chromium (`chrome-headless-shell`)
 * when launched via `playwright-core`:
 * - Strips `--headless='shell'` / `--headless=new` so Playwright's native `--headless` switch
 *   is not overridden with invalid single-quoted `'shell'` or unsupported `new` mode.
 * - Merges `--disable-features` and `--enable-features` so `sparticuz.args` does not overwrite
 *   Playwright's critical `DestroyProfileOnBrowserClose` and redirect flags.
 */
function buildServerlessChromiumArgs(rawSparticuzArgs: string[]): string[] {
  const disabledFeatures = new Set<string>(PLAYWRIGHT_REQUIRED_DISABLED_FEATURES);
  const enabledFeatures = new Set<string>(["CDPScreenshotNewSurface"]);
  const filteredArgs: string[] = [];

  for (const arg of rawSparticuzArgs) {
    if (!arg) continue;
    // Playwright already passes `--headless`; `--headless='shell'` has literal quotes in spawn()
    if (arg === "--headless" || arg.startsWith("--headless=")) {
      continue;
    }
    if (arg.startsWith("--disable-features=")) {
      const list = arg.slice("--disable-features=".length).split(",");
      for (const item of list) {
        const clean = item.trim();
        if (clean) disabledFeatures.add(clean);
      }
      continue;
    }
    if (arg.startsWith("--enable-features=")) {
      const list = arg.slice("--enable-features=".length).split(",");
      for (const item of list) {
        const clean = item.trim();
        if (clean) enabledFeatures.add(clean);
      }
      continue;
    }
    filteredArgs.push(arg);
  }

  return [
    ...filteredArgs,
    `--disable-features=${Array.from(disabledFeatures).join(",")}`,
    `--enable-features=${Array.from(enabledFeatures).join(",")}`,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,800",
  ];
}

/**
 * Launches a Chromium browser instance that works in both:
 * 1. Vercel / AWS Lambda serverless environments (via @sparticuz/chromium + playwright-core)
 * 2. Local development on Windows / macOS / Linux (bundled Chromium, Chrome, or Edge)
 */
export async function launchBrowser(options: LaunchBrowserOptions = {}): Promise<Browser> {
  const isServerless = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.LAMBDA_TASK_ROOT
  );
  const headless = isServerless ? true : (options.headless ?? true);

  const pw = await import("playwright-core");
  const chromium = pw.chromium;

  // 1. Serverless (Vercel / AWS Lambda): use @sparticuz/chromium (chrome-headless-shell)
  if (isServerless) {
    const sparticuzModule = await import("@sparticuz/chromium");
    const sparticuz = sparticuzModule.default || sparticuzModule;

    // Disable SwiftShader WebGL in serverless single-process mode to prevent GPU thread crashes & OOM
    try {
      sparticuz.setGraphicsMode = false;
    } catch {
      // Ignore if read-only in a future version
    }

    const executablePath = await sparticuz.executablePath();
    const serverlessArgs = buildServerlessChromiumArgs(sparticuz.args || []);

    return await chromium.launch({
      args: serverlessArgs,
      executablePath,
      headless: true,
      chromiumSandbox: false,
      timeout: 15000,
    });
  }

  // 2. Local environment: try Playwright's bundled Chromium, then Chrome, then Edge
  const localArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,800",
  ];

  try {
    return await chromium.launch({
      headless,
      args: localArgs,
      timeout: 15000,
    });
  } catch {
    try {
      return await chromium.launch({
        headless,
        channel: "chrome",
        args: localArgs,
        timeout: 15000,
      });
    } catch {
      return await chromium.launch({
        headless,
        channel: "msedge",
        args: localArgs,
        timeout: 15000,
      });
    }
  }
}

/**
 * Creates a stealth BrowserContext without opening/closing any probe page
 * (which would crash `--single-process` Chromium on serverless).
 * Reads `browser.version()` synchronously so the User-Agent matches the real
 * Chromium binary version & platform.
 */
export async function createStealthContext(
  browser: Browser,
  options: StealthContextOptions = {}
): Promise<BrowserContext> {
  const rawVersion = (browser.version() || "").replace(/^.*?\//, "").trim();
  const chromeVersion = /^\d+\./.test(rawVersion) ? rawVersion : "153.0.0.0";
  const isLinux = process.platform === "linux";

  const cleanNativeUa =
    options.userAgent ||
    (isLinux
      ? `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
      : `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: cleanNativeUa,
    locale: "en-US",
    ...(options.storageState ? { storageState: options.storageState } : {}),
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    if (!(window as unknown as Record<string, unknown>).chrome) {
      (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
    }
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
  });

  if (options.blockHeavyResources !== false) {
    await context
      .route("**/*", (route) => {
        const type = route.request().resourceType();
        if (type === "image" || type === "media" || type === "font") {
          return route.abort();
        }
        return route.continue();
      })
      .catch(() => {});
  }

  return context;
}

/**
 * Safely closes a Playwright Browser instance with a strict timeout so
 * `--single-process` Chromium on Vercel/Lambda can never hang until FUNCTION_INVOCATION_TIMEOUT.
 */
export async function safeCloseBrowser(browser: Browser | null | undefined): Promise<void> {
  if (!browser) return;
  try {
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Ignore shutdown errors in serverless single-process mode
  }
}
