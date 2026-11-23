// Jeemu's screen as the site draws it, for baking into the renders (build_room.py --bake-ui --screen NAME):
// scripts/blender/room/screens/<name>.png at 4x the device's 320 x 240.
//   npx vite build && (npx vite preview --port 4173 &)  then  node scripts/web/capture_screens.cjs
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'blender', 'room', 'screens');
const SHOTS = { wide: 'wide', close: 'intro', play: 'question', late: 'late', end: 'waitlist' };   // rest shot -> screen name
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  await p.goto((process.argv[2] || 'http://localhost:4173/') + '?capture', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__tn); await p.waitForTimeout(3000);
  const tn = await p.evaluate(() => window.__tn);
  for (const [shot, name] of Object.entries(SHOTS)) {
    const k = tn.keys.find((k) => k.id === shot); const t = shot === 'wide' ? 0 : k.a + 0.6 * (k.b - k.a);
    await p.evaluate((t) => { const s = document.querySelector('.tn'), st = document.querySelector('.tn-stage');
      window.scrollTo(0, s.getBoundingClientRect().top + scrollY + (t / window.__tn.TOTAL) * (s.offsetHeight - st.clientHeight)); }, t);
    await p.waitForTimeout(5000);   // the text types itself out
    await p.evaluate(() => {
      document.getElementById('scr-shot')?.remove();
      const layers = [...document.querySelectorAll('.tn-layer')].filter((l) => +getComputedStyle(l).opacity > 0.9);
      const src = layers.map((l) => l.querySelector('.tn-screen')).find(Boolean);
      const box = document.createElement('div'); box.id = 'scr-shot';
      box.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:240px;transform:scale(4);transform-origin:0 0;z-index:99999;background:#060a08;';
      const c = src.cloneNode(true); c.style.cssText = 'position:absolute;left:0;top:0;width:320px;height:240px;transform:none;filter:none;visibility:visible';
      c.classList.remove('is-ui'); c.querySelectorAll('.ls-caret').forEach((x) => x.remove());
      box.appendChild(c); document.body.appendChild(box);
    });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: 1280, height: 960 } });
    console.log('screen', name);
  }
  await b.close();
})();
