const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function render() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800, deviceScaleFactor: 2 } });
  
  // 1. Horizontal dark bg logo
  const svgDarkPath = path.resolve('public/brand/logos/jeemu-logo-horizontal-dark-bg.svg');
  if (fs.existsSync(svgDarkPath)) {
    const content = fs.readFileSync(svgDarkPath, 'utf8');
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0; background:transparent;">${content}</body></html>`);
    const svgEl = await page.$('svg');
    if (svgEl) {
      await svgEl.screenshot({ path: 'public/brand/logos/jeemu-logo-horizontal.png', omitBackground: true });
      console.log('Generated jeemu-logo-horizontal.png');
    }
  }

  // 2. Logo mark
  const svgMarkPath = path.resolve('public/brand/logos/jeemu-logo-mark.svg');
  if (fs.existsSync(svgMarkPath)) {
    const content = fs.readFileSync(svgMarkPath, 'utf8');
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0; background:transparent; display:flex; justify-content:center; align-items:center;">${content}</body></html>`);
    const svgEl = await page.$('svg');
    if (svgEl) {
      await svgEl.screenshot({ path: 'public/brand/logos/jeemu-logo-mark.png', omitBackground: true });
      console.log('Generated jeemu-logo-mark.png');
    }
  }

  await browser.close();
}

render().catch(console.error);
