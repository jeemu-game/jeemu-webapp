import { chromium } from 'playwright';
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'Desktop 1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: 'Desktop 1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'iPad Tablet 768x1024', width: 768, height: 1024, isMobile: true },
  { name: 'iPhone 14 Pro 393x852', width: 393, height: 852, isMobile: true },
  { name: 'iPhone SE 375x667', width: 375, height: 667, isMobile: true }
];

async function runE2ETests() {
  console.log('🚀 Starting Comprehensive Jeemu E2E Browser Test Suite...\n');
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // Test 1: Multi-Viewport Responsive Layout Audit (Zero Overflow)
    // -------------------------------------------------------------
    console.log('📱 1. Testing Multi-Viewport Responsiveness & Zero Horizontal Overflow:');
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const overflowAudit = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        return {
          docW,
          scrollW,
          hasHorizontalScroll: scrollW > docW + 2
        };
      });

      assert(
        !overflowAudit.hasHorizontalScroll,
        `Viewport ${vp.name} has horizontal overflow! (clientWidth: ${overflowAudit.docW}, scrollWidth: ${overflowAudit.scrollW})`
      );
      console.log(`   ✓ ${vp.name}: width=${overflowAudit.docW}px, no horizontal scroll`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Test 2: Hero Media Carousel Interactions (Next, Prev, Pills, Swipe)
    // -------------------------------------------------------------
    console.log('\n🎠 2. Testing Hero Carousel Interactions & Counter:');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Verify initial counter
      const counterEl = page.locator('.carousel-counter-text');
      await counterEl.waitFor({ state: 'visible' });
      const initialCount = await counterEl.textContent();
      assert(initialCount.includes('01 / 05'), `Expected initial slide 01 / 05, got: ${initialCount}`);
      console.log('   ✓ Initial carousel counter is 01 / 05');

      // Click next button
      const nextBtn = page.locator('button[aria-label="Next slide"]');
      await nextBtn.click();
      await page.waitForTimeout(300);
      const afterNextCount = await counterEl.textContent();
      assert(afterNextCount.includes('02 / 05'), `Expected slide 02 / 05, got: ${afterNextCount}`);
      console.log('   ✓ Next button advanced carousel to 02 / 05');

      // Click pill #4 (index 3)
      const pills = page.locator('.carousel-pill-btn');
      await pills.nth(3).click();
      await page.waitForTimeout(300);
      const pillCount = await counterEl.textContent();
      assert(pillCount.includes('04 / 05'), `Expected slide 04 / 05, got: ${pillCount}`);
      console.log('   ✓ Direct pill jump shifted carousel to 04 / 05');

      // Click prev button
      const prevBtn = page.locator('button[aria-label="Previous slide"]');
      await prevBtn.click();
      await page.waitForTimeout(300);
      const afterPrevCount = await counterEl.textContent();
      assert(afterPrevCount.includes('03 / 05'), `Expected slide 03 / 05, got: ${afterPrevCount}`);
      console.log('   ✓ Prev button shifted carousel back to 03 / 05');

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 3: Micro-Funnel End-to-End Flow (Email -> Supabase -> Referral -> Social)
    // -------------------------------------------------------------
    console.log('\n🎯 3. Testing 2-Step Micro-Funnel Complete Flow:');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      const emailInput = page.locator('input[type="email"]');
      const nameInput = page.locator('input[placeholder*="First name"]');
      const submitBtn = page.locator('.funnel-submit-btn');

      const testEmail = `playwright_e2e_${Date.now()}@jeemu.test`;
      const testName = 'Playwright Tester';

      await emailInput.fill(testEmail);
      await nameInput.fill(testName);
      await submitBtn.click();

      // Wait for step 2 card
      const step2Card = page.locator('.step2-card');
      await step2Card.waitFor({ state: 'visible', timeout: 8000 });
      console.log('   ✓ Form submitted successfully, Step 2 confirmation card displayed');

      // Verify referral code input
      const referralInput = page.locator('.referral-input-row input');
      const referralVal = await referralInput.inputValue();
      assert(referralVal.includes('?ref=JEEMU-'), `Expected referral link with ?ref=JEEMU-, got: ${referralVal}`);
      console.log(`   ✓ Unique referral link generated: ${referralVal}`);

      // Verify 1-click social share links
      const waBtn = page.locator('#share-wa-btn');
      const xBtn = page.locator('#share-x-btn');
      const fbBtn = page.locator('#share-fb-btn');
      await waBtn.waitFor({ state: 'visible' });
      await xBtn.waitFor({ state: 'visible' });
      await fbBtn.waitFor({ state: 'visible' });

      const waHref = await waBtn.getAttribute('href');
      assert(waHref && waHref.includes('whatsapp.com'), 'WhatsApp share button missing valid URL');
      console.log('   ✓ 1-Click WhatsApp, X, and Facebook social share buttons verified');

      // Verify $1 VIP Reservation button
      const vipBtn = page.locator('.vip-upgrade-prompt button');
      await vipBtn.waitFor({ state: 'visible' });
      const vipText = await vipBtn.textContent();
      assert(vipText.includes('$1 VIP'), `Expected $1 VIP button text, got: ${vipText}`);
      console.log('   ✓ Optional $1 VIP upgrade prompt verified');

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 4: Tactile Hardware Simulator (Block Tapping & OLED Feedback)
    // -------------------------------------------------------------
    console.log('\n🎛️ 4. Testing Tactile Hardware Simulator & OLED Display:');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Click Café & Hospitality category pill
      const cafePill = page.locator('#cat-cafe');
      await cafePill.waitFor({ state: 'visible' });
      await cafePill.click();
      await page.waitForTimeout(300);

      // Verify OLED mode header updated
      const oledMode = page.locator('#oled-mode-name');
      const modeText = await oledMode.textContent();
      assert(modeText.includes('CAFÉ & HOSPITALITY'), `Expected OLED mode CAFÉ & HOSPITALITY, got: ${modeText}`);
      console.log(`   ✓ Selected category updated OLED mode title to: "${modeText}"`);

      // Click Block #23
      const block23Btn = page.locator('#block-btn-23');
      await block23Btn.click();
      await page.waitForTimeout(500);

      // Verify docked indicator text
      const dockedIndicator = page.locator('#docked-block-text');
      const dockedText = await dockedIndicator.textContent();
      assert(dockedText.includes('23'), `Expected docked block #23, got: ${dockedText}`);

      // Verify OLED block id tag
      const oledBlockId = page.locator('#oled-block-id');
      const blockIdText = await oledBlockId.textContent();
      assert(blockIdText.includes('BLOCK #23'), `Expected OLED BLOCK #23, got: ${blockIdText}`);
      console.log('   ✓ Block #23 docked onto NFC pad and verified in OLED screen');

      // Test sound toggle
      const soundBtn = page.locator('#sim-sound-toggle-btn');
      await soundBtn.click();
      const soundText = await soundBtn.textContent();
      assert(soundText.includes('OFF'), 'Expected sound toggle to switch to OFF');
      console.log('   ✓ Simulator sound toggle verified');

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 5: Sticky Glass Navbar & Smooth Navigation
    // -------------------------------------------------------------
    console.log('\n🧭 5. Testing Sticky Glass Navbar & Dynamic Backer Counter:');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Check live counter in navbar
      const navStats = page.locator('.live-counter-pill strong');
      await navStats.waitFor({ state: 'visible' });
      const statsText = await navStats.textContent();
      assert(statsText.includes('Backers'), `Expected live backer counter, got: ${statsText}`);
      console.log(`   ✓ Navbar live backer counter active: "${statsText}"`);

      // Test CTA scroll
      const ctaBtn = page.locator('.nav-actions button');
      await ctaBtn.click();
      await page.waitForTimeout(500);

      const funnelVisible = await page.locator('#reserve-funnel').isVisible();
      assert(funnelVisible, 'Funnel section should be visible after clicking Reserve CTA');
      console.log('   ✓ Navbar "Reserve $1 VIP" button scrolled directly to micro-funnel');

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 6: FAQ Accordion Expand/Collapse
    // -------------------------------------------------------------
    console.log('\n❓ 6. Testing FAQ Accordion Functionality:');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      const faqItems = page.locator('.faq-item');
      const count = await faqItems.count();
      assert(count >= 5, `Expected at least 5 FAQ items, found: ${count}`);

      // First FAQ should be open by default
      const firstAnswer = faqItems.nth(0).locator('.faq-content');
      await firstAnswer.waitFor({ state: 'visible' });

      // Click second FAQ
      const secondTrigger = faqItems.nth(1).locator('.faq-trigger');
      await secondTrigger.click();
      await page.waitForTimeout(200);

      const secondAnswer = faqItems.nth(1).locator('.faq-content');
      await secondAnswer.waitFor({ state: 'visible' });
      console.log(`   ✓ Verified ${count} FAQ questions with dynamic accordion toggling`);

      await page.close();
    }

    console.log('\n🎉 ALL END-TO-END BROWSER TESTS PASSED FLAWLESSLY!\n');
  } finally {
    await browser.close();
  }
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E Test Failure:', err);
  process.exit(1);
});
