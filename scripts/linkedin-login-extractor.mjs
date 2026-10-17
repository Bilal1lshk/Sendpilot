import { chromium } from 'playwright';
import readline from 'readline';

/**
 * Verify if captured LinkedIn cookies can access authenticated APIs
 */
export async function verifyLinkedInCookies(liAt, jsessionId) {
  console.log('\n🔍 Verifying cookies with LinkedIn Voyager API...');
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
      console.log('✅ Cookie verification status: 200 OK (Session is Active!)');
      
      const plainInfo = json?.data || json?.miniProfile || {};
      const firstName = plainInfo.firstName || plainInfo.localizedFirstName || '';
      const lastName = plainInfo.lastName || plainInfo.localizedLastName || '';
      const headline = plainInfo.occupation || plainInfo.headline || '';
      
      if (firstName || lastName) {
        console.log(`👤 Connected Profile: ${firstName} ${lastName}`);
      }
      if (headline) {
        console.log(`📌 Headline: ${headline}`);
      }
      return { active: true, status: 200, profile: { firstName, lastName, headline } };
    } else if (res.status === 302 || res.status === 401 || res.status === 403) {
      console.log(`❌ Cookie is INVALID or EXPIRED (HTTP ${res.status} redirect to login).`);
      return { active: false, status: res.status };
    } else {
      console.log(`⚠️ LinkedIn API returned HTTP ${res.status}: ${res.statusText}`);
      return { active: false, status: res.status };
    }
  } catch (err) {
    console.error('❌ Verification request error:', err.message);
    return { active: false, error: err.message };
  }
}

/**
 * Robust LinkedIn Cookie Extractor using real browser automation
 */
export async function extractLinkedInCookies({ email, password, headless = false, timeout = 90000 }) {
  console.log('\n==================================================');
  console.log('🚀 Starting LinkedIn Automation Session');
  console.log(`👤 Target User: ${email}`);
  console.log(`🖥️ Mode: ${headless ? 'Headless (Invisible)' : 'Visible (Headed - Recommended for 2FA/CAPTCHA)'}`);
  console.log('==================================================\n');

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--start-maximized'
      ]
    }).catch(async (e) => {
      console.log('Notice: msedge channel failed, attempting chromium default...', e.message);
      return await chromium.launch({ headless });
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
    });

    const page = await context.newPage();

    console.log('🌐 Loading LinkedIn Login Page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    console.log('✍️ Locating visible input fields...');
    const emailInput = page.locator('input[type="email"]:visible, input[name="session_key"]:visible, #username:visible').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);

    const passInput = page.locator('input[type="password"]:visible, input[name="session_password"]:visible, #password:visible').first();
    await passInput.waitFor({ state: 'visible', timeout: 15000 });
    await passInput.fill(password);

    console.log('🔘 Submitting credentials via Enter key...');
    await passInput.press('Enter');

    // Also click Sign in if form didn't submit
    await page.waitForTimeout(1000);
    const exactSignInBtn = page.getByRole('button', { name: /^sign in$/i }).first();
    if (await exactSignInBtn.isVisible().catch(() => false)) {
      await exactSignInBtn.click().catch(() => {});
    }

    console.log('⏳ Monitoring login status and cookies...');
    const startTime = Date.now();
    let foundLiAt = null;
    let foundJsessionId = null;
    let lastUrl = '';

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

      const currentUrl = page.url();
      if (currentUrl !== lastUrl) {
        console.log(`📍 Page URL: ${currentUrl}`);
        lastUrl = currentUrl;
      }

      // Check for error text inside main or form container
      const bodyText = await page.innerText('body').catch(() => '');
      if (
        bodyText.includes("That's not the right password") ||
        bodyText.includes("Couldn't find a LinkedIn account") ||
        bodyText.includes("Wrong password") ||
        bodyText.includes("Please enter a valid username")
      ) {
        console.error('\n❌ LinkedIn Credential Error: Incorrect email or password provided.');
        await browser.close();
        return { success: false, error: 'Incorrect email or password.' };
      }

      // 2. Check for explicit error messages on page
      const errorElements = await page.locator('[role="alert"], #error-for-username, #error-for-password, .alert, .form__label--error, [data-qa-alert="error"]').all();
      for (const el of errorElements) {
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          const txt = (await el.innerText().catch(() => '')).trim();
          if (txt) {
            console.error(`\n❌ LinkedIn Alert: "${txt}"`);
            await browser.close();
            return { success: false, error: txt };
          }
        }
      }

      // 3. Check for checkpoint / 2FA
      if (currentUrl.includes('/checkpoint/') || bodyText.includes('verification code') || bodyText.includes('quick security check')) {
        console.log('⚠️ LinkedIn Security Checkpoint active (Email OTP or CAPTCHA).');
        console.log('👉 Complete the verification in the open browser window to finish extraction...');
      }

      await page.waitForTimeout(2000);
    }

    if (!foundLiAt) {
      throw new Error(`Timed out waiting for login after ${timeout / 1000} seconds.`);
    }

    console.log('\n🎉 SUCCESS! Authentication verified and cookies captured:');
    console.log('==================================================');
    console.log(`li_at: ${foundLiAt}`);
    console.log(`JSESSIONID: ${foundJsessionId}`);
    console.log('==================================================');

    // Perform live API verification
    await verifyLinkedInCookies(foundLiAt, foundJsessionId);

    await browser.close();
    return {
      success: true,
      li_at: foundLiAt,
      JSESSIONID: foundJsessionId
    };

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Automation Error:', err.message);
    return { success: false, error: err.message };
  }
}

// CLI handler
if (process.argv[1]?.endsWith('linkedin-login-extractor.mjs')) {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];

  if (arg1 === '--verify') {
    if (!arg2) {
      console.log('Usage: node scripts/linkedin-login-extractor.mjs --verify "<li_at>" "[JSESSIONID]"');
      process.exit(1);
    }
    const arg3 = process.argv[4] || '';
    verifyLinkedInCookies(arg2, arg3);
  } else if (arg1 && arg2) {
    extractLinkedInCookies({ email: arg1, password: arg2, headless: false });
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('==================================================');
    console.log('LinkedIn Cookie Extractor & Verifier (Playwright)');
    console.log('==================================================');
    rl.question('LinkedIn Email: ', (email) => {
      rl.question('LinkedIn Password: ', (password) => {
        rl.close();
        if (!email || !password) {
          console.log('Email and password required.');
          process.exit(1);
        }
        extractLinkedInCookies({ email, password, headless: false });
      });
    });
  }
}
