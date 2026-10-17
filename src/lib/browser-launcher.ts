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
    // Strip flags that break Same-Origin Policy checks inside PerimeterX / reCAPTCHA iframes or disable WebGL
    if (
      arg === "--disable-web-security" ||
      arg === "--allow-running-insecure-content" ||
      arg === "--disable-webgl"
    ) {
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

    // Keep graphicsMode enabled so WebGL works (required by LinkedIn anti-bot checks)
    try {
      sparticuz.setGraphicsMode = true;
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
 * Reads `browser.version()` synchronously so the User-Agent and Client Hints
 * match the real Chromium binary version & platform without exposing HeadlessChrome or SwiftShader.
 */
export async function createStealthContext(
  browser: Browser,
  options: StealthContextOptions = {}
): Promise<BrowserContext> {
  const rawVersion = (browser.version() || "").replace(/^.*?\//, "").trim();
  const chromeVersion = /^\d+\./.test(rawVersion) ? rawVersion : "153.0.0.0";
  const majorVersion = chromeVersion.split(".")[0] || "153";
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
    extraHTTPHeaders: {
      "sec-ch-ua": `"Google Chrome";v="${majorVersion}", "Chromium";v="${majorVersion}", "Not_A Brand";v="24"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": isLinux ? '"Linux"' : '"Windows"',
    },
    ...(options.storageState ? { storageState: options.storageState } : {}),
  });

  await context.addInitScript(
    ({ major, fullVer, linux }: { major: string; fullVer: string; linux: boolean }) => {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        get: () => false,
        configurable: true,
      });

      const win = window as unknown as Record<string, unknown>;
      if (!win.chrome) {
        win.chrome = {
          app: { isInstalled: false },
          runtime: {},
          csi: () => ({}),
          loadTimes: () => ({}),
        };
      }

      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
      Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });

      // Replace HeadlessChrome in navigator.userAgentData across main frame & cross-origin iframes
      const brands = [
        { brand: "Google Chrome", version: major },
        { brand: "Chromium", version: major },
        { brand: "Not_A Brand", version: "24" },
      ];
      const platformName = linux ? "Linux" : "Windows";
      const uaData = {
        brands,
        mobile: false,
        platform: platformName,
        toJSON: () => ({ brands, mobile: false, platform: platformName }),
        getHighEntropyValues: async (hints: string[]) => {
          const out: Record<string, unknown> = {
            brands,
            mobile: false,
            platform: platformName,
          };
          if (Array.isArray(hints)) {
            if (hints.includes("architecture")) out.architecture = "x86";
            if (hints.includes("bitness")) out.bitness = "64";
            if (hints.includes("model")) out.model = "";
            if (hints.includes("platformVersion"))
              out.platformVersion = linux ? "6.1.0" : "15.0.0";
            if (hints.includes("uaFullVersion")) out.uaFullVersion = fullVer;
            if (hints.includes("fullVersionList")) {
              out.fullVersionList = [
                { brand: "Google Chrome", version: fullVer },
                { brand: "Chromium", version: fullVer },
                { brand: "Not_A Brand", version: "24.0.0.0" },
              ];
            }
          }
          return out;
        },
      };
      try {
        Object.defineProperty(Navigator.prototype, "userAgentData", {
          get: () => uaData,
          configurable: true,
        });
      } catch {
        // Ignore if non-configurable
      }

      // Spoof SwiftShader WebGL vendor/renderer so anti-bot iframes see standard Intel hardware GPU
      const spoofedVendor = "Google Inc. (Intel)";
      const spoofedRenderer = linux
        ? "ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.6)"
        : "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";

      const patchWebGL = (proto: { getParameter?: (p: number) => unknown } | undefined) => {
        if (!proto || typeof proto.getParameter !== "function") return;
        const orig = proto.getParameter;
        const wrapped = function (this: unknown, param: number) {
          if (param === 37445) return spoofedVendor;
          if (param === 37446) return spoofedRenderer;
          return orig.call(this, param);
        };
        Object.defineProperty(wrapped, "toString", {
          value: () => "function getParameter() { [native code] }",
        });
        proto.getParameter = wrapped;
      };

      if (typeof WebGLRenderingContext !== "undefined") {
        patchWebGL(WebGLRenderingContext.prototype);
      }
      if (typeof WebGL2RenderingContext !== "undefined") {
        patchWebGL(WebGL2RenderingContext.prototype);
      }
    },
    { major: majorVersion, fullVer: chromeVersion, linux: isLinux }
  );

  if (options.blockHeavyResources === true) {
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
