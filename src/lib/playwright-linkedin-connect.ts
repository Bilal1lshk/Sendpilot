import type { Browser, Response } from "playwright-core";
import { launchBrowser, safeCloseBrowser, createStealthContext } from "@/lib/browser-launcher";
import {
  cleanCookieValue,
  normalizeLinkedInProfileUrl,
  setupLinkedInContext,
  warmupLinkedInSession,
} from "@/lib/playwright-linkedin-session";

/** Structured logger matching the worker's [timestamp] [LEVEL] format */
function wlog(level: "INFO" | "WARN" | "ERROR", message: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${message}`);
}

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
  requiresReconnect?: boolean;
}

async function launchBrowserWithFallback(): Promise<Browser> {
  return await launchBrowser({ headless: true });
}

/**
 * Sends a real LinkedIn connection request using Playwright and the user's active session.
 * Includes session pre-flight feed warmup and cookie attribute normalization to prevent ERR_TOO_MANY_REDIRECTS.
 */
export async function sendLinkedInConnectionWithPlaywright({
  profileUrl,
  liAtCookie,
  jSessionId,
  note,
}: SendConnectionOptions): Promise<SendConnectionResult> {
  const cleanLiAt = cleanCookieValue(liAtCookie, "li_at");

  if (!cleanLiAt) {
    return {
      success: false,
      status: "failed",
      requiresReconnect: true,
      message: "Your LinkedIn account is not connected. Please connect your LinkedIn account to continue.",
    };
  }

  // Normalize profile URL to https://www.linkedin.com/in/<vanity>/ without tracking parameters
  const targetUrl = normalizeLinkedInProfileUrl(profileUrl);

  let browser: Browser | null = null;

  try {
    browser = await launchBrowserWithFallback();
    const context = await createStealthContext(browser);
    const page = await context.newPage();

    // Attach comprehensive network listener before any navigation or clicks to capture invitation API responses
    let inviteRequestDispatched = false;
    let inviteResponseStatus: number | null = null;
    let inviteResponseOk = false;
    let inviteResponseErrorBody: string | null = null;

    const onResponse = async (response: Response) => {
      try {
        const url = response.url();
        const req = response.request();
        const method = req ? req.method() : "";
        const postData = req ? (req.postData() || "") : "";

        const isInviteEndpoint =
          url.includes("normInvitations") ||
          url.includes("voyagerGrowthNormInvitations") ||
          url.includes("growth/invitations") ||
          url.includes("growthNormInvitations") ||
          url.includes("voyagerRelationships") ||
          url.includes("memberRelationships") ||
          ((url.includes("graphql") || url.includes("dash/graphql")) &&
            (postData.includes("invitation") ||
              postData.includes("normInvitations") ||
              postData.includes("MemberRelationship") ||
              postData.includes("CreateInvitation") ||
              url.includes("Invitation") ||
              url.includes("normInvitations")));

        if (isInviteEndpoint && (method === "POST" || method === "PUT")) {
          inviteRequestDispatched = true;
          const status = response.status();
          inviteResponseStatus = status;
          if (status === 200 || status === 201) {
            inviteResponseOk = true;
          } else if (status >= 400) {
            try {
              const bodyText = await response.text();
              inviteResponseErrorBody = bodyText.slice(0, 300);
            } catch {}
          }
        }
      } catch {
        // Ignore listener error
      }
    };
    page.on("response", onResponse);

    // Setup resilient LinkedIn cookies & stealth headers
    await setupLinkedInContext(context, page, {
      liAt: cleanLiAt,
      jsessionId: jSessionId,
    });

    wlog("INFO", `[send-connection] Target profile: ${targetUrl}`);

    // 1. Warm up session on feed to lock in edge cookies (lidc, bcookie) and prevent redirect loops
    const warmup = await warmupLinkedInSession(page, 20000);
    if (!warmup.ok) {
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message: warmup.error || "Your LinkedIn account authorization has expired. Please reconnect your LinkedIn account to continue.",
      };
    }

    // 2. Navigate to target profile
    try {
      await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 35000,
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
        return {
          success: false,
          status: "failed",
          requiresReconnect: true,
          message:
            "LinkedIn rejected this session or entered a redirect loop. Please reconnect your LinkedIn account to refresh credentials.",
        };
      }
      throw navErr;
    }

    // 3. Verify landing URL
    const currentUrl = page.url().toLowerCase();
    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint") ||
      currentUrl.includes("/uas/")
    ) {
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message:
          "Your LinkedIn account authorization has expired. Please reconnect your LinkedIn account to continue.",
      };
    }

    // Check for 404 or profile unavailable
    const isUnavailable = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes("this profile is not available") ||
        text.includes("page not found") ||
        text.includes("an error has occurred")
      );
    });

    if (isUnavailable) {
      return {
        success: false,
        status: "failed",
        message: `LinkedIn profile "${targetUrl}" is unavailable or does not exist.`,
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
      if (text.includes("invitation pending") || text.includes("pending") || text.includes("withdraw")) {
        const scope = document.querySelector("main") || document.body;
        return Array.from(scope.querySelectorAll("button, span, div.pvs-profile-actions, a")).some((el) => {
          const t = el.textContent?.trim().toLowerCase() || "";
          const aria = (el.getAttribute("aria-label") || "").toLowerCase();
          return (
            t === "pending" ||
            t === "invitation pending" ||
            t.includes("withdraw invitation") ||
            aria.includes("pending") ||
            aria.includes("invitation pending") ||
            aria.includes("withdraw")
          );
        });
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
      const hasMessageBtn = Boolean(document.querySelector('button[aria-label*="Message"]'));
      // Match button text/aria-label manually inside main
      const scope = document.querySelector("main") || document.body;
      const hasConnectBtn = Array.from(scope.querySelectorAll("button")).some((btn) => {
        const text = (btn.textContent || "").trim().toLowerCase();
        const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
        return text === "connect" || aria.includes("connect") || aria.includes("invite ");
      });
      return Boolean(badges && hasMessageBtn && !hasConnectBtn);
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

    // Find and click Connect button with multi-tag support and sticky-nav bypass
    let clickedConnect = false;

    // Strategy 1: Targeted in-page DOM inspection (supports both <a> anchor links and <button> elements)
    const domConnectResult = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href*="custom-invite"], a[aria-label*="Invite"], button[aria-label*="Invite"], a[aria-label*="Connect"], button[aria-label*="Connect"], a, button, div[role="button"]'
        )
      );

      const matches = candidates.filter((el) => {
        // Exclude sidebar cards ("People Also Viewed") and footer items
        if (el.closest("aside, div.scaffold-layout__aside, section.aside, footer")) return false;

        const text = (el.textContent || "").trim();
        const aria = (el.getAttribute("aria-label") || "").trim();
        const href = el.getAttribute("href") || "";
        const comp = el.getAttribute("componentkey") || "";

        const isConnectAction =
          href.includes("custom-invite") ||
          comp.includes("ConnectButton") ||
          text === "Connect" ||
          text.startsWith("Connect ") ||
          aria.includes("Invite") ||
          aria.startsWith("Connect");

        return isConnectAction;
      });

      // Filter out elements trapped in the top sticky bar (y < 60)
      const inPage = matches.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.y > 60 && r.height > 15;
      });

      const target = inPage[0] || matches[0];
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
        target.click();
        target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return {
          clicked: true,
          tag: target.tagName,
          aria: target.getAttribute("aria-label"),
          text: target.textContent?.trim(),
        };
      }
      return { clicked: false };
    }).catch(() => ({ clicked: false }));

    if (domConnectResult && "tag" in domConnectResult && domConnectResult.clicked) {
      clickedConnect = true;
      wlog(
        "INFO",
        `[send-connection] Clicked direct Connect element (${domConnectResult.tag}: "${domConnectResult.aria || domConnectResult.text}").`
      );
    } else if (domConnectResult?.clicked) {
      clickedConnect = true;
    }

    // Strategy 2: Playwright Locator multi-tag fallback if DOM click didn't trigger
    if (!clickedConnect) {
      const directConnectLocators = [
        'a[href*="custom-invite"]',
        'a[aria-label*="Invite "]',
        'button[aria-label*="Invite "]',
        'a[aria-label*="Connect with "]',
        'button[aria-label*="Connect with "]',
        'main a:has-text("Connect")',
        'main button:has-text("Connect")',
        'a[componentkey*="ConnectButton"]',
        'button[componentkey*="ConnectButton"]',
      ];

      for (const sel of directConnectLocators) {
        const loc = page.locator(sel).first();
        if (await loc.isVisible({ timeout: 1200 }).catch(() => false)) {
          await loc.scrollIntoViewIfNeeded().catch(() => null);
          try {
            await loc.click({ timeout: 2500, force: true });
            clickedConnect = true;
            wlog("INFO", `[send-connection] Clicked Connect button via selector: ${sel}`);
            break;
          } catch {
            try {
              await loc.dispatchEvent("click");
              clickedConnect = true;
              wlog("INFO", `[send-connection] Dispatched click via selector: ${sel}`);
              break;
            } catch {}
          }
        }
      }
    }

    // Strategy 3: Inspect the "More" actions dropdown (Creator Mode / Follow-first profiles)
    if (!clickedConnect) {
      wlog("INFO", "[send-connection] Direct Connect button not found on header; inspecting 'More' dropdown...");

      const moreButtonLocators = [
        'main button[aria-label="More actions"]',
        'main button[aria-label="More"]',
        'main div.pvs-profile-actions button[aria-label*="More"]',
        'main div.artdeco-dropdown button',
        'button[aria-label="More actions"]',
        'button[aria-label="More"]',
        'button:has-text("More")',
      ];

      for (const moreSel of moreButtonLocators) {
        const moreBtn = page.locator(moreSel).first();
        if (await moreBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await moreBtn.scrollIntoViewIfNeeded().catch(() => null);
          try {
            await moreBtn.click({ timeout: 2000, force: true });
          } catch {
            await moreBtn.dispatchEvent("click");
          }
          await page.waitForTimeout(600);

          // Find Connect / Invite item in the opened dropdown (matching across a, button, div, span)
          const dropdownConnect = page.locator([
            'div[role="menu"] [role="menuitem"]:has-text("Connect")',
            'div[role="menu"] [role="button"]:has-text("Connect")',
            'div[role="menu"] a[href*="custom-invite"]',
            'div[role="menu"] a:has-text("Connect")',
            'div[role="menu"] button:has-text("Connect")',
            'div[role="menu"] [aria-label*="Invite"]',
            'div[role="menu"] [aria-label*="Connect"]',
            'div.artdeco-dropdown__content [aria-label*="Connect"]',
            'div.artdeco-dropdown__content div:has-text("Connect")',
            'div.artdeco-dropdown__content a:has-text("Connect")',
            'div.artdeco-dropdown__content span:has-text("Connect")',
          ].join(", ")).first();

          if (await dropdownConnect.isVisible({ timeout: 2500 }).catch(() => false)) {
            try {
              await dropdownConnect.click({ timeout: 2500, force: true });
              clickedConnect = true;
              wlog("INFO", "[send-connection] Clicked Connect item in More dropdown menu.");
              break;
            } catch {
              try {
                await dropdownConnect.dispatchEvent("click");
                clickedConnect = true;
                wlog("INFO", "[send-connection] Dispatched click on Connect item in dropdown.");
                break;
              } catch {}
            }
          }
        }
      }
    }

    if (!clickedConnect) {
      // Check if profile strictly enforces Follow only or restricted messaging
      const hasFollowOnly = await page.evaluate(() => {
        const main = document.querySelector("main") || document.body;
        const buttons = Array.from(main.querySelectorAll("button, a"));
        return buttons.some((b) => (b.textContent || "").trim().toLowerCase() === "follow");
      }).catch(() => false);

      return {
        success: false,
        status: "failed",
        message: profileName
          ? hasFollowOnly
            ? `${profileName}'s profile only allows 'Follow' and restricts direct connection invitations.`
            : `Could not locate the Connect button for ${profileName}. This profile may restrict invites or require mutual connections.`
          : "Could not locate the Connect button on this profile.",
        recipientName: profileName,
      };
    }

    // Wait for possible Connect modal dialog
    await page.waitForTimeout(800);

    const modal = page.locator('div[role="dialog"]').first();
    const isModalVisible = await modal.isVisible({ timeout: 3500 }).catch(() => false);

    if (isModalVisible) {
      wlog("INFO", "[send-connection] Connect modal detected.");

      // Check if recipient requires email
      const emailInput = modal.locator('input[type="email"], input#email, input[name="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        return {
          success: false,
          status: "failed",
          message: profileName
            ? `LinkedIn requires ${profileName}'s email address before sending an invite.`
            : "LinkedIn requires the recipient's email address to connect.",
          recipientName: profileName,
        };
      }

      // Check if weekly invite limit was reached
      const isLimitHit = await modal.evaluate((el) => {
        const text = (el.textContent || "").toLowerCase();
        return (
          text.includes("reached the weekly invitation limit") ||
          text.includes("out of invitations") ||
          text.includes("invitation limit reached") ||
          text.includes("can't send any more invitations right now")
        );
      }).catch(() => false);

      if (isLimitHit) {
        return {
          success: false,
          status: "failed",
          message: "LinkedIn weekly invitation limit reached. Please wait before sending more invitations.",
          recipientName: profileName,
        };
      }

      const cleanNote = note?.trim() || "";

      if (cleanNote) {
        // Look for "Add a note" button
        const addNoteButton = modal
          .locator(
            'button:has-text("Add a note"), button[aria-label*="Add a note"], button[aria-label*="add a note"]'
          )
          .first();

        if (await addNoteButton.isVisible({ timeout: 2500 }).catch(() => false)) {
          const isNoteDisabled = await addNoteButton.evaluate((btn: HTMLButtonElement) => {
            return (
              btn.disabled ||
              btn.getAttribute("aria-disabled") === "true" ||
              btn.classList.contains("artdeco-button--disabled")
            );
          }).catch(() => false);

          if (!isNoteDisabled) {
            try {
              await addNoteButton.click({ timeout: 2500 });
            } catch {
              await addNoteButton.dispatchEvent("click");
            }
            await page.waitForTimeout(400);

            const textarea = modal
              .locator('textarea[name="message"], textarea#custom-message, textarea')
              .first();
            if (await textarea.isVisible({ timeout: 2500 }).catch(() => false)) {
              // LinkedIn max note length is 300 characters
              await textarea.fill(cleanNote.slice(0, 300));
              await page.waitForTimeout(300);
              wlog("INFO", "[send-connection] Added personalized invite note.");
            }
          } else {
            wlog(
              "WARN",
              "[send-connection] Note button disabled (account note limit reached). Falling back to sending without note."
            );
          }
        }

        // Click Send in modal
        const sendBtn = modal
          .locator([
            'button[aria-label*="Send invitation"]',
            'button[aria-label*="Send now"]',
            'button[aria-label*="Send without a note"]',
            'button[aria-label="Send"]',
            'button.artdeco-button--primary:has-text("Send")',
            'button.artdeco-button--primary',
            'button:has-text("Send invitation")',
            'button:has-text("Send now")',
            'button:has-text("Send without a note")',
            'button:has-text("Send")',
          ].join(", "))
          .first();

        if (await sendBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          try {
            await sendBtn.click({ timeout: 3000 });
          } catch {
            await sendBtn.dispatchEvent("click");
          }
          wlog("INFO", "[send-connection] Clicked modal Send button.");
        }
      } else {
        // Send without note
        const sendWithoutNoteBtn = modal
          .locator([
            'button:has-text("Send without a note")',
            'button[aria-label*="Send without a note"]',
            'button[aria-label*="without a note"]',
            'button.artdeco-button--primary:has-text("Send")',
            'button.artdeco-button--primary',
            'button:has-text("Send now")',
            'button:has-text("Send")',
            'button[aria-label*="Send"]',
          ].join(", "))
          .first();

        if (await sendWithoutNoteBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          try {
            await sendWithoutNoteBtn.click({ timeout: 3000 });
          } catch {
            await sendWithoutNoteBtn.dispatchEvent("click");
          }
          wlog("INFO", "[send-connection] Clicked Send without note button.");
        } else {
          const anySendBtn = modal
            .locator(
              'button.artdeco-button--primary:has-text("Send"), button:has-text("Send"), button[aria-label*="Send"]'
            )
            .first();
          if (await anySendBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
            try {
              await anySendBtn.click({ timeout: 3000 });
            } catch {
              await anySendBtn.dispatchEvent("click");
            }
          }
        }
      }
    }

    // STRICT VERIFICATION PHASE:
    // Verify that the connection request was truly dispatched & accepted by LinkedIn
    let isConfirmed = false;
    let confirmationMethod: string | null = null;
    let explicitError: string | null = null;
    const verifyDeadline = Date.now() + 8000;

    while (Date.now() < verifyDeadline) {
      // 1. Network API confirmed 200/201 response
      if (inviteResponseOk || inviteResponseStatus === 200 || inviteResponseStatus === 201) {
        isConfirmed = true;
        confirmationMethod = `LinkedIn API confirmed HTTP ${inviteResponseStatus || 200}`;
        break;
      }

      // Check for explicit network rejection
      if (inviteResponseStatus && inviteResponseStatus >= 400) {
        explicitError = `LinkedIn rejected the invitation (HTTP ${inviteResponseStatus}).`;
        if (inviteResponseErrorBody) {
          try {
            const parsed = JSON.parse(inviteResponseErrorBody);
            if (parsed.message) explicitError = `LinkedIn rejected the invitation: ${parsed.message}`;
          } catch {}
        }
        break;
      }

      // 2. Modal dismissal check (if modal opened, closing it after clicking Send is a primary signal)
      if (isModalVisible) {
        const stillOpen = await modal.isVisible().catch(() => false);
        if (!stillOpen) {
          isConfirmed = true;
          confirmationMethod = "Connect dialog closed successfully";
          break;
        }

        // If modal is still open, check for error alerts or limits
        const modalErr = await modal.evaluate((el) => {
          const text = (el.textContent || "").toLowerCase();
          if (
            text.includes("weekly invitation limit") ||
            text.includes("out of invitations") ||
            text.includes("limit reached") ||
            text.includes("can't send any more invitations right now")
          ) {
            return "LinkedIn weekly invitation limit reached. Please wait before sending more invitations.";
          }
          if (text.includes("email") && el.querySelector('input[type="email"], input#email')) {
            return "LinkedIn requires recipient's email address to connect.";
          }
          const feedback = el.querySelector(".artdeco-inline-feedback--error, [role='alert'], p.artdeco-inline-feedback__message");
          if (feedback) {
            return (feedback.textContent || "").trim();
          }
          return null;
        }).catch(() => null);

        if (modalErr) {
          explicitError = modalErr;
          break;
        }
      }

      // 3. Check for LinkedIn Toast message on page (e.g. "Invitation sent")
      const toastFound = await page.evaluate(() => {
        const alerts = Array.from(
          document.querySelectorAll('.artdeco-toast-item, [role="alert"], div.artdeco-inline-feedback, div.artdeco-notification')
        );
        return alerts.some((el) => {
          const t = (el.textContent || "").toLowerCase();
          return (
            t.includes("invitation sent") ||
            t.includes("invite sent") ||
            t.includes("invitation was sent") ||
            t.includes("connection request sent")
          );
        });
      }).catch(() => false);

      if (toastFound) {
        isConfirmed = true;
        confirmationMethod = "LinkedIn confirmation toast appeared";
        break;
      }

      // 4. Check if profile action button state is now "Pending" or "Withdraw"
      const isNowPending = await page.evaluate(() => {
        const scope = document.querySelector("main") || document.body;
        return Array.from(scope.querySelectorAll("button, span, div.pvs-profile-actions, a")).some((el) => {
          const t = (el.textContent || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "").toLowerCase();
          return (
            t === "pending" ||
            t.includes("invitation pending") ||
            t.includes("withdraw invitation") ||
            t.includes("withdraw") ||
            aria.includes("pending") ||
            aria.includes("withdraw") ||
            aria.includes("invitation pending")
          );
        });
      }).catch(() => false);

      if (isNowPending) {
        isConfirmed = true;
        confirmationMethod = "Profile button updated to Pending";
        break;
      }

      await page.waitForTimeout(400);
    }

    if (explicitError) {
      wlog("WARN", `[send-connection] Explicit error: ${explicitError}`);
      return {
        success: false,
        status: "failed",
        message: explicitError,
        recipientName: profileName,
      };
    }

    if (!isConfirmed) {
      // Final inspection check
      const finalPendingCheck = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("invitation pending") || text.includes("pending");
      }).catch(() => false);

      if (finalPendingCheck) {
        isConfirmed = true;
        confirmationMethod = "Profile verified as Pending on final inspection";
      }
    }

    if (!isConfirmed) {
      if (inviteRequestDispatched) {
        wlog("WARN", "[send-connection] Invitation request was dispatched, but no confirmation received within deadline.");
      }

      return {
        success: false,
        status: "failed",
        message: profileName
          ? `Could not verify that the connection request was sent to ${profileName}. LinkedIn did not confirm the invitation.`
          : "Could not verify that the connection request was sent. LinkedIn did not confirm the invitation.",
        recipientName: profileName,
      };
    }

    wlog("INFO", `[send-connection] Success (${confirmationMethod}) for ${profileName || targetUrl}`);

    return {
      success: true,
      status: "sent",
      message: profileName
        ? `Connection request sent to ${profileName}!`
        : "Connection request sent successfully!",
      recipientName: profileName,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
      errorMsg.includes("ERR_TOO_MANY_REDIRECTS") ||
      errorMsg.includes("999") ||
      errorMsg.includes("403") ||
      errorMsg.includes("429") ||
      errorMsg.includes("login") ||
      errorMsg.includes("authwall")
    ) {
      return {
        success: false,
        status: "failed",
        requiresReconnect: true,
        message:
          "Your LinkedIn account authorization has expired or was blocked by LinkedIn. Please reconnect your LinkedIn account to continue.",
      };
    }
    return {
      success: false,
      status: "failed",
      message: `Failed to complete LinkedIn request: ${errorMsg}`,
    };
  } finally {
    await safeCloseBrowser(browser);
  }
}
