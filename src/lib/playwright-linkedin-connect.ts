import type { Browser } from "playwright-core";
import { launchBrowser, safeCloseBrowser, createStealthContext } from "@/lib/browser-launcher";
import {
  cleanCookieValue,
  normalizeLinkedInProfileUrl,
  setupLinkedInContext,
  warmupLinkedInSession,
} from "@/lib/playwright-linkedin-session";

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

    const onResponse = async (response: any) => {
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

    console.log(`[send-connection] Target profile: ${targetUrl}`);

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

    // Find and click Connect button
    // Scroll down slightly to ensure top card buttons are visible below fixed nav
    await page.evaluate(() => window.scrollBy(0, 100)).catch(() => null);
    await page.waitForTimeout(300);

    let clickedConnect = false;
    const topCardScope = page.locator("main section.artdeco-card, div.ph5, div.pv-top-card, main").first();

    // Step A: Primary buttons on the profile header
    const directConnectButton = topCardScope
      .locator(
        'button:has-text("Connect"), button[aria-label*="Invite "], button[aria-label*="Connect with "], button[aria-label="Connect"], button[aria-label*="connect"]'
      )
      .first();

    if (await directConnectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directConnectButton.scrollIntoViewIfNeeded().catch(() => null);
      try {
        await directConnectButton.click({ timeout: 3000 });
        clickedConnect = true;
        console.log("[send-connection] Clicked direct Connect button on profile header.");
      } catch {
        try {
          await directConnectButton.dispatchEvent("click");
          clickedConnect = true;
          console.log("[send-connection] Dispatched click on direct Connect button.");
        } catch {}
      }
    }

    // Step B: If not visible directly, inspect "More" dropdown
    if (!clickedConnect) {
      const moreButton = topCardScope
        .locator(
          'button[aria-label="More actions"], button[aria-label="More"], button:has-text("More"), div.artdeco-dropdown button'
        )
        .first();

      if (await moreButton.isVisible({ timeout: 2500 }).catch(() => false)) {
        await moreButton.scrollIntoViewIfNeeded().catch(() => null);
        try {
          await moreButton.click({ timeout: 2500 });
        } catch {
          await moreButton.dispatchEvent("click");
        }
        await page.waitForTimeout(600);

        const menuConnectItem = page
          .locator(
            'div[role="menu"] [role="menuitem"]:has-text("Connect"), div[role="menu"] [role="button"]:has-text("Connect"), div[role="menu"] button:has-text("Connect"), div[role="menu"] div:has-text("Connect"), div[role="menu"] span:has-text("Connect"), div[role="menu"] [aria-label*="Invite"], div[role="menu"] [aria-label*="Connect"], div.artdeco-dropdown__content [aria-label*="Connect"], div.artdeco-dropdown__content div:has-text("Connect")'
          )
          .first();

        if (await menuConnectItem.isVisible({ timeout: 2500 }).catch(() => false)) {
          try {
            await menuConnectItem.click({ timeout: 2500 });
            clickedConnect = true;
            console.log("[send-connection] Clicked Connect item in More dropdown menu.");
          } catch {
            try {
              await menuConnectItem.dispatchEvent("click");
              clickedConnect = true;
              console.log("[send-connection] Dispatched click on Connect item in dropdown.");
            } catch {}
          }
        }
      }
    }

    if (!clickedConnect) {
      return {
        success: false,
        status: "failed",
        message: profileName
          ? `Could not locate the Connect button for ${profileName}. This profile may restrict invites or require Follow.`
          : "Could not locate the Connect button on this profile.",
        recipientName: profileName,
      };
    }

    // Wait for possible Connect modal dialog
    await page.waitForTimeout(800);

    const modal = page.locator('div[role="dialog"]').first();
    const isModalVisible = await modal.isVisible({ timeout: 3500 }).catch(() => false);

    if (isModalVisible) {
      console.log("[send-connection] Connect modal detected.");

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

        let noteAdded = false;
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
              noteAdded = true;
              console.log("[send-connection] Added personalized invite note.");
            }
          } else {
            console.warn(
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
          console.log("[send-connection] Clicked modal Send button.");
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
          console.log("[send-connection] Clicked Send without note button.");
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
      console.warn(`[send-connection] Explicit error: ${explicitError}`);
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
        console.warn("[send-connection] Invitation request was dispatched, but no confirmation received within deadline.");
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

    console.log(`[send-connection] Success (${confirmationMethod}) for ${profileName || targetUrl}`);

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
