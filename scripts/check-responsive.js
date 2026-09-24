import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/Asus/.gemini/antigravity-ide/brain/a4ed4506-85e2-4147-985c-5648e3255392/responsive-tests';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 }
];

async function run() {
  const browser = await chromium.launch();
  const results = [];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const shotPath = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({ path: shotPath });

    const audit = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const docScrollW = document.documentElement.scrollWidth;

      // Find overflowing elements
      const allEls = document.querySelectorAll('*');
      const overflowing = [];
      for (const el of allEls) {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 2) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            cls: el.className,
            right: r.right,
            docWidth: docW
          });
        }
      }

      const product = document.querySelector('.product');
      const canvas = document.querySelector('#product');
      const intro = document.querySelector('.intro.panel');
      const card = document.querySelector('.hero-reservation-card');
      const stage = document.querySelector('.hero-sticky-stage');
      const track = document.querySelector('.hero-scrolly-track');

      return {
        hasHorizontalScroll: docScrollW > docW,
        docW,
        docScrollW,
        overflowCount: overflowing.length,
        topOverflows: overflowing.slice(0, 5),
        productRect: product ? product.getBoundingClientRect() : null,
        canvasRect: canvas ? canvas.getBoundingClientRect() : null,
        introRect: intro ? intro.getBoundingClientRect() : null,
        cardRect: card ? card.getBoundingClientRect() : null,
        stageRect: stage ? stage.getBoundingClientRect() : null,
        trackRect: track ? track.getBoundingClientRect() : null,
      };
    });

    results.push({ viewport: vp.name, audit, shotPath });
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
