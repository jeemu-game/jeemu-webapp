/**
 * Jeemu brand asset generator — Frog identity (v3.0)
 *
 * Builds every logo / mascot SVG from one geometry source so all variants stay
 * consistent, then rasterises PNGs with Microsoft Edge (via Playwright).
 *
 * Run from jeemu-webapp (where playwright lives):
 *   node ../brand-assets/build-logos.cjs
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT = __dirname;
const LOGOS = path.join(ROOT, 'logos');
const PNG = path.join(LOGOS, 'png');
const MASCOT = path.join(ROOT, 'mascot');
[LOGOS, PNG, MASCOT].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ── Palette ────────────────────────────────────────────────────────────
const C = {
  out: '#06100A',     // ink outline
  body: '#00C97B',    // frog green
  belly: '#A8E8C6',   // mint belly / flame core
  flame: '#00D97E',   // electric jade
  cream: '#E2EDE5',   // bone-sage
  char: '#0C100E',    // forest charcoal
  red: '#FF3B30',
  white: '#FFFFFF',
};

// ── Wordmark (Bagel Fat One outlines, extracted to wordmark-path.json) ──
const WMJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'wordmark-path.json'), 'utf8'));
// y in the extracted path is "down" (baseline 0, glyph tops negative)
const WM = { x0: WMJ.bb.x1, x1: WMJ.bb.x2, top: -WMJ.bb.y1, bottom: -WMJ.bb.y2 };

function wordmark(fill, scale, tx, baselineY) {
  return `<path fill="${fill}" d="${WMJ.d}" transform="translate(${tx - WM.x0 * scale},${baselineY}) scale(${scale})"/>`;
}

// ── Frog geometry (512 grid) ───────────────────────────────────────────
/**
 * @param {object} o
 * @param {'mark'|'mascot'} o.kind   simplified logo vs full character
 * @param {string} o.expr            chill | shook | sleepy | kaboom | smitten
 * @param {string|null} o.mono       single colour for 1-colour versions
 */
function frog({ kind = 'mark', expr = 'chill', mono = null } = {}) {
  const mk = kind === 'mark';
  const sw = mk ? 20 : 14; // outline weight
  const ink = mono || C.out;
  const body = mono ? 'none' : C.body;
  const belly = mono ? 'none' : C.belly;
  const flameFill = mono || C.flame;
  const flameCore = mono ? 'none' : C.belly;
  const white = mono ? 'none' : C.white;
  const bellyStroke = mono ? `stroke="${mono}" stroke-width="${sw * 0.6}"` : '';
  const out = [];

  // Feet (character only)
  if (!mk) {
    out.push(`<ellipse cx="168" cy="462" rx="46" ry="16" fill="${body}" stroke="${ink}" stroke-width="${sw}"/>`);
    out.push(`<ellipse cx="344" cy="462" rx="46" ry="16" fill="${body}" stroke="${ink}" stroke-width="${sw}"/>`);
  }

  // Arms for kaboom
  if (expr === 'kaboom') {
    const arm = (d) =>
      `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${sw + 14}" stroke-linecap="round"/>` +
      (mono ? '' : `<path d="${d}" fill="none" stroke="${C.body}" stroke-width="14" stroke-linecap="round"/>`);
    out.push(arm('M82 380 C48 360 40 300 56 262'));
    out.push(arm('M430 380 C464 360 472 300 456 262'));
  }

  // Eye bumps (behind body)
  const ex = [170, 342];
  const ey = 200;
  const er = mk ? 64 : 60;
  ex.forEach((x) => out.push(`<circle cx="${x}" cy="${ey}" r="${er}" fill="${body}" stroke="${ink}" stroke-width="${sw}"/>`));

  // Body
  out.push(`<ellipse cx="256" cy="322" rx="${mk ? 206 : 200}" ry="${mk ? 152 : 148}" fill="${body}" stroke="${ink}" stroke-width="${sw}"/>`);
  // cover lower eye-bump outline where it meets the body
  if (!mono) {
    ex.forEach((x) => out.push(`<ellipse cx="${x}" cy="${ey + 52}" rx="${er - 14}" ry="22" fill="${C.body}"/>`));
  }

  // Belly
  out.push(`<ellipse cx="256" cy="396" rx="${mk ? 112 : 104}" ry="${mk ? 74 : 70}" fill="${belly}" ${bellyStroke}/>`);

  // Cheeks (character only)
  if (!mk) {
    const ch = mono ? 'none' : C.belly;
    out.push(`<ellipse cx="116" cy="336" rx="24" ry="13" fill="${ch}" ${bellyStroke}/>`);
    out.push(`<ellipse cx="396" cy="336" rx="24" ry="13" fill="${ch}" ${bellyStroke}/>`);
  }

  // Eyes + mouth per expression
  const eyeWhite = (x, pupilOffset = 0, pr = 13, r = 38) =>
    `<circle cx="${x}" cy="${ey}" r="${r}" fill="${white}" stroke="${ink}" stroke-width="${sw * 0.5}"/>` +
    `<circle cx="${x + pupilOffset}" cy="${ey}" r="${pr}" fill="${ink}"/>`;

  const smile = (w = sw * 0.75) =>
    `<path d="M190 322 Q256 372 322 322" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;

  let flameScale = 1;
  let extras = '';
  switch (expr) {
    case 'shook':
      ex.forEach((x) => out.push(eyeWhite(x, 0, 9)));
      out.push(`<ellipse cx="256" cy="344" rx="16" ry="21" fill="${ink}"/>`);
      extras += `<path d="M430 214 q10 16 0 24 q-10 -8 0 -24z" fill="${mono || C.belly}"/>`;
      break;
    case 'sleepy':
      ex.forEach((x) => out.push(`<path d="M${x - 40} ${ey + 4} Q${x} ${ey + 38} ${x + 40} ${ey + 4}" fill="none" stroke="${ink}" stroke-width="${sw * 0.6}" stroke-linecap="round"/>`));
      out.push(`<path d="M226 336 L286 336" stroke="${ink}" stroke-width="${sw * 0.6}" stroke-linecap="round"/>`);
      flameScale = 0.55;
      extras += `<text x="396" y="120" font-family="Combo, sans-serif" font-size="46" fill="${mono || C.cream}">Zz</text>`;
      break;
    case 'smitten': {
      const heart = (x) => `<path d="M${x} ${ey + 30} C${x - 52} ${ey - 4} ${x - 30} ${ey - 40} ${x} ${ey - 18} C${x + 30} ${ey - 40} ${x + 52} ${ey - 4} ${x} ${ey + 30}Z" fill="${mono || C.red}"/>`;
      ex.forEach((x) => out.push(heart(x)));
      out.push(`<path d="M244 338 q6 -12 12 0 q6 -12 12 0 q-6 14 -12 20 q-6 -6 -12 -20z" fill="${ink}" opacity="0.0"/>`);
      out.push(`<path d="M236 336 q10 -10 20 0 q-10 8 -20 0z M256 336 q10 10 20 0 q-10 -10 -20 0z" fill="${ink}"/>`);
      break;
    }
    case 'kaboom':
      ex.forEach((x) => out.push(eyeWhite(x, 0, 14)));
      out.push(`<path d="M172 318 Q256 304 340 318 Q330 392 256 392 Q182 392 172 318Z" fill="${ink}"/>`);
      if (!mono) out.push(`<ellipse cx="256" cy="378" rx="34" ry="12" fill="${C.red}"/>`);
      flameScale = 1.55;
      extras += `<g stroke="${mono || C.flame}" stroke-width="10" stroke-linecap="round"><path d="M92 120 l28 24"/><path d="M420 120 l-28 24"/><path d="M60 176 l36 8"/><path d="M452 176 l-36 8"/></g>`;
      break;
    case 'chill':
    default: {
      const lens = mono || C.out;
      const lensR = mk ? 34 : 30;
      ex.forEach((x) => out.push(`<rect x="${x - 66}" y="${ey - 30}" width="132" height="${lensR + 40}" rx="${lensR}" fill="${lens}"/>`));
      out.push(`<rect x="236" y="${ey - 16}" width="40" height="12" rx="6" fill="${lens}"/>`);
      if (!mono) {
        ex.forEach((x) => out.push(`<path d="M${x - 40} ${ey - 6} L${x - 18} ${ey - 6}" stroke="${C.flame}" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`));
      }
      out.push(`<path d="M104 ${ey - 14} L74 ${ey - 24} M408 ${ey - 14} L438 ${ey - 24}" stroke="${mono || C.flame}" stroke-width="9" stroke-linecap="round"/>`);
      out.push(smile());
    }
  }

  // Flame
  const fx = 256;
  const fyBase = 150;
  out.push(
    `<g transform="translate(${fx},${fyBase}) scale(${flameScale}) translate(${-fx},${-fyBase})">` +
    `<path d="M256 20 C274 52 304 78 304 108 C304 134 284 152 256 152 C228 152 208 134 208 108 C208 78 238 52 256 20Z" fill="${flameFill}"/>` +
    `<path d="M256 76 C268 92 280 104 280 118 C280 132 270 140 256 140 C242 140 232 132 232 118 C232 104 244 92 256 76Z" fill="${flameCore}" ${mono ? `stroke="${C.char}" stroke-width="0"` : ''}/>` +
    `</g>`
  );
  out.push(extras);
  return out.join('');
}

// Tight bounds for the logo mark (so lockups can scale predictably)
const MARK_BOX = { x: 40, y: 14, w: 432, h: 472 };
const MARK_BOX_KABOOM = { x: 0, y: -70, w: 512, h: 570 };

function markGroup(scale, tx, ty, opts) {
  return `<g transform="translate(${tx - MARK_BOX.x * scale},${ty - MARK_BOX.y * scale}) scale(${scale})">${frog(opts)}</g>`;
}

// ── SVG builders ───────────────────────────────────────────────────────
const svg = (w, h, inner, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>\n`;

function horizontal({ text, mono = null, bg = null }) {
  const s = 0.62;
  const wmH = (WM.top - WM.bottom) * s; // ≈ 434
  const markScale = 1.0;
  const markH = MARK_BOX.h * markScale;
  const H = Math.max(markH, wmH) + 80;
  const markX = 40;
  const gap = 56;
  const wmX = markX + MARK_BOX.w * markScale + gap;
  const wmW = (WM.x1 - WM.x0) * s;
  const W = Math.ceil(wmX + wmW + 40);
  const mTop = (H - markH) / 2;
  const baseline = (H - wmH) / 2 + WM.top * s;
  return svg(W, H,
    markGroup(markScale, markX, mTop, { kind: 'mark', mono }) +
    wordmark(text, s, wmX, baseline), bg);
}

function stacked({ text, mono = null, bg = null }) {
  const s = 0.42;
  const wmW = (WM.x1 - WM.x0) * s;
  const wmH = (WM.top - WM.bottom) * s;
  const markScale = 1.05;
  const mW = MARK_BOX.w * markScale;
  const mH = MARK_BOX.h * markScale;
  const W = Math.ceil(Math.max(wmW, mW) + 160);
  const H = Math.ceil(mH + wmH + 90 + 120);
  return svg(W, H,
    markGroup(markScale, (W - mW) / 2, 60, { kind: 'mark', mono }) +
    wordmark(text, s, (W - wmW) / 2, 60 + mH + 50 + WM.top * s), bg);
}

function markOnly({ mono = null, bg = null, pad = 0 }) {
  return svg(MARK_BOX.w + pad * 2, MARK_BOX.h + pad * 2,
    markGroup(1, pad, pad, { kind: 'mark', mono }), bg);
}

function appIcon() {
  const k = 0.86;
  const tx = (512 - MARK_BOX.w * k) / 2;
  const ty = (512 - MARK_BOX.h * k) / 2 + 6;
  return svg(512, 512,
    `<rect width="512" height="512" rx="118" fill="${C.char}"/>` +
    `<rect x="9" y="9" width="494" height="494" rx="110" fill="none" stroke="${C.flame}" stroke-opacity="0.28" stroke-width="3"/>` +
    markGroup(k, tx, ty, { kind: 'mark' }));
}

function mascotSheet(expr) {
  const box = expr === 'kaboom' ? MARK_BOX_KABOOM : { x: 20, y: 0, w: 472, h: 500 };
  return svg(box.w, box.h, `<g transform="translate(${-box.x},${-box.y})">${frog({ kind: 'mascot', expr })}</g>`);
}

// ── Write SVGs ─────────────────────────────────────────────────────────
const files = {
  'jeemu-logo-mark.svg': markOnly({}),
  'jeemu-logo-mark-light.svg': markOnly({}),
  'jeemu-app-icon.svg': appIcon(),
  'jeemu-logo-horizontal.svg': horizontal({ text: C.cream }),
  'jeemu-logo-horizontal-dark-bg.svg': horizontal({ text: C.cream, bg: C.char }),
  'jeemu-logo-horizontal-light.svg': horizontal({ text: C.char }),
  'jeemu-logo-stacked.svg': stacked({ text: C.cream, bg: C.char }),
  'jeemu-logo-stacked-light.svg': stacked({ text: C.char }),
  'jeemu-logo-laser-etch.svg': horizontal({ text: '#000000', mono: '#000000' }),
  'jeemu-logo-monochrome-dark.svg': horizontal({ text: C.cream, mono: C.cream }),
  'jeemu-logo-monochrome-light.svg': horizontal({ text: C.char, mono: C.char }),
  'jeemu-logo-mark-laser-etch.svg': markOnly({ mono: '#000000' }),
};
Object.entries(files).forEach(([n, s]) => fs.writeFileSync(path.join(LOGOS, n), s));

const expressions = ['chill', 'shook', 'sleepy', 'smitten', 'kaboom'];
expressions.forEach((e) => fs.writeFileSync(path.join(MASCOT, `jeemu-frog-${e}.svg`), mascotSheet(e)));

// Browser favicon (rounded charcoal tile, tuned for 16–32px)
fs.writeFileSync(path.join(LOGOS, 'favicon.svg'), appIcon());

console.log('SVGs written:', Object.keys(files).length + expressions.length + 1);

// ── Rasterise PNGs ─────────────────────────────────────────────────────
(async () => {
  const req = createRequire(path.resolve(process.cwd(), 'package.json'));
  const { chromium } = req('playwright');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge' });
  } catch (e) {
    console.warn('Edge launch failed, skipping PNGs:', e.message);
    return;
  }
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const targets = [];
  Object.keys(files).forEach((n) => targets.push([path.join(LOGOS, n), path.join(PNG, n.replace('.svg', '.png')), n.includes('app-icon') ? 1024 : null, n]));
  expressions.forEach((e) => targets.push([path.join(MASCOT, `jeemu-frog-${e}.svg`), path.join(MASCOT, `jeemu-frog-${e}.png`), 1024, e]));

  for (const [src, dst, fixed] of targets) {
    const markup = fs.readFileSync(src, 'utf8');
    const m = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    // Normalise: wide lockups → 1200px wide, squarish → 1024px tall
    const k = fixed ? fixed / Math.max(w, h) : 1200 / w;
    const tw = Math.round(w * k);
    const th = Math.round(h * k);
    await page.setViewportSize({ width: tw, height: th });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markup.replace(/width="[\d.]+" height="[\d.]+"/, `width="${tw}" height="${th}"`)}</body></html>`
    );
    await page.screenshot({ path: dst, omitBackground: true });
  }
  // Email / apple-touch sizes
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<html><body style="margin:0;background:transparent"><img src="file:///${path.join(LOGOS, 'jeemu-app-icon.svg').replace(/\\/g, '/')}" width="180" height="180"></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(PNG, 'apple-touch-icon.png'), omitBackground: true });
  await browser.close();
  console.log('PNGs written');
})();
