import type { Browser } from "playwright-core";
import { launchBrowser, safeCloseBrowser, createStealthContext, type ProxyConfig } from "@/lib/browser-launcher";
import {
  cleanCookieValue,
  normalizeLinkedInProfileUrl,
  setupLinkedInContext,
  warmupLinkedInSession,
} from "@/lib/playwright-linkedin-session";

export interface SendMessageOptions {
  profileUrl: string;
  message: string;
  liAtCookie: string;
  jSessionId?: string;
  proxyConfig?: ProxyConfig;
}

export interface SendMessageResult {
  success: boolean;
  status: "sent" | "not_connected" | "inmail_only" | "failed";
  message: string;
  recipientName?: string;
  requiresReconnect?: boolean;
  error?: string;
}

/**
 * Automates sending a direct follow-up message to a 1st-degree LinkedIn connection
 * using active authenticated session cookies.
 * Includes session warmup and cookie fixes to eliminate ERR_TOO_MANY_REDIRECTS.
 */
export async function sendLinkedInMessageWithPlaywright({
  profileUrl,
  message,
  liAtCookie,
  jSessionId,
  proxyConfig,
}: SendMessageOptions): Promise<SendMessageResult> {
  const cleanLiAt = cleanCookieValue(liAtCookie, "li_at");

  if (!cleanLiAt) {
    return {
      success: false,
      status: "failed",
      requiresReconnect: true,
      message: "Your LinkedIn account is not connected. Please connect your LinkedIn account to continue.",
    };
  }

  const cleanMessage = message.trim();
  if (!cleanMessage) {
    return {
      success: false,
      status: "failed",
      message: "Message content cannot be empty.",
    };
  }

  const targetUrl = normalizeLinkedInProfileUrl(profileUrl);

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser({ headless: true, proxy: proxyConfig });
    const context = await createStealthContext(browser, { proxyConfig });

    const page = await context.newPage();

    // Setup resilient LinkedIn cookies & stealth headers
    await setupLinkedInContext(context, page, {
      liAt: cleanLiAt,
      jsessionId: jSessionId,
    });

    // Warm up session on feed first to prevent ERR_TOO_MANY_REDIRECTS on deep profile URLs
    const warmup = await warmupLinkedInSession(page, 20000);
    if (!warmup.ok) {
      await safeCloseBrowser(browser);
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message: warmup.error || "Your LinkedIn account authorization has expired. Please reconnect your LinkedIn account to continue.",
      };
    }

    // Navigate to target profile
    try {
      await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (navErr: unknown) {
      const navMsg = navErr instanceof Error ? navErr.message : String(navErr);
      if (
        navMsg.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
        navMsg.includes("ERR_TOO_MANY_REDIRECTS") ||
        navMsg.includes("999") ||
        navMsg.includes("403") ||
        navMsg.includes("429")
      ) {
        await safeCloseBrowser(browser);
        return {
          success: false,
          status: "failed",
          requiresReconnect: true,
          message:
            "Your LinkedIn account authorization has expired or was blocked by LinkedIn. Please reconnect your LinkedIn account to continue.",
        };
      }
      throw navErr;
    }

    const currentUrl = page.url().toLowerCase();
    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint") ||
      currentUrl.includes("/uas/")
    ) {
      await safeCloseBrowser(browser);
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message:
          "Your LinkedIn account authorization has expired. Please reconnect your LinkedIn account to continue.",
      };
    }

    // Extract prospect name
    const profileName = await page
      .locator(
        'h1, main section h1, div.ph5 h1, div[data-view-name="profile-card"] h1'
      )
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => undefined);

    // Locate the Message button
    const messageButton = page
      .locator(
        'main button:has-text("Message"), button[aria-label*="Message "], div.pvs-profile-actions button:has-text("Message"), a:has-text("Message")'
      )
      .first();

    const isMessageVisible = await messageButton
      .isVisible({ timeout: 4000 })
      .catch(() => false);

    if (!isMessageVisible) {
      // Check if they are not 1st degree or require InMail
      const hasLockOrInMail = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes("try premium to message") ||
          text.includes("send inmail") ||
          text.includes("connect")
        );
      });

      await safeCloseBrowser(browser);

      if (hasLockOrInMail) {
        return {
          success: false,
          status: "inmail_only",
          recipientName: profileName,
          message: profileName
            ? `${profileName} requires InMail or is not a 1st degree connection yet.`
            : "Recipient requires InMail or is not a 1st degree connection yet.",
        };
      }

      return {
        success: false,
        status: "not_connected",
        recipientName: profileName,
        message: profileName
          ? `Could not message ${profileName}. You must be connected to send direct follow-ups.`
          : "Could not locate the Message button on this profile.",
      };
    }

    // Click Message button to open chat dock
    await messageButton.click();
    await page.waitForTimeout(1200);

    // Locate the message input box
    const chatInput = page
      .locator(
        'div[role="textbox"][aria-label*="Write a message"], div.msg-form__contenteditable[contenteditable="true"], div[data-placeholder*="Write a message"], div.msg-form__message-texteditor div[contenteditable="true"]'
      )
      .first();

    const isInputVisible = await chatInput
      .isVisible({ timeout: 6000 })
      .catch(() => false);

    if (!isInputVisible) {
      await safeCloseBrowser(browser);
      return {
        success: false,
        status: "failed",
        recipientName: profileName,
        message: "LinkedIn chat window did not open in time.",
      };
    }

    await chatInput.click();
    await page.waitForTimeout(300);

    // Type message
    await chatInput.fill(cleanMessage);
    await page.waitForTimeout(400);

    // Click the Send button
    const sendButton = page
      .locator(
        'button.msg-form__send-button, form.msg-form button[type="submit"]:has-text("Send"), button[aria-label="Send now"], form.msg-form button[type="submit"]'
      )
      .first();

    if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      // Fallback: press Enter to send
      await chatInput.press("Enter");
    }

    // Wait for message transmission to complete
    await page.waitForTimeout(1500);

    await safeCloseBrowser(browser);

    return {
      success: true,
      status: "sent",
      recipientName: profileName,
      message: profileName
        ? `Follow-up message sent successfully to ${profileName}.`
        : "Follow-up message sent successfully.",
    };
  } catch (err: unknown) {
    await safeCloseBrowser(browser);
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
      errMsg.includes("ERR_TOO_MANY_REDIRECTS") ||
      errMsg.includes("999") ||
      errMsg.includes("403") ||
      errMsg.includes("429") ||
      errMsg.includes("login") ||
      errMsg.includes("authwall")
    ) {
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message:
          "Your LinkedIn account authorization has expired or was blocked by LinkedIn. Please reconnect your LinkedIn account to continue.",
        error: errMsg,
      };
    }
    return {
      success: false,
      status: "failed",
      message: `Failed to send LinkedIn follow-up message: ${errMsg}`,
      error: errMsg,
    };
  }
}
