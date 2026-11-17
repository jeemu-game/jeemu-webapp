import React, { useEffect, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import Pic from './Pic';
import { ASSET_V } from './assetVersion';
import SEQ from './seqIndex.json';

// The night as film: the camera moves between the shots are rendered frame by frame (scripts/blender/room/render_all.py,
// packed by pack_moves.py into public/tonight/seq/) and the scroll scrubs them, so wherever the reader stops is a real
// frame from the camera, never two pictures mixed. While they're stopped on a shot: that shot in full resolution, its
// fire moving (a short loop cut from the same frame) and, on the waitlist shot, the live form on Jeemu's screen.
const BASE = `${import.meta.env.BASE_URL}tonight/seq/`;
const url = (dev, seg, f) => `${BASE}${dev}/${seg}/${f}?v=${ASSET_V}`;
const pad = (i) => String(i).padStart(3, '0');

// is every move this device's story needs in the index? (until the renders are in, the page keeps its stills)
export const SEGMENTS = {
  desk: ['wide-close', 'close-play', 'play-top', 'top-late', 'fall', 'fallen-end', 'end-top2', 'top2-faq0',
    ...Array.from({ length: 6 }, (_, k) => `faq${k}-faq${k + 1}`)],
  phone: ['wide-close', 'close-play', 'play-print0', ...Array.from({ length: 5 }, (_, i) => `hprint${i}-${i + 1}`), 'hprints-out', 'top-late',
    'fall', 'fallen-end', 'end-print0', ...Array.from({ length: 5 }, (_, i) => `cprint${i}-${i + 1}`), 'team-faq0',
    ...Array.from({ length: 6 }, (_, k) => `faq${k}-faq${k + 1}`)]
};
export const filmReady = (dev) => !!SEQ[dev] && SEGMENTS[dev].every((s) => SEQ[dev][s]);
export const segInfo = (dev, seg) => SEQ[dev] && SEQ[dev][seg];

// decoded frames, a few either side of where the reader is (a phone can't hold a whole move decoded)
const cache = new Map();   // url -> ImageBitmap | Promise
const KEEP = 14;
function bitmap(u) {
  const c = cache.get(u);
  if (c && !(c instanceof Promise)) { cache.delete(u); cache.set(u, c); return c; }   // most recently used last
  if (!c) {
    cache.set(u, fetch(u).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((bm) => { cache.set(u, bm); trim(); return bm; })
      .catch(() => { cache.delete(u); }));
  }
  return null;
}
function trim() {
  const ready = [...cache.entries()].filter(([, v]) => !(v instanceof Promise));
  for (let i = 0; i < ready.length - KEEP; i++) { ready[i][1].close?.(); cache.delete(ready[i][0]); }
}
const warmed = new Set();
function warm(dev, seg) {   // fetch a whole move into the HTTP cache ahead of time (not decoded)
  const k = `${dev}/${seg}`; const info = segInfo(dev, seg);
  if (warmed.has(k) || !info) return; warmed.add(k);
  for (let i = 0; i < info.n; i++) fetch(url(dev, seg, `${pad(i)}.webp`)).catch(() => {});
}

// where a point of a frame (frame pixels) lands in the window: the frame covers the window, centred
export const frameFit = (info, vp) => {
  const W = info.width, H = info.height, s = Math.max(vp.w / W, vp.h / H);
  return { s, tx: (vp.w - W * s) / 2, ty: (vp.h - H * s) / 2, W, H };
};

// view: { seg, frame: 0..n-1 } (moving) or { seg, still: 'first'|'last' } (stopped), opacity o; next: segments to warm
export default function SeqPlayer({ dev, vp, view, o = 1, next = [], waitlist }) {
  const canvas = useRef(null);
  const [, bump] = useState(0);
  const info = view && segInfo(dev, view.seg);
  useEffect(() => { next.forEach((s) => warm(dev, s)); }, [next.join()]);
  useEffect(() => {
    if (!info || view.still) return;
    const cv = canvas.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(vp.w * dpr), h = Math.round(vp.h * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    // the frame wanted, or the nearest one already decoded (fast scrolling never shows a gap)
    const want = url(dev, view.seg, `${pad(view.frame)}.webp`);
    let bm = bitmap(want);
    for (let d = 1; d <= 8 && !bm; d++) {
      for (const f of [view.frame - d, view.frame + d]) {
        const c = cache.get(url(dev, view.seg, `${pad(f)}.webp`));
        if (c && !(c instanceof Promise)) { bm = c; break; }
      }
    }
    const pending = cache.get(want);
    if (pending instanceof Promise) pending.then(() => bump((x) => x + 1));   // draw it when it's decoded
    for (let d = 1; d <= 4; d++) {   // decode a few ahead and behind
      if (view.frame + d < info.n) bitmap(url(dev, view.seg, `${pad(view.frame + d)}.webp`));
      if (view.frame - d >= 0) bitmap(url(dev, view.seg, `${pad(view.frame - d)}.webp`));
    }
    if (!bm) return;
    const ctx = cv.getContext('2d'); const s = Math.max(w / bm.width, h / bm.height);
    ctx.drawImage(bm, (w - bm.width * s) / 2, (h - bm.height * s) / 2, bm.width * s, bm.height * s);
  });
  if (!info) return null;
  const fit = frameFit(info, vp);
  const place = { width: fit.W, height: fit.H, transform: `translate(${fit.tx}px, ${fit.ty}px) scale(${fit.s})` };
  const rest = view.still && info[view.still];
  return (
    <div className="sq-stage" style={{ opacity: o }} aria-hidden={!waitlist}>
      <canvas ref={canvas} className="sq-canvas" style={{ visibility: view.still ? 'hidden' : 'visible' }} />
      {view.still && (
        <div className="sq-frame" style={place}>
          <Pic src={url(dev, view.seg, `${view.still}.jpg`)} width={fit.W} height={fit.H} alt="" draggable="false" decoding="async" />
          {rest && rest.fire && <FireLoop src={url(dev, view.seg, `${view.still}_fire.mp4`)} rect={rest.fire} />}
          {waitlist && rest && rest.screen && (
            <div className="tn-warp tn-screen is-ui" style={{ width: 320, height: 240, transform: quadToMatrix3d(320, 240, rest.screen) }}>{waitlist}</div>
          )}
        </div>
      )}
    </div>
  );
}

// the fire while the reader is stopped: a loop cut from the frame itself, shown once it's really playing (no play button)
function FireLoop({ src, rect }) {
  const [on, setOn] = useState(false);
  return (
    <video className="sq-fire" src={src} muted autoPlay loop playsInline disablePictureInPicture preload="auto" aria-hidden="true" tabIndex={-1}
      style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3], opacity: on ? 1 : 0 }} onPlaying={() => setOn(true)} />
  );
}
