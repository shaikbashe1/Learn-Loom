const puppeteer = require('puppeteer');

async function runTest() {
  console.log('Starting E2E Test...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Signup...');
    const targetUrl = process.env.TEST_URL || 'https://learn-loom-indol.vercel.app/signup';
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    const uniqueEmail = `testuser_${Date.now()}+clerk_test@example.com`;
    const password = 'TestPassword123!';
    
    console.log(`Filling form for ${uniqueEmail}...`);
    await page.type('#name', 'Automated Test User');
    await page.type('#email', uniqueEmail);
    await page.type('#password', password);
    await page.click('#terms');
    
    console.log('Submitting...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for verification code stage...');
    await page.waitForSelector('input[placeholder="123456"]', { timeout: 10000 });
    console.log('SUCCESS: Reached verification code stage bypass!');
    
    console.log('Entering verification code 424242...');
    await page.type('input[placeholder="123456"]', '424242');
    
    console.log('Submitting verification...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for redirect to dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('SUCCESS: Successfully registered and reached dashboard!');
    } else {
      console.log('WARNING: Did not reach dashboard. Current URL:', url);
    }
    
    console.log('\n--- E2E Test Completed ---');
    
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await browser.close();
  }
}

runTest();
