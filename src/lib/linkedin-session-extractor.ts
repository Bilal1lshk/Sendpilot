import { chromium, type Browser } from 'playwright';

export interface ExtractedSessionResult {
  success: boolean;
  li_at?: string;
  jsessionId?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    headline?: string;
    avatar?: string;
  };
  error?: string;
}

export interface ExtractOptions {
  email: string;
  password: string;
  headless?: boolean;
  timeout?: number;
  onProgress?: (stage: string) => void;
}

/**
 * Verifies active session using LinkedIn Voyager API
 */
export async function verifyLinkedInSession(liAt: string, jsessionId?: string) {
  try {
    const cleanCsrf = jsessionId ? jsessionId.replace(/"/g, '') : '';
    const res = await fetch('https://www.linkedin.com/voyager/api/me', {
      redirect: 'manual',
      headers: {
        'Cookie': `li_at=${liAt}; JSESSIONID="${cleanCsrf}"`,
        'csrf-token': cleanCsrf,
        'x-restli-protocol-version': '2.0.0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1'
      }
    });

    if (res.status === 200) {
      const json = await res.json().catch(() => null);
      const plainInfo = json?.data || json?.miniProfile || {};
      const firstName = plainInfo.firstName || plainInfo.localizedFirstName || '';
      const lastName = plainInfo.lastName || plainInfo.localizedLastName || '';
      const headline = plainInfo.occupation || plainInfo.headline || '';

      return {
        active: true,
        status: 200,
        profile: { firstName, lastName, headline }
      };
    }

    return {
      active: false,
      status: res.status
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error during verification';
    return { active: false, error: message };
  }
}

/**
 * Automates real browser login to bypass anti-bot challenges and extract li_at and JSESSIONID
 */
export async function extractLinkedInSession({
  email,
  password,
  headless = false,
  timeout = 90000,
  onProgress
}: ExtractOptions): Promise<ExtractedSessionResult> {
  let browser: Browser | null = null;
  onProgress?.('Launching real browser engine...');

  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--start-maximized'
      ]
    }).catch(async () => {
      return await chromium.launch({ headless });
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
    });

    const page = await context.newPage();

    onProgress?.('Loading LinkedIn login page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    onProgress?.('Filling credentials...');
    const emailInput = page.locator('input[type="email"]:visible, input[name="session_key"]:visible, #username:visible').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);

    const passInput = page.locator('input[type="password"]:visible, input[name="session_password"]:visible, #password:visible').first();
    await passInput.waitFor({ state: 'visible', timeout: 15000 });
    await passInput.fill(password);

    onProgress?.('Submitting login form...');
    await passInput.press('Enter');

    await page.waitForTimeout(1000);
    const exactSignInBtn = page.getByRole('button', { name: /^sign in$/i }).first();
    if (await exactSignInBtn.isVisible().catch(() => false)) {
      await exactSignInBtn.click().catch(() => {});
    }

    onProgress?.('Monitoring authentication & intercepting session cookies...');
    const startTime = Date.now();
    let foundLiAt = '';
    let foundJsessionId = '';

    while (Date.now() - startTime < timeout) {
      // 1. Check cookies
      const cookies = await context.cookies();
      const liAtCookie = cookies.find(c => c.name === 'li_at');
      const jsessionIdCookie = cookies.find(c => c.name === 'JSESSIONID');

      if (liAtCookie && liAtCookie.value) {
        foundLiAt = liAtCookie.value;
        foundJsessionId = jsessionIdCookie?.value || '';
        break;
      }

      // 2. Check for credential errors
      const bodyText = await page.innerText('body').catch(() => '');
      if (
        bodyText.includes("That's not the right password") ||
        bodyText.includes("Couldn't find a LinkedIn account") ||
        bodyText.includes("Wrong password") ||
        bodyText.includes("Please enter a valid username")
      ) {
        await browser.close();
        return { success: false, error: 'Incorrect LinkedIn email or password provided.' };
      }

      // 3. Check for alerts
      const errorElements = await page.locator('[role="alert"], #error-for-username, #error-for-password, [data-qa-alert="error"]').all();
      for (const el of errorElements) {
        if (await el.isVisible().catch(() => false)) {
          const txt = (await el.innerText().catch(() => '')).trim();
          if (txt) {
            await browser.close();
            return { success: false, error: txt };
          }
        }
      }

      // 4. Check for 2FA or CAPTCHA checkpoint
      const currentUrl = page.url();
      if (currentUrl.includes('/checkpoint/') || bodyText.includes('verification code') || bodyText.includes('quick security check')) {
        onProgress?.('Security checkpoint active. Complete the 2FA code or puzzle in the open window...');
      }

      await page.waitForTimeout(1500);
    }

    if (!foundLiAt) {
      await browser.close();
      return { success: false, error: `Authentication timed out after ${timeout / 1000}s. If 2FA was sent, please complete it promptly.` };
    }

    onProgress?.('Verifying session with LinkedIn Voyager API...');
    const verification = await verifyLinkedInSession(foundLiAt, foundJsessionId);

    await browser.close();

    return {
      success: true,
      li_at: foundLiAt,
      jsessionId: foundJsessionId,
      profile: verification.profile
    };

  } catch (err: unknown) {
    if (browser) await browser.close();
    const message = err instanceof Error ? err.message : 'Unknown browser automation error';
    return { success: false, error: message };
  }
}
