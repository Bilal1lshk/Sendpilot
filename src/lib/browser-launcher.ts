import type { Browser, BrowserContext } from "playwright-core";

export interface LaunchBrowserOptions {
  headless?: boolean;
}

export interface StealthContextOptions {
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

/**
 * Launches a Chromium browser instance that works in both:
 * 1. Vercel / AWS Lambda serverless environments (via @sparticuz/chromium + playwright-core)
 * 2. Local development on Windows / macOS / Linux (bundled Chromium, Chrome, or Edge)
 */
export async function launchBrowser(options: LaunchBrowserOptions = {}): Promise<Browser> {
  const isServerless = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
  );
  const headless = isServerless ? true : (options.headless ?? true);

  const pw = await import("playwright-core");
  const chromium = pw.chromium;

  const baseArgs = [
    "--headless=new",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,800",
  ];

  // 1. Serverless (Vercel / AWS Lambda): use @sparticuz/chromium binary
  if (isServerless) {
    const sparticuzModule = await import("@sparticuz/chromium");
    const sparticuz = sparticuzModule.default || sparticuzModule;
    const executablePath = await sparticuz.executablePath();

    return await chromium.launch({
      args: [...(sparticuz.args || []), ...baseArgs],
      executablePath,
      headless: true,
    });
  }

  // 2. Local environment: try Playwright's bundled Chromium, then Chrome, then Edge
  try {
    return await chromium.launch({
      headless,
      args: baseArgs,
    });
  } catch {
    try {
      return await chromium.launch({
        headless,
        channel: "chrome",
        args: baseArgs,
      });
    } catch {
      return await chromium.launch({
        headless,
        channel: "msedge",
        args: baseArgs,
      });
    }
  }
}

/**
 * Creates a stealth BrowserContext whose User-Agent matches the real underlying
 * Chromium binary version & OS (with "Headless" stripped), avoiding PerimeterX
 * Client-Hints / User-Agent mismatch blocks (captchaInternal) on LinkedIn.
 */
export async function createStealthContext(
  browser: Browser,
  options: StealthContextOptions = {}
): Promise<BrowserContext> {
  let cleanNativeUa =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  try {
    const probePage = await browser.newPage();
    const rawUa = await probePage.evaluate(() => navigator.userAgent);
    await probePage.close();
    if (rawUa) {
      cleanNativeUa = rawUa
        .replace(/HeadlessChrome/gi, "Chrome")
        .replace(/HeadlessEdg/gi, "Edg");
    }
  } catch {
    // Fallback to default UA if probe fails
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: cleanNativeUa,
    locale: "en-US",
    ...(options.storageState ? { storageState: options.storageState } : {}),
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // Ensure window.chrome is present
    if (!(window as unknown as Record<string, unknown>).chrome) {
      (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
    }
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
  });

  return context;
}
