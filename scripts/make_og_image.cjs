// Builds public/og-image.jpg (1200x630, the link preview) from the live landing frame: the render, the filmed fire,
// the headline. Run against a local build after each re-render:
//   npx vite build && npx vite preview --port 4173 &   then   node scripts/make_og_image.cjs [url]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = process.argv[2] || 'http://localhost:4173/';
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => { const v = document.querySelector('.tn-firewrap video'); return v && !v.paused && v.currentTime > 1.2; }, null, { timeout: 20000 });
  await p.addStyleTag({ content: `
    .tb, .tn-hint { display: none !important; }
    .og-foot { position: fixed; left: 44px; right: 44px; bottom: 34px; z-index: 99; display: flex; align-items: baseline; justify-content: space-between; }
    .og-mark { font-family: var(--tn-brand); font-size: 2.6rem; line-height: 1; color: #f2eadf; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
    .og-date { font: 500 1.35rem/1 var(--tn-sans); color: rgba(242,234,223,.92); text-shadow: 0 2px 14px rgba(0,0,0,.7); }` });
  await p.evaluate(() => { const d = document.createElement('div'); d.className = 'og-foot';
    d.innerHTML = '<span class="og-mark">Jeemu</span><span class="og-date">Kickstarter · 24 November</span>'; document.body.appendChild(d); });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(6000);   // past the opening fade-in and the headline
  const tmp = path.join(require('os').tmpdir(), 'og.png'); await p.screenshot({ path: tmp });
  await b.close();
  // the screenshot is at 2x: down to 1200x630 with a clean resample
  require('child_process').execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(tmp)}).convert('RGB').resize((1200,630), Image.LANCZOS).save(${JSON.stringify(path.join(__dirname, '..', 'public', 'og-image.jpg'))}, quality=88, optimize=True, progressive=True)`]);
  console.log('wrote public/og-image.jpg');
})();
