import type { Browser } from "playwright-core";
import { launchBrowser, safeCloseBrowser } from "@/lib/browser-launcher";

export interface SendConnectionOptions {
  profileUrl: string;
  liAtCookie: string;
  jSessionId?: string;
  note?: string;
}

export interface SendConnectionResult {
  success: boolean;
  status: "sent" | "already_connected" | "already_pending" | "failed";
  message: string;
  recipientName?: string;
}

function cleanCookieValue(raw: string, cookieName: string): string {
  let val = raw.trim();
  const prefixRegex = new RegExp(`^${cookieName}\\s*=\\s*`, "i");
  val = val.replace(prefixRegex, "").replace(/;.*$/, "").trim();
  return val;
}

async function launchBrowserWithFallback(): Promise<Browser> {
  return await launchBrowser({ headless: true });
}

/**
 * Sends a real LinkedIn connection request using Playwright and the user's active session.
 */
export async function sendLinkedInConnectionWithPlaywright({
  profileUrl,
  liAtCookie,
  jSessionId,
  note,
}: SendConnectionOptions): Promise<SendConnectionResult> {
  const cleanLiAt = cleanCookieValue(liAtCookie, "li_at");
  const cleanJSessionRaw = jSessionId
    ? cleanCookieValue(jSessionId, "JSESSIONID").replace(/^"+|"+$/g, "")
    : "";

  if (!cleanLiAt) {
    return {
      success: false,
      status: "failed",
      message: "Missing or invalid LinkedIn li_at session cookie.",
    };
  }

  // Normalize profile URL
  let targetUrl = profileUrl.trim();
  if (!targetUrl.startsWith("http")) {
    if (targetUrl.includes("linkedin.com/")) {
      targetUrl = `https://${targetUrl}`;
    } else {
      const slug = targetUrl.replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-");
      targetUrl = `https://www.linkedin.com/in/${slug}/`;
    }
  }

  // Ensure trailing slash and strip search params for clean profile navigation
  try {
    const parsed = new URL(targetUrl);
    targetUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}/`;
  } catch {
    // keep as is
  }

  let browser: Browser | null = null;

  try {
    browser = await launchBrowserWithFallback();
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
    });

    // Inject session cookies for .linkedin.com
    const cookiesToInject = [
      {
        name: "li_at",
        value: cleanLiAt,
        domain: ".linkedin.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None" as const,
      },
      ...(cleanJSessionRaw
        ? [
            {
              name: "JSESSIONID",
              value: `"${cleanJSessionRaw}"`,
              domain: ".linkedin.com",
              path: "/",
              httpOnly: false,
              secure: true,
              sameSite: "None" as const,
            },
          ]
        : []),
    ];

    await context.addCookies(cookiesToInject);

    if (cleanJSessionRaw) {
      await context.setExtraHTTPHeaders({
        "csrf-token": cleanJSessionRaw,
      });
    }

    const page = await context.newPage();

    // Disable webdriver detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    // Navigate to the target profile
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    });

    const currentUrl = page.url();
    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint")
    ) {
      return {
        success: false,
        status: "failed",
        message: "LinkedIn redirected to login. Your session cookie may be expired. Please re-authenticate your LinkedIn account.",
      };
    }

    // Wait for the main profile section to appear
    await page.waitForSelector("main, h1, div.ph5", { timeout: 15000 }).catch(() => null);

    // Extract profile name if possible
    const profileName = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      return h1 ? h1.innerText.trim() : "";
    });

    // Check if an invitation is already pending
    const isPending = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes("invitation pending") || text.includes("pending")) {
        const pendingBtn = Array.from(document.querySelectorAll("button, span")).some(
          (el) => el.textContent?.trim().toLowerCase() === "pending"
        );
        return pendingBtn;
      }
      return false;
    });

    if (isPending) {
      return {
        success: true,
        status: "already_pending",
        message: profileName
          ? `A connection request to ${profileName} is already pending.`
          : "A connection request to this profile is already pending.",
        recipientName: profileName,
      };
    }

    // Check if already 1st degree connected
    const isAlreadyConnected = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll("span, div")).some(
        (el) => el.textContent?.trim() === "1st" || el.textContent?.trim() === "1st degree connection"
      );
      const messageOnly =
        document.querySelector('button[aria-label*="Message"]') &&
        !document.querySelector('button:has-text("Connect")');
      return Boolean(badges && messageOnly);
    });

    if (isAlreadyConnected) {
      return {
        success: true,
        status: "already_connected",
        message: profileName
          ? `You are already connected with ${profileName}.`
          : "You are already connected with this profile.",
        recipientName: profileName,
      };
    }

    // Find and click Connect button
    // 1. First look in visible primary action buttons on the top card
    let clickedConnect = false;

    const directConnectButton = page.locator(
      'main button:has-text("Connect"), div.pvs-profile-actions button:has-text("Connect"), button[aria-label*="Invite "], button[aria-label*="Connect with"]'
    ).first();

    if (await directConnectButton.isVisible({ timeout: 2500 }).catch(() => false)) {
      await directConnectButton.click();
      clickedConnect = true;
    }

    // 2. If not visible directly, check inside "More" / "More actions" dropdown
    if (!clickedConnect) {
      const moreButton = page.locator(
        'main button:has-text("More"), button[aria-label="More actions"], button[aria-label*="More"]'
      ).first();

      if (await moreButton.isVisible({ timeout: 2500 }).catch(() => false)) {
        await moreButton.click();
        await page.waitForTimeout(600);

        // Find Connect in dropdown menu
        const menuConnectItem = page.locator(
          'div[role="menu"] div[role="menuitem"]:has-text("Connect"), div[role="menu"] button:has-text("Connect"), ul[role="menu"] li:has-text("Connect"), div[role="menu"] span:has-text("Connect")'
        ).first();

        if (await menuConnectItem.isVisible({ timeout: 2500 }).catch(() => false)) {
          await menuConnectItem.click();
          clickedConnect = true;
        }
      }
    }

    if (!clickedConnect) {
      // Check if button text is Follow only or locked profile
      return {
        success: false,
        status: "failed",
        message: profileName
          ? `Could not locate the Connect button for ${profileName}. This profile may only allow Follow, require an email address, or restrict invites.`
          : "Could not locate the Connect button on this profile.",
        recipientName: profileName,
      };
    }

    // Wait for the modal "You can add a note to personalize your invitation"
    await page.waitForTimeout(1000);

    const modal = page.locator('div[role="dialog"]').first();
    const isModalVisible = await modal.isVisible({ timeout: 4000 }).catch(() => false);

    if (isModalVisible) {
      const cleanNote = note?.trim() || "";

      if (cleanNote) {
        // Click "Add a note"
        const addNoteButton = modal.locator(
          'button:has-text("Add a note"), button[aria-label*="Add a note"]'
        ).first();

        if (await addNoteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addNoteButton.click();
          await page.waitForTimeout(400);

          const textarea = modal.locator('textarea[name="message"], textarea#custom-message, textarea').first();
          if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
            // LinkedIn max note is 300 characters
            await textarea.fill(cleanNote.slice(0, 300));
            await page.waitForTimeout(400);
          }
        }

        // Click Send in modal
        const sendBtn = modal.locator(
          'button:has-text("Send"), button[aria-label*="Send invitation"], button[aria-label*="Send now"]'
        ).first();

        if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendBtn.click();
        }
      } else {
        // Send without a note
        const sendWithoutNoteBtn = modal.locator(
          'button:has-text("Send without a note"), button[aria-label*="Send without a note"], button:has-text("Send")'
        ).first();

        if (await sendWithoutNoteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendWithoutNoteBtn.click();
        } else {
          // Fallback to any Send button
          const anySendBtn = modal.locator('button:has-text("Send")').first();
          if (await anySendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await anySendBtn.click();
          }
        }
      }

      await page.waitForTimeout(1500);
    }

    return {
      success: true,
      status: "sent",
      message: profileName
        ? `Connection request sent to ${profileName}!`
        : "Connection request sent successfully!",
      recipientName: profileName,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send connection request";
    return {
      success: false,
      status: "failed",
      message: `Automation error: ${errorMsg}`,
    };
  } finally {
    await safeCloseBrowser(browser);
  }
}
