import React, { useEffect, useRef, useState } from 'react';
import { ASSET_V } from './assetVersion';

// Real fire, moving, laid over the still render: filmed flames in the firebox mouth (the render has the firebox lit but
// empty) and a filmed flame on each candle. Screen blend: the clips' black drops out and the flames add light.
// The firebox clip sits inside a matte of the firebox (out/site/<shot>_firemask.png), so it stays behind the tower.
// Files (all optional; nothing shows until they exist): tonight/fire.avif (+ .webp), tonight/candle.avif (+ .webp),
// tonight/<shot>_firemask.png. Corners come from the render's meta (firebox, flames).
const BASE = `${import.meta.env.BASE_URL}tonight/`;
const MASKED = new Set(['wide', 'close', 'play', 'late', 'end']);   // shots with a firebox mask (scripts/blender/room)

// animated images, not video: they play everywhere (no play button, Low Power Mode or autoplay rules don't apply)
function Clip({ name, style, w, h, onLoad }) {
  return (
    <picture style={{ position: 'absolute', left: 0, top: 0 }}>
      <source srcSet={`${BASE}${name}.avif`} type="image/avif" />
      <img className="tn-clip" style={style} src={`${BASE}${name}.webp`} width={w} height={h} alt="" draggable="false" decoding="async" aria-hidden="true" onLoad={onLoad} />
    </picture>
  );
}

// the firebox fire is a small video: it streams, so it moves within the first few KB (an animated image only moves once
// the whole file is in). It stays invisible until it is really playing, so a blocked autoplay (Low Power Mode, data
// saver) never shows a play button: then the animated image takes over.
function FireVideo({ style, onMoving, onBlocked }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    v.muted = true;
    const p = v.play(); if (p && p.catch) p.catch(() => onBlocked());
    const t = setTimeout(() => { if (v.paused) onBlocked(); }, 4000);
    return () => clearTimeout(t);
  }, []);
  return <video ref={ref} className="tn-clip" style={{ ...style, opacity: on ? 1 : 0 }} src={`${BASE}fire.mp4`} width={1280} height={512}
    muted autoPlay loop playsInline disablePictureInPicture preload="auto" aria-hidden="true" tabIndex={-1}
    onPlaying={() => { setOn(true); onMoving(); }} onError={onBlocked} />;
}

// the fireplace is behind the focus in every shot: soften the clip to match each one's depth of field (image pixels)
const DEFOCUS = { wide: 3, play: 7, late: 11, close: 16, end: 20 };
// how far the fire has burned down in each shot: height of the flames in the firebox, and their brightness
const BURN = { wide: [0.88, 1.02], close: [0.88, 1.02], play: [0.88, 1.02], late: [0.66, 0.82], end: [0.66, 0.82] };
// late at night it's the same fire, burned down: only low flame tips over a glowing bed, and dimmer. Its left end fades
// out where the tower stands in front of it (the tower falls during that shot, so a fixed matte there would show a step)
const LATE = new Set(['late', 'end']);

export default function LiveFire({ shot, m, warp, active }) {
  // the clips and the masks are part of the site now: no need to ask the server first (that delayed the fire)
  const ok = { fire: true, candle: true, mask: MASKED.has(shot) };
  const [moving, setMoving] = useState(false);   // the fire is moving: drop the still first frame
  const [blocked, setBlocked] = useState(false);   // the video can't play here: the animated image instead
  // the flames sit low in the firebox (85% of its height) so they never lick over the stone at the top of the opening
  // the flames sit low in the firebox: the clip keeps its shape and is sunk below the opening's floor (the mask cuts it),
  // so a fire that's burning down shows only the tips of its flames, never a squashed copy
  const fb = m.firebox && (() => { const [tl, tr, br, bl] = m.firebox; const d = 1 - (BURN[shot] || [0.85])[0];
    const down = (pt, top, bot) => [pt[0] + (bot[0] - top[0]) * d, pt[1] + (bot[1] - top[1]) * d];
    return [down(tl, tl, bl), down(tr, tr, br), down(br, tr, br), down(bl, tl, bl)]; })();
  const late = LATE.has(shot);
  const [, bright] = BURN[shot] || [0.85, 1];
  const look = m.firebox && { ...warp(1280, 512, fb),
    filter: `blur(${(DEFOCUS[shot] || 4) * 1280 / Math.max(1, m.firebox[1][0] - m.firebox[0][0])}px) brightness(${bright}) saturate(${late ? 1.25 : 0.9})`,
    ...(late ? { WebkitMaskImage: 'linear-gradient(to right, transparent 4%, #000 16%)', maskImage: 'linear-gradient(to right, transparent 4%, #000 16%)' } : {}) };
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!active || still) return null;
  return (
    <>
      {ok.fire && ok.mask && m.firebox && (   // never without its mask: the fire must stay behind the tower
        <div className="tn-firewrap" style={{ width: m.width, height: m.height, WebkitMaskImage: `url(${BASE}${shot}_firemask.png?v=${ASSET_V})`, maskImage: `url(${BASE}${shot}_firemask.png?v=${ASSET_V})` }}>
          {late && <div className="tn-emberglow" style={warp(1280, 512, m.firebox)} />}
          {!moving && <img className="tn-clip" src={`${BASE}fire_first.jpg`} width={1280} height={512} alt="" aria-hidden="true" style={look} />}
          {blocked ? <Clip name="fire" onLoad={() => setMoving(true)} w={1280} h={512} style={look} />
            : <FireVideo style={look} onMoving={() => setMoving(true)} onBlocked={() => setBlocked(true)} />}
        </div>
      )}
      {ok.candle && (m.flames || []).map((f, i) => {
        const h = Math.hypot(f.tip[0] - f.base[0], f.tip[1] - f.base[1]) * 2.2, w = h * 0.55;   // the clip frames a flame with room around it
        return (
          <Clip key={i} name="candle" w={300} h={500} style={{ width: 300, height: 500, transformOrigin: '50% 80%',
            transform: `translate(${f.base[0] - 150}px, ${f.base[1] - 400}px) scale(${w / 300}, ${h / 500})`, animationDelay: `${-i * 0.7}s` }} />
        );
      })}
    </>
  );
}
