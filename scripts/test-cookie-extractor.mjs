import { chromium } from 'playwright';

async function testBrowser() {
  console.log('Testing browser availability...');
  try {
    // Try launching with msedge or system chrome first
    const browser = await chromium.launch({
      headless: true,
      channel: 'msedge'
    }).catch(async () => {
      console.log('Edge not found directly, trying default chromium...');
      return await chromium.launch({ headless: true });
    });
    console.log('Browser launched successfully!');
    const version = browser.version();
    console.log('Browser version:', version);
    await browser.close();
  } catch (err) {
    console.error('Launch error:', err.message);
  }
}

testBrowser();
