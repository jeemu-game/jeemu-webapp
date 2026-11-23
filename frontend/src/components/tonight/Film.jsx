import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import { ASSET_V } from './assetVersion';
import SEQ from './seqIndex.json';

// The night as film, stop to stop. The story is a row of stops (rendered shots). Scrolling only says which stop the
// reader wants; the camera move between stops then plays through at its own pace, as video (forward, or reversed when
// scrolling back), and lands exactly on the stop's still. So there is no half-way: a move always finishes, and the
// picture is always a real frame of the camera. Everything is drawn on canvases (no <video> on screen: browsers lay
// their own play buttons and controls over visible videos).
// Renders: scripts/blender/room/render_all.py, packed by pack_moves.py into public/tonight/seq/<device>/<move>/
//   fwd.mp4 rev.mp4 (the move), first/last .jpg (its ends in full), first_fire/last_fire.mp4 (fire loops), meta in seqIndex.json
const BASE = `${import.meta.env.BASE_URL}tonight/seq/`;
const url = (dev, seg, f) => `${BASE}${dev}/${seg}/${f}?v=${ASSET_V}`;
export const segInfo = (dev, seg) => SEQ[dev] && SEQ[dev][seg];
export const filmReady = (dev, rests) => !!SEQ[dev] && rests.every((r) => [...(r.via || [r.seg]), ...(r.shot ? [r.shot.seg] : [])].every((s) => segInfo(dev, s) && segInfo(dev, s).video));
export const frameFit = (info, vp) => {
  const W = info.width, H = info.height, s = Math.max(vp.w / W, vp.h / H);
  return { s, tx: (vp.w - W * s) / 2, ty: (vp.h - H * s) / 2, W, H };
};
// a stop's picture: the end of the move that arrives there (the first stop: the start of the first move)
export const restShot = (r) => r.shot || (r.via ? { seg: r.via[r.via.length - 1], which: 'last' } : { seg: r.seg, which: 'first' });

// ---- videos, kept off screen (a 2 px box nobody sees) and drawn onto canvases. Each move is downloaded whole first
// (fetch -> blob), because phones won't preload a video that isn't playing: without this the reader waits at every stop.
let shelf = null;
const pool = new Map();   // src -> { v, ok, blob }
function entry(src) {
  if (pool.has(src)) return pool.get(src);
  if (!shelf) { shelf = document.createElement('div'); shelf.setAttribute('aria-hidden', 'true');
    shelf.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(shelf); }
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
  v.disablePictureInPicture = true; v.style.cssText = 'width:2px;height:2px';
  shelf.appendChild(v);
  const e = { v, ok: false, blob: null }; pool.set(src, e);
  fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => {
    if (pool.get(src) !== e) return;
    e.blob = URL.createObjectURL(b); v.src = e.blob; v.load(); e.ok = true;
  }).catch(() => { if (pool.get(src) === e) { v.src = src; e.ok = true; } });   // stream it then
  return e;
}
const video = (src) => entry(src).v;
function release(keep) {   // let go of videos far from the reader (memory)
  for (const [k, e] of pool) if (!keep.has(k)) {
    e.v.pause(); e.v.removeAttribute('src'); e.v.load(); e.v.remove(); if (e.blob) URL.revokeObjectURL(e.blob); pool.delete(k);
  }
}
// the stills, as WebP (every browser we serve has it), fetched and decoded ahead so a stop never shows blank
const still = (dev, r) => { const sh = restShot(r); return url(dev, sh.seg, `${sh.which}.webp`); };
const stills = new Map();
function preloadStill(src) {
  if (stills.has(src)) return stills.get(src);
  const im = new Image(); im.decoding = 'async'; im.src = src;
  const p = (im.decode ? im.decode() : new Promise((ok) => { im.onload = ok; })).catch(() => {}).then(() => im);
  stills.set(src, p); if (stills.size > 12) stills.delete(stills.keys().next().value);
  return p;
}
const fireOf = (dev, r) => { const sh = restShot(r); const i = segInfo(dev, sh.seg); return i && i[sh.which] && i[sh.which].fire ? url(dev, sh.seg, `${sh.which}_fire.mp4`) : null; };
const draw = (cv, v, cover = true) => {
  if (!cv || !v || v.readyState < 2) return false;
  const ctx = cv.getContext('2d'); const w = cv.width, h = cv.height, vw = v.videoWidth, vh = v.videoHeight;
  if (!vw) return false;
  if (cover) { const s = Math.max(w / vw, h / vh); ctx.drawImage(v, (w - vw * s) / 2, (h - vh * s) / 2, vw * s, vh * s); }
  else ctx.drawImage(v, 0, 0, w, h);
  return true;
};

// The playback: where the picture is (pos, a stop), and the move under way, if any
export function useFilm(dev, rests, target) {
  const [pos, setPos] = useState(Math.max(0, Math.min(rests.length - 1, target)));
  const [move, setMove] = useState(null);   // { from, to, segs: [{seg, dir}] }
  // decide the next step whenever we're stopped and the reader wants to be elsewhere
  useEffect(() => {
    const want = Math.max(0, Math.min(rests.length - 1, target));
    if (move) {   // mid-move and the reader is suddenly far away (a menu link): drop the move, cut there
      if (Math.abs(want - move.to) > 2) { setMove(null); setPos(want); }
      return;
    }
    if (want === pos) return;
    if (Math.abs(want - pos) > 2) { setPos(want); return; }   // a jump (menu link): cut straight there
    const to = want > pos ? pos + 1 : pos - 1;
    const via = (want > pos ? rests[to].via : rests[pos].via) || [];
    const segs = want > pos ? via.map((seg) => ({ seg, dir: 'fwd' })) : [...via].reverse().map((seg) => ({ seg, dir: 'rev' }));
    if (!segs.length) { setPos(to); return; }
    setMove({ from: pos, to, segs });
  }, [target, pos, move]);
  // keep the moves and stills next to us loading (both ways), drop the rest
  useEffect(() => {
    const keep = new Set();
    const add = (seg, dir) => { if (segInfo(dev, seg)) { const s = url(dev, seg, `${dir}.mp4`); keep.add(s); entry(s); } };
    if (move) move.segs.forEach(({ seg, dir }) => add(seg, dir));
    (rests[pos + 1] && rests[pos + 1].via || []).forEach((s) => add(s, 'fwd'));
    (rests[pos].via || []).forEach((s) => add(s, 'rev'));
    if (rests[pos + 2]) (rests[pos + 2].via || []).forEach((s) => add(s, 'fwd'));   // two ahead, for a quick reader
    for (const i of [pos, pos + 1, pos - 1, pos + 2]) if (rests[i]) {
      preloadStill(still(dev, rests[i]));
      const f = fireOf(dev, rests[i]); if (f && Math.abs(i - pos) <= 1) { keep.add(f); entry(f); }
    }
    if (move) { const f = fireOf(dev, rests[move.to]); if (f) keep.add(f); }
    release(keep);
  }, [pos, move]);
  // arrived (or the move can't play here, e.g. Low Power Mode: then it's a cut to the stop)
  const land = () => { if (move) { setPos(move.to); setMove(null); } };
  return { pos, move, done: land, fail: land };
}

// a move, played onto the stage's canvas: its segments back to back. The canvas keeps the last frame afterwards, so
// there is always a picture while the stop's still decodes.
function useMovePlayer(cv, srcs, onDone, onFail, onShowing) {
  useEffect(() => {
    if (!srcs) return undefined;
    let raf = 0, live = true, shown = false, k = 0, e = null, started = false, stall = 0;
    const fit = () => { const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } };
    const stop = (fn) => { if (!live) return; live = false; cancelAnimationFrame(raf); clearTimeout(stall); fn(); };
    const begin = () => { e = entry(srcs[k]); started = false; };
    const tick = () => {
      if (!live) return; fit();
      const v = e && e.v;
      if (e && e.ok && !started) {   // downloaded: play it from the top
        started = true; v.loop = false; try { v.currentTime = 0; } catch (_) { /* not seekable yet */ }
        const p = v.play(); if (p && p.catch) p.catch(() => stop(onFail));
      }
      if (started && v.currentTime > 0 && draw(cv.current, v) && !shown) { shown = true; clearTimeout(stall); onShowing(); }
      if (started && (v.ended || (v.duration && v.currentTime >= v.duration - 0.02))) {
        draw(cv.current, v);
        if (k + 1 < srcs.length) { v.pause(); k += 1; begin(); }   // straight on into the next part
        else { stop(onDone); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    stall = setTimeout(() => { if (!shown) stop(onFail); }, 12000);   // a very slow network: cut to the stop rather than wait for ever
    begin(); raf = requestAnimationFrame(tick);
    return () => { live = false; cancelAnimationFrame(raf); clearTimeout(stall); if (e) e.v.pause(); };
  }, [srcs && srcs.join()]);
}

// the fire while the reader is stopped: a loop cut from the frame itself, drawn onto a small canvas
function FireLoop({ src, rect }) {
  const cv = useRef(null);
  useEffect(() => {
    const e = entry(src); const v = e.v; v.loop = true; let raf = 0, live = true, playing = false;
    const c = cv.current; c.width = rect[2]; c.height = rect[3];
    const tick = () => {
      if (!live) return;
      if (e.ok && !playing) { playing = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      draw(c, v, false); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { live = false; cancelAnimationFrame(raf); v.pause(); };
  }, [src]);
  return <canvas ref={cv} className="sq-fire" style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }} />;
}

// a stop's still, shown only once it's decoded (until then whatever is underneath stays: the move's last frame)
function Still({ src, fit, onReady, visible, children }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { let live = true; preloadStill(src).then(() => { if (live) { setOk(true); onReady(src); } }); return () => { live = false; }; }, [src]);
  const place = { width: fit.W, height: fit.H, transform: `translate(${fit.tx}px, ${fit.ty}px) scale(${fit.s})`, visibility: ok && visible ? 'visible' : 'hidden' };
  return (
    <div className="sq-frame" style={place}>
      <img src={src} width={fit.W} height={fit.H} alt="" draggable="false" />
      {ok && children}
    </div>
  );
}

export default function FilmStage({ dev, vp, rests, film, waitlist }) {
  const { pos, move, done, fail } = film;
  const cv = useRef(null);
  const [showing, setShowing] = useState(false);   // the move's first frame is on the canvas: the still can go
  const [canvasAt, setCanvasAt] = useState(-1);     // the stop whose picture the canvas holds (a move's last frame)
  const [ready, setReady] = useState('');           // the last still that finished decoding
  const [under, setUnder] = useState(null);         // after a cut: the previous stop's still, kept until the new one is ready
  const moveKey = move ? move.segs.map((x) => `${x.seg}/${x.dir}`).join() : '';
  useEffect(() => setShowing(false), [moveKey]);
  const prevPos = useRef(pos);
  useLayoutEffect(() => {   // a cut (no move drew the way here): keep the old still underneath until the new one decodes
    if (prevPos.current !== pos && canvasAt !== pos) setUnder(prevPos.current);
    prevPos.current = pos;
  }, [pos]);
  const srcs = move ? move.segs.map((x) => url(dev, x.seg, `${x.dir}.mp4`)) : null;
  useMovePlayer(cv, srcs, () => { setCanvasAt(move.to); done(); }, () => { setCanvasAt(-1); fail(); }, () => setShowing(true));
  const r = rests[pos]; const shot = restShot(r); const info = segInfo(dev, shot.seg);
  if (!info) return null;
  const fit = frameFit(info, vp);
  const end = info[shot.which] || {};
  const src = still(dev, r);
  const hideStills = move && showing;
  const underR = under !== null && ready !== src && rests[under];
  return (
    <div className="sq-stage">
      <canvas ref={cv} className="sq-canvas" style={{ visibility: (move && showing) || canvasAt === pos ? 'visible' : 'hidden' }} />
      {underR && !hideStills && <Still key={`u${under}`} src={still(dev, underR)} fit={frameFit(segInfo(dev, restShot(underR).seg), vp)} onReady={() => {}} visible />}
      <Still key={src} src={src} fit={fit} visible={!hideStills} onReady={(s) => { setReady(s); setUnder(null); }}>
        {!move && end.fire && <FireLoop src={url(dev, shot.seg, `${shot.which}_fire.mp4`)} rect={end.fire} />}
        {!move && waitlist && r.waitlist && end.screen && (
          <div className="tn-warp tn-screen is-ui" style={{ width: 320, height: 240, transform: quadToMatrix3d(320, 240, end.screen) }}>{waitlist}</div>
        )}
      </Still>
    </div>
  );
}
