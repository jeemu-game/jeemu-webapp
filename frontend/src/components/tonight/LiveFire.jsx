import React, { useState } from 'react';

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

// the fireplace is behind the focus in every shot: soften the clip to match each one's depth of field (image pixels)
const DEFOCUS = { wide: 3, play: 7, late: 7, close: 16, end: 16 };
// how far the fire has burned down in each shot: height of the flames in the firebox, and their brightness
const BURN = { wide: [0.88, 1], close: [0.88, 1], play: [0.88, 1], late: [0.55, 0.75], end: [0.5, 0.7] };

export default function LiveFire({ shot, m, warp, active }) {
  // the clips and the masks are part of the site now: no need to ask the server first (that delayed the fire)
  const ok = { fire: true, candle: true, mask: MASKED.has(shot) };
  const [moving, setMoving] = useState(false);   // the animated fire has loaded: drop the still first frame
  // the flames sit low in the firebox (85% of its height) so they never lick over the stone at the top of the opening
  // the flames sit low in the firebox: the clip keeps its shape and is sunk below the opening's floor (the mask cuts it),
  // so a fire that's burning down shows only the tips of its flames, never a squashed copy
  const fb = m.firebox && (() => { const [tl, tr, br, bl] = m.firebox; const d = 1 - (BURN[shot] || [0.85])[0];
    const down = (pt, top, bot) => [pt[0] + (bot[0] - top[0]) * d, pt[1] + (bot[1] - top[1]) * d];
    return [down(tl, tl, bl), down(tr, tr, br), down(br, tr, br), down(bl, tl, bl)]; })();
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!active || still) return null;
  return (
    <>
      {ok.fire && ok.mask && m.firebox && (   // never without its mask: the fire must stay behind the tower
        <div className="tn-firewrap" style={{ width: m.width, height: m.height, opacity: (BURN[shot] || [0, 1])[1], WebkitMaskImage: `url(${BASE}${shot}_firemask.png)`, maskImage: `url(${BASE}${shot}_firemask.png)` }}>
          {!moving && <img className="tn-clip" src={`${BASE}fire_first.jpg`} width={1280} height={512} alt="" aria-hidden="true"
            style={{ ...warp(1280, 512, fb), filter: `blur(${(DEFOCUS[shot] || 4) * 1280 / Math.max(1, m.firebox[1][0] - m.firebox[0][0])}px) brightness(1.02) saturate(0.9)` }} />}
          <Clip name="fire" onLoad={() => setMoving(true)} w={1280} h={512} style={{ ...warp(1280, 512, fb), filter: `blur(${(DEFOCUS[shot] || 4) * 1280 / Math.max(1, m.firebox[1][0] - m.firebox[0][0])}px) brightness(1.02) saturate(0.9)` }} />
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
