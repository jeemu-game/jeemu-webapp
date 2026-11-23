import React, { useEffect, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import Pic from './Pic';
import { ASSET_V } from './assetVersion';

// The night on a phone: one finished portrait frame per stop of the story, baked from the full engine
// (scripts/web/capture_mobile.cjs -> public/tonight/m/), crossfading as the reader scrolls. At most two pictures are on
// screen and a couple more are fetched ahead, so a phone holds a few MB instead of hundreds, and the only moving parts are
// a fade, a gentle push and the fire on the shots that show it. The words are the page's own (Tonight.jsx).
const BASE = `${import.meta.env.BASE_URL}tonight/m/`;
const url = (f) => `${BASE}${f}?v=${ASSET_V}`;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const pad = (i) => String(i).padStart(2, '0');

// a short, quiet loop of the fire, cut from the same frame: shown only once it's really playing (no play button ever)
function Fire({ src, rect }) {
  const [on, setOn] = useState(false);
  return (
    <video className="mb-fire" src={src} muted autoPlay loop playsInline disablePictureInPicture preload="auto" aria-hidden="true" tabIndex={-1}
      style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3], opacity: on ? 1 : 0 }} onPlaying={() => setOn(true)} />
  );
}

export default function MobileStage({ t, vp, keys, fall, waitlist }) {
  const [man, setMan] = useState(null);
  useEffect(() => { fetch(url('index.json')).then((r) => r.json()).then(setMan).catch(() => {}); }, []);

  // where we are: holding on one frame, or between two
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1].a) i++;
  const cur = keys[i], next = keys[i + 1];
  const inFall = fall && cur.id === 'late' && t >= fall.from && t < fall.to;
  const x = next && t > cur.b ? ease(clamp((t - cur.b) / Math.max(1, next.a - cur.b))) : 0;
  const hold = clamp((t - cur.a) / Math.max(1, cur.b - cur.a));

  // fetch ahead: the next two frames (and the fall, coming up to it), so nothing waits when it's needed
  useEffect(() => {
    if (!man) return;
    keys.slice(i + 1, i + 3).forEach((k) => fetch(url(`${k.id}.avif`)).catch(() => {}));
    if (fall && keys[i + 1] && keys[i + 1].id === 'late') for (let f = 0; f < man.fall; f++) fetch(url(`fall/${pad(f)}.avif`)).catch(() => {});
  }, [man, i]);
  if (!man) return null;

  // the frame (capture size, man.w x man.h) covers the window, pushed in by z about its centre
  const s = Math.max(vp.w / man.w, vp.h / man.h);
  const place = (z) => ({ width: man.w, height: man.h, transform: `translate(${vp.w / 2}px, ${vp.h / 2}px) scale(${s * z}) translate(${-man.w / 2}px, ${-man.h / 2}px)` });
  const frame = (k, z, o, src) => (
    <div key={k.id} className="mb-frame" style={{ ...place(z), opacity: o }}>
      <Pic src={src || url(`${k.id}.jpg`)} width={man.w} height={man.h} alt="" draggable="false" decoding="async" />
      {o > 0.01 && man.fire && man.fire[k.id] && !src && <Fire src={url(`fire_${k.id}.mp4`)} rect={man.fire[k.id]} />}
      {k.id === 'end' && man.screen && waitlist && (
        <div className="tn-warp tn-screen is-ui" style={{ width: 320, height: 240, transform: quadToMatrix3d(320, 240, man.screen) }}>{waitlist}</div>
      )}
    </div>
  );
  const fallIdx = inFall ? Math.min(man.fall - 1, Math.round(((t - fall.from) / (fall.to - fall.from)) * (man.fall - 1))) : -1;
  return (
    <div className="mb-stage" aria-hidden={false}>
      {inFall ? frame(cur, 1.02, 1, url(`fall/${pad(fallIdx)}.jpg`))
        : frame(cur, (1 + 0.02 * hold) * (1 + 0.05 * x), 1)}
      {next && x > 0 && !inFall && frame(next, 1.05 - 0.05 * x, x)}
    </div>
  );
}
