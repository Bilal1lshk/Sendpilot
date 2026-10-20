import type { Browser } from "playwright-core";
import { launchBrowser, safeCloseBrowser, type ProxyConfig } from "@/lib/browser-launcher";

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
  error?: string;
}

function cleanCookieValue(raw: string, cookieName: string): string {
  let val = raw.trim();
  const prefixRegex = new RegExp(`^${cookieName}\\s*=\\s*`, "i");
  val = val.replace(prefixRegex, "").replace(/;.*$/, "").trim();
  return val;
}

/**
 * Automates sending a direct follow-up message to a 1st-degree LinkedIn connection
 * using active authenticated session cookies.
 */
export async function sendLinkedInMessageWithPlaywright({
  profileUrl,
  message,
  liAtCookie,
  jSessionId,
  proxyConfig,
}: SendMessageOptions): Promise<SendMessageResult> {
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

  const cleanMessage = message.trim();
  if (!cleanMessage) {
    return {
      success: false,
      status: "failed",
      message: "Message content cannot be empty.",
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

  try {
    const parsed = new URL(targetUrl);
    targetUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}/`;
  } catch {}

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser({ headless: true, proxy: proxyConfig });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
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
    const page = await context.newPage();

    // Navigate to target profile
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

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

    // Type with human-like cadence
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
    return {
      success: false,
      status: "failed",
      message: `Failed to send LinkedIn follow-up message: ${errMsg}`,
      error: errMsg,
    };
  }
}
