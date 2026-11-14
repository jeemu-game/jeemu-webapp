import React, { useEffect, useState } from 'react';

// Real fire, moving, laid over the still render: a filmed fireplace clip fitted into the firebox mouth and a filmed
// candle flame on each candle (screen blend: the clips' black drops out, the flames add light, like the real thing).
// The firebox clip sits inside a matte of the firebox (out/site/<shot>_firemask.png), so it stays behind the tower.
// Files (all optional; nothing shows until they exist): tonight/fire.mp4 (+ .webm), tonight/candle.mp4 (+ .webm),
// tonight/<shot>_firemask.png. Corners come from the render's meta (firebox, flames).
const BASE = `${import.meta.env.BASE_URL}tonight/`;
const exists = {};
const has = (f) => (exists[f] ||= fetch(BASE + f, { method: 'HEAD' })
  .then((r) => r.ok && !/text\/html/.test(r.headers.get('content-type') || '')).catch(() => false));

function Clip({ name, style }) {
  return (
    <video className="tn-clip" style={style} autoPlay muted loop playsInline preload="auto" disablePictureInPicture aria-hidden="true">
      <source src={`${BASE}${name}.webm`} type="video/webm" />
      <source src={`${BASE}${name}.mp4`} type="video/mp4" />
    </video>
  );
}

export default function LiveFire({ shot, m, warp, active }) {
  const [ok, setOk] = useState({});
  useEffect(() => {
    let live = true;
    Promise.all(['fire.mp4', 'candle.mp4', `${shot}_firemask.png`].map(has)).then(([fire, candle, mask]) => live && setOk({ fire, candle, mask }));
    return () => { live = false; };
  }, [shot]);
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!active || still) return null;
  return (
    <>
      {ok.fire && m.firebox && (
        <div className="tn-firewrap" style={{ width: m.width, height: m.height, ...(ok.mask ? { WebkitMaskImage: `url(${BASE}${shot}_firemask.png)`, maskImage: `url(${BASE}${shot}_firemask.png)` } : {}) }}>
          <Clip name="fire" style={warp(1280, 520, m.firebox)} />
        </div>
      )}
      {ok.candle && (m.flames || []).map((f, i) => {
        const h = Math.hypot(f.tip[0] - f.base[0], f.tip[1] - f.base[1]) * 2.6, w = h * 0.6;   // the clip frames a flame with room around it
        return (
          <Clip key={i} name="candle" style={{ width: 300, height: 500, transformOrigin: '50% 80%',
            transform: `translate(${f.base[0] - 150}px, ${f.base[1] - 400}px) scale(${w / 300}, ${h / 500})`, animationDelay: `${-i * 0.7}s` }} />
        );
      })}
    </>
  );
}
