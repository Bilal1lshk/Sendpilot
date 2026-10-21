import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { decryptConnectionSecrets } from "@/lib/connection-crypto";
import { setupLinkedInContext, warmupLinkedInSession } from "@/lib/playwright-linkedin-session";
import { launchBrowser, createStealthContext, safeCloseBrowser } from "@/lib/browser-launcher";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const conn = await mongoose.connection.db?.collection("linkedinconnections").findOne({
    id: "li_201204e3-2c7a-4944-ad52-eda656f7be78",
  });

  const secrets = decryptConnectionSecrets<{
    li_at?: string;
    liAt?: string;
    accessToken?: string;
    jsessionId?: string;
    JSESSIONID?: string;
  }>(conn!.encryptedCredentials);
  const liAt = secrets.li_at || secrets.liAt || secrets.accessToken;
  const jsessionId = secrets.jsessionId || secrets.JSESSIONID;

  if (!liAt) {
    throw new Error("No LinkedIn session cookie found for the diagnostic account.");
  }

  const browser = await launchBrowser({ headless: true });
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    await setupLinkedInContext(context, page, { liAt, jsessionId });
    console.log("Starting warmup...");
    const warmup = await warmupLinkedInSession(page, 15000);
    console.log("Warmup:", warmup);

    const targetUrl = "https://www.linkedin.com/in/basitabdullah/";
    console.log(`Navigating to ${targetUrl} (waitUntil: commit)...`);
    await page.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });
    console.log("Navigation committed. Waiting for main/h1...");
    await page.waitForSelector("main, h1, div.ph5", { timeout: 20000 });
    console.log("Main loaded. Waiting 3s for hydration...");
    await page.waitForTimeout(3000);

    console.log("Current URL:", page.url());
    console.log("Title:", await page.title());

    // Locate Connect button with the exact selector
    const directConnect = page.locator('main a[href*="custom-invite"], main a[aria-label*="Invite"], main a:has-text("Connect")').first();
    const isVisible = await directConnect.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("Is directConnect visible in main:", isVisible);

    if (isVisible) {
      const href = await directConnect.getAttribute("href");
      const aria = await directConnect.getAttribute("aria-label");
      console.log(`Found direct connect! href="${href}" aria="${aria}"`);

      console.log("Clicking Connect button via Playwright locator...");
      await directConnect.scrollIntoViewIfNeeded().catch(() => null);
      await directConnect.click({ timeout: 3000, force: true });
      await page.waitForTimeout(2000);

      // Check modal
      const modal = page.locator('div[role="dialog"]').first();
      const modalVisible = await modal.isVisible({ timeout: 4000 }).catch(() => false);
      console.log("Is modal dialog visible:", modalVisible);

      if (modalVisible) {
        const text = await modal.innerText();
        console.log("=== Modal Content ===\n", text);
        const buttons = await modal.locator("button, a").all();
        for (const b of buttons) {
          const t = await b.innerText();
          const a = await b.getAttribute("aria-label");
          console.log(`  Button: text="${t.replace(/\n/g, " ")}" aria="${a}"`);
        }
      }
    } else {
      console.log("Not visible via locator. Evaluating DOM...");
      const htmlSnippet = await page.evaluate(() => {
        const main = document.querySelector("main");
        return main ? main.innerHTML.slice(0, 1000) : "NO MAIN";
      });
      console.log("Main snippet:", htmlSnippet);
    }
  } finally {
    await safeCloseBrowser(browser);
    await mongoose.disconnect();
  }
}

main().catch(console.error);
