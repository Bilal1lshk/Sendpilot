import type { Browser, BrowserContext } from "playwright-core";
import { createHash } from "node:crypto";

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  sessionId?: string;
  country?: string;
}

export interface RegionalSettings {
  country: string;
  timezoneId: string;
  locale: string;
  acceptLanguage: string;
  geolocation?: { latitude: number; longitude: number };
}

export interface AccountFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  timezoneId: string;
  locale: string;
  acceptLanguage: string;
  webglVendor: string;
  webglRenderer: string;
  geolocation?: { latitude: number; longitude: number };
}

export interface CategorizedProxyError {
  code: "PROXY_AUTH_FAILED" | "PROXY_CONNECT_FAILED" | "PROXY_TIMEOUT" | "PROXY_ERROR";
  stage: string;
  message: string;
  hint: string;
}

export interface LaunchBrowserOptions {
  headless?: boolean;
  proxy?: ProxyConfig;
}

export interface StealthContextOptions {
  userAgent?: string;
  blockHeavyResources?: boolean;
  bandwidthSaver?: boolean;
  proxyConfig?: ProxyConfig;
  fingerprint?: AccountFingerprint;
  onBandwidthUpdate?: (bytes: number) => void;
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

const REGIONAL_SETTINGS_MAP: Record<string, RegionalSettings> = {
  US: {
    country: "US",
    timezoneId: "America/New_York",
    locale: "en-US",
    acceptLanguage: "en-US,en;q=0.9",
    geolocation: { latitude: 40.7128, longitude: -74.006 },
  },
  PK: {
    country: "PK",
    timezoneId: "Asia/Karachi",
    locale: "en-PK",
    acceptLanguage: "en-PK,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: 31.5204, longitude: 74.3587 },
  },
  GB: {
    country: "GB",
    timezoneId: "Europe/London",
    locale: "en-GB",
    acceptLanguage: "en-GB,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: 51.5074, longitude: -0.1278 },
  },
  UK: {
    country: "GB",
    timezoneId: "Europe/London",
    locale: "en-GB",
    acceptLanguage: "en-GB,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: 51.5074, longitude: -0.1278 },
  },
  CA: {
    country: "CA",
    timezoneId: "America/Toronto",
    locale: "en-CA",
    acceptLanguage: "en-CA,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: 43.6532, longitude: -79.3832 },
  },
  AU: {
    country: "AU",
    timezoneId: "Australia/Sydney",
    locale: "en-AU",
    acceptLanguage: "en-AU,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: -33.8688, longitude: 151.2093 },
  },
  DE: {
    country: "DE",
    timezoneId: "Europe/Berlin",
    locale: "de-DE",
    acceptLanguage: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    geolocation: { latitude: 52.52, longitude: 13.405 },
  },
  FR: {
    country: "FR",
    timezoneId: "Europe/Paris",
    locale: "fr-FR",
    acceptLanguage: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    geolocation: { latitude: 48.8566, longitude: 2.3522 },
  },
  AE: {
    country: "AE",
    timezoneId: "Asia/Dubai",
    locale: "en-AE",
    acceptLanguage: "en-AE,en-US;q=0.9,ar;q=0.8",
    geolocation: { latitude: 25.2048, longitude: 55.2708 },
  },
  IN: {
    country: "IN",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    acceptLanguage: "en-IN,en-US;q=0.9,en;q=0.8",
    geolocation: { latitude: 19.076, longitude: 72.8777 },
  },
};

export function getRegionalSettings(countryCode?: string): RegionalSettings {
  const code = (countryCode || process.env.PROXY_COUNTRY || "US").trim().toUpperCase();
  return (
    REGIONAL_SETTINGS_MAP[code] || {
      country: code,
      timezoneId: "America/New_York",
      locale: "en-US",
      acceptLanguage: "en-US,en;q=0.9",
      geolocation: { latitude: 40.7128, longitude: -74.006 },
    }
  );
}

/**
 * Builds a deterministic, per-account sticky residential proxy configuration.
 * When PROXY_SERVER is unset, returns undefined so local development runs direct.
 */
export function resolveAccountProxy(
  accountIdentifier?: string,
  existingSessionId?: string
): ProxyConfig | undefined {
  const server = process.env.PROXY_SERVER?.trim();
  if (!server) return undefined;

  const rawUser = process.env.PROXY_USER?.trim() || "";
  const rawPass = process.env.PROXY_PASS?.trim() || "";
  const country = (process.env.PROXY_COUNTRY?.trim() || "US").toLowerCase();

  // Create or reuse deterministic sticky session id for this account
  const sessionId =
    existingSessionId ||
    (accountIdentifier
      ? createHash("sha256").update(accountIdentifier.trim().toLowerCase()).digest("hex").slice(0, 10)
      : createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 10));

  // Configurable template (e.g. "{user}-country-{country}-session-{session}")
  const template =
    process.env.PROXY_USER_TEMPLATE?.trim() || "{user}-country-{country}-session-{session}";

  let username = template
    .replace(/\{user\}/g, rawUser)
    .replace(/\{session\}/g, sessionId);

  if (country) {
    username = username.replace(/\{country\}/g, country);
  } else {
    // Strip empty country segment if country is not specified
    username = username
      .replace(/-country-\{country\}/g, "")
      .replace(/-zone-country-\{country\}/g, "")
      .replace(/\{country\}/g, "");
  }

  return {
    server,
    username: rawUser ? username : undefined,
    password: rawPass || undefined,
    sessionId,
    country: country.toUpperCase(),
  };
}

/**
 * Categorizes proxy connection or authentication errors into actionable codes.
 */
export function categorizeProxyError(err: unknown, stage = "browser_launch"): CategorizedProxyError | null {
  if (!err) return null;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  if (
    msg.includes("407") ||
    msg.includes("proxy authentication") ||
    msg.includes("err_proxy_auth") ||
    msg.includes("proxy auth")
  ) {
    return {
      code: "PROXY_AUTH_FAILED",
      stage,
      message: "Residential proxy authentication failed (407). Check PROXY_USER and PROXY_PASS.",
      hint: "Verify your residential proxy credentials in your Vercel or environment configuration.",
    };
  }

  if (
    msg.includes("err_proxy_connection_failed") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("ehostunreach") ||
    msg.includes("proxy connection failed")
  ) {
    return {
      code: "PROXY_CONNECT_FAILED",
      stage,
      message: "Unable to establish connection to the residential proxy server.",
      hint: "Verify that PROXY_SERVER hostname, port, and IP whitelisting are correctly configured.",
    };
  }

  if (
    msg.includes("err_timed_out") ||
    msg.includes("etimedout") ||
    msg.includes("timeout") ||
    msg.includes("proxy timed out")
  ) {
    return {
      code: "PROXY_TIMEOUT",
      stage,
      message: "The residential proxy connection timed out.",
      hint: "Check proxy latency or choose a different residential proxy country location.",
    };
  }

  return null;
}

/**
 * Returns a stable, deterministic hardware & environment fingerprint per account.
 * Reuses existing MongoDB fingerprint if present, or generates a stable fingerprint seeded by account identity.
 */
export function getOrGenerateAccountFingerprint(
  accountIdentifier: string,
  countryCode?: string,
  existing?: AccountFingerprint
): AccountFingerprint {
  if (existing?.userAgent && existing?.timezoneId && existing?.locale && existing?.webglRenderer) {
    return existing;
  }

  const region = getRegionalSettings(countryCode);
  const seed = createHash("sha256").update(accountIdentifier.trim().toLowerCase()).digest();

  const isLinux = process.platform === "linux";
  const chromeVersion = "153.0.0.0";
  const userAgent = isLinux
    ? `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
    : `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

  // Deterministically select viewport from common desktop resolutions
  const viewports = [
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
  ];
  const viewport = viewports[seed[0] % viewports.length];

  const webglVendor = "Google Inc. (Intel)";
  const webglRenderer = isLinux
    ? "ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.6)"
    : "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)";

  return {
    userAgent,
    viewport,
    timezoneId: region.timezoneId,
    locale: region.locale,
    acceptLanguage: region.acceptLanguage,
    webglVendor,
    webglRenderer,
    geolocation: region.geolocation,
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

    const launchOptions: {
      args: string[];
      executablePath: string;
      headless: boolean;
      chromiumSandbox: boolean;
      timeout: number;
      proxy?: { server: string; username?: string; password?: string };
    } = {
      args: serverlessArgs,
      executablePath,
      headless: true,
      chromiumSandbox: false,
      timeout: 15000,
    };

    if (options.proxy?.server) {
      launchOptions.proxy = {
        server: options.proxy.server,
        username: options.proxy.username,
        password: options.proxy.password,
      };
    }

    return await chromium.launch(launchOptions);
  }

  // 2. Local environment: try Playwright's bundled Chromium, then Chrome, then Edge
  const localArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,800",
  ];

  const proxyOption = options.proxy?.server
    ? {
        server: options.proxy.server,
        username: options.proxy.username,
        password: options.proxy.password,
      }
    : undefined;

  try {
    return await chromium.launch({
      headless,
      args: localArgs,
      timeout: 15000,
      proxy: proxyOption,
    });
  } catch {
    try {
      return await chromium.launch({
        headless,
        channel: "chrome",
        args: localArgs,
        timeout: 15000,
        proxy: proxyOption,
      });
    } catch {
      return await chromium.launch({
        headless,
        channel: "msedge",
        args: localArgs,
        timeout: 15000,
        proxy: proxyOption,
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

  const regional = getRegionalSettings(options.proxyConfig?.country);
  const timezoneId = options.fingerprint?.timezoneId || regional.timezoneId;
  const locale = options.fingerprint?.locale || regional.locale;
  const acceptLanguage = options.fingerprint?.acceptLanguage || regional.acceptLanguage;
  const viewport = options.fingerprint?.viewport || { width: 1280, height: 800 };
  const geolocation = options.fingerprint?.geolocation || regional.geolocation;

  const cleanNativeUa =
    options.fingerprint?.userAgent ||
    options.userAgent ||
    (isLinux
      ? `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
      : `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);

  const context = await browser.newContext({
    viewport,
    userAgent: cleanNativeUa,
    locale,
    timezoneId,
    geolocation,
    extraHTTPHeaders: {
      "sec-ch-ua": `"Google Chrome";v="${majorVersion}", "Chromium";v="${majorVersion}", "Not_A Brand";v="24"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": isLinux ? '"Linux"' : '"Windows"',
      "Accept-Language": acceptLanguage,
    },
    ...(options.storageState ? { storageState: options.storageState } : {}),
  });

  const spoofedVendor = options.fingerprint?.webglVendor || "Google Inc. (Intel)";
  const spoofedRenderer =
    options.fingerprint?.webglRenderer ||
    (isLinux
      ? "ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.6)"
      : "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)");

  await context.addInitScript(
    ({
      major,
      fullVer,
      linux,
      userLocale,
      vendorStr,
      rendererStr,
    }: {
      major: string;
      fullVer: string;
      linux: boolean;
      userLocale: string;
      vendorStr: string;
      rendererStr: string;
    }) => {
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

      Object.defineProperty(navigator, "languages", { get: () => [userLocale, "en-US", "en"] });
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
      const patchWebGL = (proto: { getParameter?: (p: number) => unknown } | undefined) => {
        if (!proto || typeof proto.getParameter !== "function") return;
        const orig = proto.getParameter;
        const wrapped = function (this: unknown, param: number) {
          if (param === 37445) return vendorStr;
          if (param === 37446) return rendererStr;
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
    {
      major: majorVersion,
      fullVer: chromeVersion,
      linux: isLinux,
      userLocale: locale,
      vendorStr: spoofedVendor,
      rendererStr: spoofedRenderer,
    }
  );

  // Bandwidth tracking: record transferred bytes per login session
  let totalBytes = 0;
  context.on("response", (res) => {
    try {
      const cl = res.headers()["content-length"];
      if (cl) {
        const n = parseInt(cl, 10);
        if (!isNaN(n) && n > 0) {
          totalBytes += n;
          options.onBandwidthUpdate?.(totalBytes);
        }
      }
    } catch {
      // ignore response tracking errors
    }
  });

  // Bandwidth saving route interception:
  // Blocks heavy media/images/fonts on non-LinkedIn, non-challenge third-party domains
  // while preserving essential Arkose, reCAPTCHA, and LinkedIn checkpoint assets.
  if (options.bandwidthSaver === true || options.blockHeavyResources === true) {
    await context
      .route("**/*", (route) => {
        const req = route.request();
        const type = req.resourceType();
        const url = req.url().toLowerCase();

        const isEssentialAsset =
          url.includes("linkedin.com") ||
          url.includes("licdn.com") ||
          url.includes("arkoselabs") ||
          url.includes("arkose") ||
          url.includes("funcaptcha") ||
          url.includes("protechts.net") ||
          url.includes("recaptcha") ||
          url.includes("google.com") ||
          url.includes("gstatic.com") ||
          url.includes("cloudflare.com") ||
          url.includes("/checkpoint/") ||
          url.includes("/challenge/") ||
          url.includes("captcha");

        if (!isEssentialAsset && (type === "image" || type === "media" || type === "font")) {
          return route.abort();
        }
        return route.continue();
      })
      .catch(() => {});
  }

  return context;
}

/**
 * Debug-only check that loads an IP-echo page through the proxy and reports
 * the outbound IP, country, and timezone. Disabled in production unless DEBUG_PROXY=true.
 */
export async function verifyProxyConnection(
  browser: Browser,
  proxy?: ProxyConfig
): Promise<{ ip: string; country?: string; timezone?: string } | null> {
  if (process.env.NODE_ENV === "production" && process.env.DEBUG_PROXY !== "true") {
    return null;
  }
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext();
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    const res = await page.goto("https://api.ipify.org?format=json", {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });
    if (res?.ok()) {
      const text = await res.text();
      const json = JSON.parse(text);
      return {
        ip: json.ip,
        country: proxy?.country,
        timezone: proxy?.country ? getRegionalSettings(proxy.country).timezoneId : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn(
      "[proxy-verify] Proxy verification probe failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  } finally {
    if (context) await context.close().catch(() => {});
  }
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
