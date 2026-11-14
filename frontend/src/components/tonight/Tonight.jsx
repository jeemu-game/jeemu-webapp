import React, { useEffect, useMemo, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import LiveScreen from './LiveScreen';
import Pic from './Pic';
import { SCREENS, CAPTIONS, POLAROIDS, EXTRA_PHOTOS, FINALE } from './copy';

// "Tonight": one game night, told by scrolling. Rendered stills of the room (from scripts/blender/room) sit on a
// sticky stage; a virtual camera pans and zooms across them in step with the scroll, and everything that changes
// (the Jeemu screen, the photos and handwriting on the polaroids, all text) is live HTML laid over the render using
// the corner positions the render script exports. Preview build: the stills stand in for the final rendered video.

const BASE = `${import.meta.env.BASE_URL}tonight/`;
const SHOTS = ['close', 'wide', 'play', 'top', 'late'];

// Scroll length of every beat, in % of the window height
const BEATS = [
  ['close', 100], ['toWide', 90], ['wide', 110], ['toPlay', 90], ['play', 120], ['toTable', 90],
  ...POLAROIDS.map((_, i) => [`p${i}`, 105]),
  ['toLate', 90], ['late', 110]
];
const START = {}; let acc = 0;
for (const [id, len] of BEATS) { START[id] = [acc, len]; acc += len; }
const TOTAL = acc;
const TOP_BAR = 56;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const mid = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// photos and handwriting on every polaroid on the table (the extra ones are on the table but not visited)
function TableOverlays({ m, warp, written, soft = false }) {
  return m.polaroids.map((q, i) => {
    const pl = POLAROIDS[i], photo = pl ? pl.photo : EXTRA_PHOTOS[i - POLAROIDS.length];
    if (!photo) return null;
    return (
      <React.Fragment key={i}>
        <div className={`tn-warp tn-photo ${soft ? 'is-soft' : ''}`} style={warp(600, 600, q.photo)}><Pic src={`${BASE}${photo}`} decoding="async" /></div>
        {pl && (
          <div className={`tn-warp tn-note ${soft ? 'is-soft' : ''} ${i <= written ? 'is-written' : ''}`} style={warp(600, 135, q.caption)}>
            <span style={{ fontSize: `${Math.min(60, 1050 / Math.max(10, pl.note.length))}px` }}>{pl.note}</span>
          </div>
        )}
      </React.Fragment>
    );
  });
}

export default function Tonight({ onCta }) {
  const section = useRef(null);
  const stage = useRef(null);
  const [t, setT] = useState(0);                       // scroll position in the story, in % of window height
  const [vp, setVp] = useState({ w: 1280, h: 800, card: 0 });
  const [meta, setMeta] = useState({});
  const [written, setWritten] = useState(-1);          // highest polaroid whose note has been written
  // the opening shot loads first; the rest follow once it is in (or as soon as the visitor starts scrolling)
  const [loadRest, setLoadRest] = useState(false);
  const startRest = () => {
    const go = () => setLoadRest(true);
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 300);
  };
  useEffect(() => { if (t > 2) setLoadRest(true); }, [t]);
  useEffect(() => { const id = setTimeout(() => setLoadRest(true), 4000); return () => clearTimeout(id); }, []);   // safety net
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    SHOTS.forEach((s) => fetch(`${BASE}${s}.json`).then((r) => r.json()).then((j) => setMeta((m) => ({ ...m, [s]: j }))).catch(() => {}));
  }, []);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = section.current, st = stage.current; if (!el || !st) return;
      // measure against the sticky stage (100svh), not innerHeight: on phones innerHeight changes as the address bar
      // shows and hides, which would make the story jump mid-scroll
      const h = st.clientHeight, w = st.clientWidth;
      const range = el.offsetHeight - h;
      setT(range > 0 ? clamp((-el.getBoundingClientRect().top / range) * TOTAL, 0, TOTAL) : 0);
      // tallest text card: on portrait screens the polaroid is framed in the space above it
      const card = Math.max(0, ...[...st.querySelectorAll('.tn-card')].map((c) => c.offsetHeight));
      setVp((v) => (v.w === w && v.h === h && v.card === card ? v : { w, h, card }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  const p = (id) => { const [s, l] = START[id]; return clamp((t - s) / l); };        // 0..1 progress through a beat
  const inBeat = (id) => { const [s, l] = START[id]; return t >= s && t < s + l; };
  const portrait = vp.w / vp.h < 0.9;

  // which polaroid the camera is on, and whether it has arrived
  let cur = -1;
  POLAROIDS.forEach((_, i) => { if (t >= START[`p${i}`][0]) cur = i; });
  const arrived = cur >= 0 && (inBeat(`p${cur}`) ? p(`p${cur}`) > 0.32 : t >= START.toLate[0]);
  useEffect(() => { if (arrived && cur > written) setWritten(cur); }, [arrived, cur, written]);

  // ---- per-shot camera (centre in image pixels, zoom relative to "cover") and opacity
  const cams = {};
  let dofAt = 50;   // where the sharp spot of the table's depth of field sits, % from the top
  const hero = (m) => {
    const sc = m.screen ? mid(m.screen) : [m.width / 2, m.height / 2];
    return { sc, c: portrait ? [sc[0], lerp(m.height / 2, sc[1], 0.4)] : [lerp(m.width / 2, sc[0], 0.25), m.height / 2] };
  };
  const mv = (z0, z1, k) => (reduce ? 1 : lerp(z0, z1, k));
  if (meta.close) {
    const { sc, c } = hero(meta.close);
    const k = ease(p('toWide'));
    cams.close = { c: [lerp(c[0], sc[0], k), lerp(c[1], sc[1], k)], z: t < START.toWide[0] ? mv(1, 1.04, p('close')) : mv(1.04, 1.35, k), o: 1 - k };
  }
  if (meta.wide) {
    const { sc, c } = hero(meta.wide);
    const kin = ease(p('toWide')), kout = ease(p('toPlay'));
    let cc = [lerp(sc[0], c[0], kin), lerp(sc[1], c[1], kin)], z = mv(1.7, 1, kin);
    if (t >= START.wide[0]) { cc = c; z = mv(1, 1.03, p('wide')); }
    if (t >= START.toPlay[0]) { cc = [lerp(c[0], sc[0], kout), lerp(c[1], sc[1], kout)]; z = mv(1.03, 1.4, kout); }
    cams.wide = { c: cc, z, o: Math.min(kin, 1 - kout) };
  }
  if (meta.play) {
    const { c } = hero(meta.play);
    const kin = ease(p('toPlay')), kout = ease(p('toTable'));
    cams.play = { c, z: t < START.play[0] ? mv(1.18, 1, kin) : t < START.toTable[0] ? mv(1, 1.04, p('play')) : mv(1.04, 1.25, kout), o: Math.min(kin, 1 - kout) };
  }
  if (meta.top) {
    const m = meta.top, cards = m.polaroids.map((q) => q.card);
    const cover = Math.max(vp.w / m.width, vp.h / m.height);
    const ch = dist(cards[0][0], cards[0][3]), cw = dist(cards[0][0], cards[0][1]);
    // portrait: the polaroid fills the space between the top bar and the text card; wide: left of centre, text on the right
    const free = portrait ? Math.max(vp.h * 0.3, vp.h - TOP_BAR - (vp.card || vp.h * 0.25) - 34) : vp.h;
    const target = Math.max(1, Math.min((portrait ? free * 0.86 : vp.h * 0.46) / ch, (vp.w * (portrait ? 0.74 : 0.42)) / cw) / cover);
    const centres = cards.map(mid);
    const off = portrait ? [0, vp.h / 2 - (TOP_BAR + 8 + free / 2)] : [vp.w * 0.14, 0];   // + moves the photo left / up
    dofAt = portrait ? ((TOP_BAR + 8 + free / 2) / vp.h) * 100 : 50;
    const at = (i) => [centres[i][0] + off[0] / (cover * target), centres[i][1] + off[1] / (cover * target)];
    let c = at(0), z = mv(target * 1.25, target, ease(p('toTable')));
    if (cur >= 0) {
      const k = ease(clamp(p(`p${cur}`) / 0.32)), from = at(Math.max(0, cur - 1)), to = at(cur);
      c = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
      z = target * (cur > 0 && !reduce ? 1 - 0.1 * Math.sin(Math.PI * k) : 1);       // lift a little while moving
    }
    if (t >= START.toLate[0]) z = mv(target, target * 1.12, ease(p('toLate')));
    cams.top = { c, z, o: Math.min(ease(p('toTable')), 1 - ease(p('toLate'))) };
  }
  if (meta.late) {
    const { c } = hero(meta.late);
    cams.late = { c, z: mv(1.12, 1, ease(p('toLate'))) * (t >= START.late[0] ? mv(1, 1.03, p('late')) : 1), o: ease(p('toLate')) };
  }

  const stageStyle = (m, cam, under = 0) => {
    const cover = Math.max(vp.w / m.width, vp.h / m.height), s = cover * cam.z;
    let tx = vp.w / 2 - cam.c[0] * s, ty = vp.h / 2 - cam.c[1] * s;
    // never show past the picture's edges, except a strip hidden under the text card (`under` px at the bottom)
    tx = clamp(tx, vp.w - m.width * s, 0); ty = clamp(ty, vp.h - m.height * s - under, 0);
    return { width: m.width, height: m.height, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s})` };
  };
  const warp = (w, h, q) => ({ width: w, height: h, transform: quadToMatrix3d(w, h, q) });

  const screenFor = { close: SCREENS.intro, wide: SCREENS.wide, play: SCREENS.question, late: SCREENS.late };
  const fire = cams.late ? lerp(1, 0.35, cams.late.o) : 1;
  const show = (id, a = 0.12, b = 0.9) => { const k = p(id); return inBeat(id) ? clamp(Math.min((k - a) / 0.1, (b - k) / 0.1)) : 0; };

  return (
    <section className="tn" ref={section} style={{ '--tn-len': TOTAL + 100 }} aria-label="Jeemu, one game night">
      <div className="tn-stage" ref={stage}>
        {SHOTS.map((s) => {
          const m = meta[s], cam = cams[s];
          if (!m || !cam) return null;
          return (
            <div key={s} className="tn-layer" style={{ opacity: cam.o, visibility: cam.o > 0.001 ? 'visible' : 'hidden' }}>
              <div className="tn-shot" style={stageStyle(m, cam, s === 'top' && portrait ? vp.card + 24 : 0)}>
                {(s === 'close' || loadRest) && <Pic src={`${BASE}${s}.jpg`} width={m.width} height={m.height} draggable="false" decoding="async"
                  fetchPriority={s === 'close' ? 'high' : 'low'} onLoad={s === 'close' ? startRest : undefined} />}
                {m.screen && screenFor[s] && (
                  <div className="tn-warp tn-screen" style={warp(320, 240, m.screen)}><LiveScreen card={screenFor[s]} /></div>
                )}
                {s === 'top' && loadRest && <TableOverlays m={m} warp={warp} written={written} />}
              </div>
              {s === 'top' && (
                // depth of field: a softened copy of the table on top, with a clear hole where the camera is focused
                <div className={`tn-dof ${portrait ? 'is-portrait' : ''}`} style={{ '--dof-y': `${dofAt}%` }} aria-hidden="true">
                  <div className="tn-shot" style={stageStyle(m, cam, portrait ? vp.card + 24 : 0)}>
                    {loadRest && <Pic src={`${BASE}top_blur.jpg`} width={m.width} height={m.height} draggable="false" decoding="async" />}
                    {loadRest && <TableOverlays m={m} warp={warp} written={written} soft />}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="tn-fire" style={{ opacity: fire }} aria-hidden="true" />
        <div className="tn-grain" aria-hidden="true" />
        <div className="tn-vignette" aria-hidden="true" />

        {/* words */}
        <div className="tn-hint" style={{ opacity: t < 30 ? 1 - t / 30 : 0 }} aria-hidden="true">Scroll</div>
        <div className="tn-caption" style={{ opacity: show('wide') }}>
          <span className="tn-kicker">{CAPTIONS.wide.kicker}</span>
          <h2>{CAPTIONS.wide.title}<br /><em>{CAPTIONS.wide.sub}</em></h2>
        </div>
        <div className="tn-caption" style={{ opacity: show('play') }}>
          <span className="tn-kicker">{CAPTIONS.play.kicker}</span>
          <h2>{CAPTIONS.play.title}</h2>
        </div>
        {POLAROIDS.map((pl, i) => (
          <div key={i} className="tn-card" style={{ opacity: show(`p${i}`, 0.3, 0.94) }}>
            <span className="tn-kicker">{String(i + 1).padStart(2, '0')} / {String(POLAROIDS.length).padStart(2, '0')}</span>
            <h3>{pl.title}</h3>
            <p>{pl.body}</p>
          </div>
        ))}
        <div className="tn-finale" style={{ opacity: inBeat('late') || t >= TOTAL ? clamp(p('late') / 0.15) : 0, pointerEvents: t >= START.late[0] ? 'auto' : 'none' }}>
          <h2>{FINALE.title}</h2>
          <p>{FINALE.sub}</p>
          <button type="button" className="tn-btn" onClick={() => onCta?.('finale')}>{FINALE.cta}</button>
        </div>
        <div className="tn-progress" aria-hidden="true"><i style={{ transform: `scaleX(${t / TOTAL})` }} /></div>
      </div>
    </section>
  );
}
