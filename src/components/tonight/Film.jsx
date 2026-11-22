import React, { useEffect, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import Pic from './Pic';
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
export const filmReady = (dev, rests) => !!SEQ[dev] && rests.every((r) => (r.via || [r.seg]).every((s) => segInfo(dev, s) && segInfo(dev, s).video));
export const frameFit = (info, vp) => {
  const W = info.width, H = info.height, s = Math.max(vp.w / W, vp.h / H);
  return { s, tx: (vp.w - W * s) / 2, ty: (vp.h - H * s) / 2, W, H };
};
// a stop's picture: the end of the move that arrives there (the first stop: the start of the first move)
export const restShot = (r) => (r.via ? { seg: r.via[r.via.length - 1], which: 'last' } : { seg: r.seg, which: 'first' });

// ---- videos, kept off screen (a 2 px box nobody sees) and drawn onto canvases
let shelf = null;
const pool = new Map();   // key -> <video>
function video(src) {
  if (pool.has(src)) return pool.get(src);
  if (!shelf) { shelf = document.createElement('div'); shelf.setAttribute('aria-hidden', 'true');
    shelf.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(shelf); }
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
  v.disablePictureInPicture = true; v.src = src; v.style.cssText = 'width:2px;height:2px';
  shelf.appendChild(v); pool.set(src, v);
  return v;
}
function release(keep) {   // let go of videos far from the reader (memory)
  for (const [k, v] of pool) if (!keep.has(k)) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); pool.delete(k); }
}
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
  const [move, setMove] = useState(null);   // { from, to, segs: [{seg, dir}], i }
  const tgt = useRef(target); tgt.current = target;
  // decide the next step whenever we're stopped and the reader wants to be elsewhere
  useEffect(() => {
    const want = Math.max(0, Math.min(rests.length - 1, target));
    if (move) {   // mid-move and the reader is suddenly far away (a menu link): drop the move, cut there
      if (Math.abs(want - move.to) > 2) { setMove(null); setPos(want); }
      return;
    }
    if (want === pos) return;
    if (Math.abs(want - pos) > 2) { setPos(want); return; }   // a jump (menu link, fast fling): cut straight there
    const to = want > pos ? pos + 1 : pos - 1;
    const via = (want > pos ? rests[to].via : rests[pos].via) || [];
    const segs = want > pos ? via.map((seg) => ({ seg, dir: 'fwd' })) : [...via].reverse().map((seg) => ({ seg, dir: 'rev' }));
    if (!segs.length) { setPos(to); return; }
    setMove({ from: pos, to, segs });
  }, [target, pos, move]);
  // keep the moves next to us loading (both ways), drop the rest
  useEffect(() => {
    const keep = new Set();
    const add = (seg, dir) => { if (segInfo(dev, seg)) { const s = url(dev, seg, `${dir}.mp4`); keep.add(s); video(s); } };
    (rests[pos + 1] && rests[pos + 1].via || []).forEach((s) => add(s, 'fwd'));
    (rests[pos].via || []).forEach((s) => add(s, 'rev'));
    if (move) move.segs.forEach(({ seg, dir }) => add(seg, dir));
    if (rests[pos + 2]) (rests[pos + 2].via || []).forEach((s) => add(s, 'fwd'));   // two ahead, for a quick reader
    for (const [k] of pool) if (k.includes('_fire.mp4')) keep.add(k);
    release(keep);
  }, [pos, move]);
  // arrived (or the move can't play here, e.g. Low Power Mode: then it's a cut to the stop)
  const land = () => { if (move) { setPos(move.to); setMove(null); } };
  return { pos, move, done: land, fail: land };
}

// a move, played onto the canvas: its segments back to back (the way out of the screen follows the way in, no gap)
function MovePlayer({ srcs, onDone, onFail, onShowing }) {
  const cv = useRef(null);
  useEffect(() => {
    let raf = 0, live = true, shown = false, k = 0, v = null, stall = 0;
    const fit = () => { const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } };
    const stop = (fn) => { if (!live) return; live = false; cancelAnimationFrame(raf); clearTimeout(stall); fn(); };
    const start = () => {
      v = video(srcs[k]); v.loop = false; v.currentTime = 0;
      clearTimeout(stall); stall = setTimeout(() => { if (!shown) stop(onFail); }, 4000);   // never wait on a slow network for ever
      const p = v.play(); if (p && p.catch) p.catch(() => stop(onFail));
    };
    const tick = () => {
      if (!live) return; fit();
      if (v && v.currentTime > 0 && draw(cv.current, v) && !shown) { shown = true; clearTimeout(stall); onShowing(); }
      if (v && (v.ended || (v.duration && v.currentTime >= v.duration - 0.02))) {
        draw(cv.current, v);
        if (k + 1 < srcs.length) { v.pause(); k += 1; start(); }   // straight on into the next part
        else { stop(onDone); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    start(); raf = requestAnimationFrame(tick);
    return () => { live = false; cancelAnimationFrame(raf); clearTimeout(stall); if (v) v.pause(); };
  }, [srcs.join()]);
  return <canvas ref={cv} className="sq-canvas" />;
}

// the fire while the reader is stopped: a loop cut from the frame itself, drawn onto a small canvas
function FireLoop({ src, rect }) {
  const cv = useRef(null);
  useEffect(() => {
    const v = video(src); v.loop = true; let raf = 0, live = true;
    const c = cv.current; c.width = rect[2]; c.height = rect[3];
    const tick = () => { if (!live) return; draw(c, v, false); raf = requestAnimationFrame(tick); };
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    raf = requestAnimationFrame(tick);
    return () => { live = false; cancelAnimationFrame(raf); v.pause(); };
  }, [src]);
  return <canvas ref={cv} className="sq-fire" style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }} />;
}

export default function FilmStage({ dev, vp, rests, film, waitlist }) {
  const { pos, move, done, fail } = film;
  const [showing, setShowing] = useState(false);   // the move's canvas has its first frame: the still can go
  const moveKey = move ? move.segs.map((x) => `${x.seg}/${x.dir}`).join() : '';
  useEffect(() => setShowing(false), [moveKey]);
  const r = rests[pos]; const shot = restShot(r); const info = segInfo(dev, shot.seg);
  if (!info) return null;
  const fit = frameFit(info, vp);
  const place = { width: fit.W, height: fit.H, transform: `translate(${fit.tx}px, ${fit.ty}px) scale(${fit.s})` };
  const end = info[shot.which] || {};
  return (
    <div className="sq-stage">
      {(!move || !showing) && (
        <div className="sq-frame" style={place}>
          <Pic src={url(dev, shot.seg, `${shot.which}.jpg`)} width={fit.W} height={fit.H} alt="" draggable="false" decoding="async" fetchPriority={pos === 0 ? 'high' : 'auto'} />
          {!move && end.fire && <FireLoop src={url(dev, shot.seg, `${shot.which}_fire.mp4`)} rect={end.fire} />}
          {!move && waitlist && r.waitlist && end.screen && (
            <div className="tn-warp tn-screen is-ui" style={{ width: 320, height: 240, transform: quadToMatrix3d(320, 240, end.screen) }}>{waitlist}</div>
          )}
        </div>
      )}
      {move && <MovePlayer key={moveKey} srcs={move.segs.map((x) => url(dev, x.seg, `${x.dir}.mp4`))}
        onDone={done} onFail={fail} onShowing={() => setShowing(true)} />}
    </div>
  );
}
