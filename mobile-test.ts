import { chromium, devices } from 'playwright';

async function testMobileLogin() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
  });

  const page = await context.newPage();

  try {
    console.log('Testing mobile responsiveness...\n');

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/Users/vezcode/Documents/VEZ/mobile-login.png', fullPage: true });
    console.log('Screenshot saved: mobile-login.png');

    const viewport = page.viewportSize();
    console.log(`Viewport: ${viewport?.width}x${viewport?.height}`);

    const loginButton = await page.locator('button[type="submit"]').first();
    const isVisible = await loginButton.isVisible();
    const buttonBox = await loginButton.boundingBox();

    console.log(`\nLogin button:`);
    console.log(`  Visible: ${isVisible}`);
    console.log(`  Size: ${buttonBox?.width}x${buttonBox?.height}px`);

    const isTouchTargetOk = buttonBox && buttonBox.width >= 44 && buttonBox.height >= 44;
    console.log(`  Touch target OK (>=44px): ${isTouchTargetOk ? 'YES' : 'NO'}`);

    const emailInput = await page.locator('input[name="email"]').first();
    const passwordInput = await page.locator('input[name="password"]').first();

    console.log(`\nForm inputs:`);
    console.log(`  Email visible: ${await emailInput.isVisible() ? 'YES' : 'NO'}`);
    console.log(`  Password visible: ${await passwordInput.isVisible() ? 'YES' : 'NO'}`);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`\nHorizontal scroll: ${hasHorizontalScroll ? 'DETECTED' : 'None'}`);

    const whiteSphere = await page.locator('canvas').first();
    const isSphereVisible = await whiteSphere.isVisible().catch(() => false);
    console.log(`WhiteSphere animation: ${isSphereVisible ? 'Visible' : 'Hidden on mobile'}`);

    const bodyText = await page.textContent('body');
    console.log(`\nText content check:`);
    console.log(`  "Zaloguj się": ${bodyText?.includes('Zaloguj się') ? 'YES' : 'NO'}`);
    console.log(`  "Email": ${bodyText?.includes('Email') ? 'YES' : 'NO'}`);
    console.log(`  "Hasło": ${bodyText?.includes('Hasło') ? 'YES' : 'NO'}`);

    const logo = await page.locator('img[alt="vezCore"]').first();
    const logoVisible = await logo.isVisible().catch(() => false);
    console.log(`\nLogo visible: ${logoVisible ? 'YES' : 'NO'}`);

    const issues = [];
    if (!isTouchTargetOk) issues.push('Button touch target too small (<44px)');
    if (hasHorizontalScroll) issues.push('Horizontal scroll detected');
    if (isSphereVisible) issues.push('WhiteSphere visible on mobile');
    if (!isVisible) issues.push('Login button not visible');

    if (issues.length === 0) {
      console.log('\nAll mobile checks passed!');
    } else {
      console.log('\nIssues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: '/Users/vezcode/Documents/VEZ/mobile-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testMobileLogin();
