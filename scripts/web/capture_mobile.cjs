// Bakes the phone version of the night (src/components/tonight/MobileStage.jsx): one finished portrait frame per stop,
// the tower-fall frames, a short fire loop for each shot that shows the fireplace, and where Jeemu's screen sits on the
// waitlist frame. Everything comes from the full engine (?capture: words hidden), so the phone frames match the desktop.
//
//   npx vite build && (npx vite preview --port 4173 &)
//   node scripts/web/capture_mobile.cjs [http://localhost:4173/]
//   python3 scripts/web/stamp_assets.py        (new version stamp, so phones fetch the new frames)
//
// Run it again after any change to the renders, the words' layout or the story's beats.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const URL = (process.argv[2] || 'http://localhost:4173/') + '?capture';
const W = 400, H = 860, DPR = 2;               // a tall phone; shorter and wider ones crop a little off the edges
const OUT = path.join(__dirname, '..', '..', 'public', 'tonight', 'm');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mcap-'));
const FIRE_FRAMES = 150, FIRE_FPS = 15;         // the fire clip's own loop (public/tonight/fire.mp4: 10 s at 15 fps)
const pad = (i) => String(i).padStart(2, '0');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'fall'), { recursive: true });
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })).newPage();
  p.on('pageerror', (e) => console.log('page error:', e.message));
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__tn);
  await p.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
  await p.waitForTimeout(7000);   // the lights come up, the fire catches

  const go = async (t, settle = 2600) => {
    await p.evaluate((t) => { const s = document.querySelector('.tn'), st = document.querySelector('.tn-stage');
      const top = s.getBoundingClientRect().top + scrollY; window.scrollTo(0, top + (t / window.__tn.TOTAL) * (s.offsetHeight - st.clientHeight)); }, t);
    await p.waitForTimeout(settle);
    await p.waitForFunction(() => [...document.querySelectorAll('.tn-stage img')].every((im) => im.complete), null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(250);
  };
  const shot = async (file, clip) => p.screenshot({ path: file, ...(clip ? { clip } : {}) });

  const tn = await p.evaluate(() => window.__tn);
  const man = { w: W, h: H, fall: 0, fire: {}, screen: null };
  for (const k of tn.keys) {
    const t = k.id === 'wide' ? 0 : k.a + 0.6 * (k.b - k.a);
    await go(t, k.id === 'wide' ? 400 : 2600);
    const png = path.join(TMP, `${k.id}.png`); await shot(png);
    console.log('frame', k.id, Math.round(t));
    if (k.id === 'end') man.screen = (await p.evaluate(() => window.__tn.endScreen)) || null;

    // the fireplace, if this frame shows it: a loop cut from exactly this frame (the tower in front stays put)
    const box = await p.evaluate(() => {
      const fw = [...document.querySelectorAll('.tn-firewrap')].filter((el) => getComputedStyle(el.closest('.tn-layer')).opacity > 0.9);
      if (!fw.length) return null;
      const r = fw[0].getBoundingClientRect(), x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
      return x1 - x0 > 40 && y1 - y0 > 24 ? [x0, y0, x1 - x0, y1 - y0] : null;
    });
    if (box) {
      const r = box.map((v, i) => (i < 2 ? Math.floor(v / 2) * 2 : Math.ceil(v / 2) * 2));   // even pixels for the video
      const dir = path.join(TMP, `fire_${k.id}`); fs.mkdirSync(dir);
      await p.evaluate(() => document.querySelectorAll('.tn-firewrap video').forEach((v) => v.pause()));
      for (let f = 0; f < FIRE_FRAMES; f++) {
        await p.evaluate(async (tt) => { await Promise.all([...document.querySelectorAll('.tn-firewrap video')].map((v) => new Promise((res) => {
          v.addEventListener('seeked', res, { once: true }); v.currentTime = tt; setTimeout(res, 800); }))); }, f / FIRE_FPS);
        await shot(path.join(dir, `${String(f).padStart(3, '0')}.png`), { x: r[0], y: r[1], width: r[2], height: r[3] });
      }
      await p.evaluate(() => document.querySelectorAll('.tn-firewrap video').forEach((v) => v.play()));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FIRE_FPS), '-i', path.join(dir, '%03d.png'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'veryslow', '-g', '60', '-movflags', '+faststart', '-an', path.join(OUT, `fire_${k.id}.mp4`)]);
      man.fire[k.id] = r; console.log('  fire loop', k.id, r.join(','));
    }

    // the fall comes between the late shot and the fallen tower: every frame, from the same camera
    if (k.id === 'late') {
      await go(tn.fall.from + 1, 1500);
      const n = await p.evaluate(() => window.__tn.fallCount);
      for (let f = 0; f < n; f++) {
        const tt = tn.START.fall[0] + tn.START.fall[1] * (f / ((n - 1) * 1.15)) + 0.05;
        await go(tt, 500);
        await p.waitForFunction((f) => { const im = document.querySelector('.tn-fallframe'); return im && im.complete && im.src.includes(`/fall/${String(f).padStart(2, '0')}.`); }, f, { timeout: 15000 }).catch(() => console.log('  fall frame late', f));
        await shot(path.join(TMP, `fall_${pad(f)}.png`));
      }
      man.fall = n; console.log('  fall frames', n);
    }
  }
  await b.close();

  // pictures: JPEG plus the AVIF/WebP copies the site prefers
  const py = `
import glob, os, sys
sys.path.insert(0, ${JSON.stringify(path.join(__dirname))})
from modern_formats import convert
from PIL import Image
tmp, out = ${JSON.stringify(TMP)}, ${JSON.stringify(OUT)}
for f in sorted(glob.glob(os.path.join(tmp, '*.png'))):
    n = os.path.basename(f)[:-4]
    dst = os.path.join(out, 'fall', n[5:] + '.jpg') if n.startswith('fall_') else os.path.join(out, n + '.jpg')
    Image.open(f).convert('RGB').save(dst, quality=80, optimize=True, progressive=True)
    convert(dst)
`;
  execFileSync('python3', ['-c', py], { stdio: 'inherit' });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(man));
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('wrote', OUT);
})();
