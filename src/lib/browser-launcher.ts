import type { Browser } from "playwright-core";

export interface LaunchBrowserOptions {
  headless?: boolean;
}

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
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
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
