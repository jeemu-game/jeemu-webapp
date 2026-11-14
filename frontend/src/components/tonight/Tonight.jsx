import React, { useEffect, useMemo, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import LiveScreen from './LiveScreen';
import Pic from './Pic';
import LiveFire from './LiveFire';
import { setLevel as setFireLevel } from './fireSound';
import WaitlistScreen from '../waitlist/WaitlistScreen';
import { SCREENS, CAPTIONS, POLAROIDS, EXTRA_PHOTOS, FINALE, STORY, TEAM_PRINT } from './copy';
import { TEAM_MEMBERS, JOURNEY_MILESTONES, WHY_WE_CARE } from '../../data/teamData';
import { FAQS } from '../../data/faq';

// "Tonight": one game night, told by scrolling. Rendered stills of the room (from scripts/blender/room) sit on a
// sticky stage; a virtual camera pans and zooms across them in step with the scroll, and everything that changes
// (the Jeemu screen, the photos and handwriting on the polaroids, all text) is live HTML laid over the render using
// the corner positions the render script exports. Preview build: the stills stand in for the final rendered video.

const BASE = `${import.meta.env.BASE_URL}tonight/`;
const SHOTS = ['wide', 'close', 'play', 'top', 'late', 'end', 'top2'];
const FIRST_SHOT = 'wide';   // the landing frame
// shots of Jeemu's screen used as an interface: [shot, beat that brings it in, beat that takes it out]
const CHAPTERS = [['end', 'toEnd', 'toChapters']];

// After the waitlist the camera looks straight down on the late-night table (shot "top2") and stops at each thing on it:
// the five story prints, the team print (once per person), then the index cards (once per question).
// print: which print in the render's list; faq: the card stack
const STOPS = [
  ...STORY.map((st, i) => ({ id: `c${i}`, print: i, len: 95, title: st.title, body: st.body })),
  ...TEAM_MEMBERS.map((m) => ({ id: `t${m.initials}`, print: STORY.length, len: 70, title: m.name, sub: m.role, body: m.bio })),
  ...FAQS.map((f, k) => ({ id: `q${k}`, faq: k, len: 80, title: f.q, body: f.a }))
];
const FIRST_TEAM = STORY.length, FIRST_FAQ = STORY.length + TEAM_MEMBERS.length;
// after the fall the questions are etched on blocks lying on the table: the camera goes round them in this order
// (names from the render's meta, faqBlocks; scripts/blender/room: flat, wide face up, clear of the tower)
const FAQ_BLOCKS = ['Block51', 'Block11', 'Block37', 'Block33', 'Block30', 'Block23', 'Block09'];
// the prints on the chapters table, in the render's order
const CHAPTER_PRINTS = [...STORY, TEAM_PRINT];

// Scroll length of every beat, in % of the window height
const BEATS = [
  // opens on the room; the first scroll pushes in to Jeemu's screen, the next pulls back into the game
  ['wide', 110], ['toClose', 90], ['close', 100], ['toPlay', 90], ['play', 120], ['toTable', 90],
  ...POLAROIDS.map((_, i) => [`p${i}`, 105]),
  ['toLate', 90], ['late', 110], ['fall', 120], ['toEnd', 80], ['end', 150],   // fall: the tower comes down, scrubbed by the scroll   // end: the waitlist, on Jeemu's screen
  ['toChapters', 90], ...STOPS.map((st) => [st.id, st.len])
];
const START = {}; let acc = 0;
for (const [id, len] of BEATS) { START[id] = [acc, len]; acc += len; }
const TOTAL = acc;
const TOP_BAR = 56;
const WALL = { x: 965, y: 300, w: 720 };   // the chimney breast in the wide shot, image pixels
const FIREBOX = { x: 965, y: 712 };        // the fire in the wide shot, image pixels

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const mid = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// photos and handwriting on the prints in a shot. items: [{ photo, note }] in the render's order.
// written: notes up to this index have been written (they're "handwritten" as the camera arrives); -1 none, Infinity all
function PrintOverlays({ m, items, warp, written, soft = false }) {
  return m.polaroids.map((q, i) => {
    const it = items[i]; if (!it || !it.photo) return null;
    const ph = Math.round(600 * dist(q.photo[0], q.photo[3]) / dist(q.photo[0], q.photo[1]));
    const capH = Math.round(600 * dist(q.caption[0], q.caption[3]) / dist(q.caption[0], q.caption[1]));
    return (
      <React.Fragment key={i}>
        <div className={`tn-warp tn-photo ${soft ? 'is-soft' : ''}`} style={warp(600, ph, q.photo)}><Pic src={`${BASE}${it.photo}`} decoding="async" /></div>
        {it.note && (
          <div className={`tn-warp tn-note ${soft ? 'is-soft' : ''} ${i <= written ? 'is-written' : ''}`} style={warp(600, capH, q.caption)}>
            <span style={{ fontSize: `${Math.min(capH * 0.45, 1050 / Math.max(10, it.note.length))}px` }}>{it.note}</span>
          </div>
        )}
      </React.Fragment>
    );
  });
}
const HOW_PRINTS = [...POLAROIDS, ...EXTRA_PHOTOS.map((photo) => ({ photo }))];

// a question laser-etched into a fallen block's top face (75 x 25 mm): burnt-in dark lettering, slightly soft
function EtchedBlock({ q, warp, text, soft = false }) {
  const size = text.length > 34 ? 34 : 40;
  return (
    <div className={`tn-warp tn-etch ${soft ? 'is-soft' : ''}`} style={warp(600, 200, q)}>
      <span style={{ fontSize: `${size}px` }}>{text}</span>
    </div>
  );
}
const faqQuads = (m) => {
  if (!m.faqBlocks) return [];
  const by = Object.fromEntries(m.faqBlocks.map((b) => [b.block, b.quad]));
  const picked = FAQ_BLOCKS.map((n) => by[n]).filter(Boolean);
  return FAQS.map((_, k) => picked[k % Math.max(1, picked.length)] || m.faqBlocks[k % m.faqBlocks.length].quad);
};

export default function Tonight({ onCta }) {
  const section = useRef(null);
  const stage = useRef(null);
  const [t, setT] = useState(0);                       // scroll position in the story, in % of window height
  const [vp, setVp] = useState({ w: 1280, h: 800, card: 0 });
  const [meta, setMeta] = useState({});
  const [written, setWritten] = useState(-1);          // highest polaroid whose note has been written
  const [written2, setWritten2] = useState(-1);        // the same, on the chapters table
  // the opening shot loads first; the rest follow once it is in (or as soon as the visitor starts scrolling)
  const [loadRest, setLoadRest] = useState(false);
  const [lit, setLit] = useState(false);              // the lights come up once the landing frame is in
  const startRest = () => {
    setLit(true);
    const go = () => setLoadRest(true);
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 300);
  };
  useEffect(() => { if (t > 2) setLoadRest(true); }, [t]);
  useEffect(() => { const id = setTimeout(() => setLoadRest(true), 4000); return () => clearTimeout(id); }, []);   // safety net
  // the fall: frames from scripts/blender/room (render_fall.sh), decoded ahead so scrubbing never waits
  const [fall, setFall] = useState(null);   // { count, ext }
  useEffect(() => {
    if (fall || t < START.play[0]) return;
    let live = true;
    fetch(`${BASE}fall/index.json`).then((r) => (r.ok ? r.json() : null)).then(async (j) => {
      if (!j || !live) return;
      const ext = await new Promise((res) => { const im = new Image(); im.onload = () => res('avif'); im.onerror = () => res('jpg');
        im.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='; });
      const imgs = Array.from({ length: j.count }, (_, i) => { const im = new Image(); im.decoding = 'async'; im.src = `${BASE}fall/${String(i).padStart(2, '0')}.${ext}`; return im; });
      if (live) setFall({ count: j.count, ext, imgs });
    }).catch(() => {});
    return () => { live = false; };
  }, [t > START.play[0], fall]);
  const fallFrame = fall && t >= START.fall[0] ? Math.min(fall.count - 1, Math.round(p('fall') * (fall.count - 1) * 1.15)) : -1;
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    SHOTS.forEach((s) => fetch(`${BASE}${s}.json`).then((r) => r.json()).then((j) => setMeta((m) => ({ ...m, [s]: j }))).catch(() => {}));
  }, []);

  useEffect(() => {
    // The camera glides after the scroll position instead of jumping with every wheel tick or touch move: the shown
    // position eases toward the real one (time constant ~0.12 s). Big jumps (links to a section) and reduced motion snap.
    let raf = 0, glide = 0, shown = -1, target = 0, last = 0;
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const step = (now) => {
      glide = 0;
      const dt = Math.min(64, now - (last || now)); last = now;
      const d = target - shown;
      shown = Math.abs(d) < 0.05 ? target : shown + d * (1 - Math.exp(-dt / 120));
      setT(shown);
      if (shown !== target) glide = requestAnimationFrame(step); else last = 0;
    };
    const read = () => {
      raf = 0;
      const el = section.current, st = stage.current; if (!el || !st) return;
      // measure against the sticky stage (100svh), not innerHeight: on phones innerHeight changes as the address bar
      // shows and hides, which would make the story jump mid-scroll
      const h = st.clientHeight, w = st.clientWidth;
      const range = el.offsetHeight - h;
      target = range > 0 ? clamp((-el.getBoundingClientRect().top / range) * TOTAL, 0, TOTAL) : 0;
      if (!smooth || shown < 0 || Math.abs(target - shown) > 260) { shown = target; setT(target); }
      else if (!glide) glide = requestAnimationFrame(step);
      // tallest text card: on portrait screens the polaroid is framed in the space above it
      const card = Math.max(0, ...[...st.querySelectorAll('.tn-card')].map((c) => c.offsetHeight));
      setVp((v) => (v.w === w && v.h === h && v.card === card ? v : { w, h, card }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); cancelAnimationFrame(glide); };
  }, []);

  const p = (id) => { const [s, l] = START[id]; return clamp((t - s) / l); };        // 0..1 progress through a beat
  const inBeat = (id) => { const [s, l] = START[id]; return t >= s && t < s + l; };
  const portrait = vp.w / vp.h < 0.9;

  // ---- per-shot camera (centre in image pixels, zoom relative to "cover") and opacity
  const cams = {};
  const hero = (m) => {
    const sc = m.screen ? mid(m.screen) : [m.width / 2, m.height / 2];
    return { sc, c: portrait ? [sc[0], lerp(m.height / 2, sc[1], 0.4)] : [lerp(m.width / 2, sc[0], 0.25), m.height / 2] };
  };
  const mv = (z0, z1, k) => (reduce ? 1 : lerp(z0, z1, k));
  if (meta.wide) {
    const { sc, c } = hero(meta.wide);
    const kout = ease(p('toClose'));
    cams.wide = t < START.toClose[0] ? { c, z: mv(1, 1.03, p('wide')), o: 1 }
      : { c: [lerp(c[0], sc[0], kout), lerp(c[1], sc[1], kout)], z: mv(1.03, 1.7, kout), o: 1 - kout };
  }
  if (meta.close) {
    const { sc, c } = hero(meta.close);
    const kin = ease(p('toClose')), kout = ease(p('toPlay'));
    let cc = [lerp(sc[0], c[0], kin), lerp(sc[1], c[1], kin)], z = mv(1.35, 1, kin);
    if (t >= START.close[0]) { cc = c; z = mv(1, 1.04, p('close')); }
    if (t >= START.toPlay[0]) { cc = [lerp(c[0], sc[0], kout), lerp(c[1], sc[1], kout)]; z = mv(1.04, 1.35, kout); }
    cams.close = { c: cc, z, o: Math.min(kin, 1 - kout) };
  }
  if (meta.play) {
    const { c } = hero(meta.play);
    const kin = ease(p('toPlay')), kout = ease(p('toTable'));
    cams.play = { c, z: t < START.play[0] ? mv(1.18, 1, kin) : t < START.toTable[0] ? mv(1, 1.04, p('play')) : mv(1.04, 1.25, kout), o: Math.min(kin, 1 - kout) };
  }
  // A camera looking straight down on a table, stopping at one thing after another (quads[i], reached in beat ids[i]).
  // Portrait: the thing fills the space between the top bar and the text; wide: left of centre, text on the right.
  const tablePan = (m, quads, ids, inId, outId) => {
    const cover = Math.max(vp.w / m.width, vp.h / m.height);
    const free = portrait ? Math.max(vp.h * 0.3, vp.h - TOP_BAR - (vp.card || vp.h * 0.25) - 34) : vp.h;
    const fit = (q) => Math.max(1, Math.min((portrait ? free * 0.86 : vp.h * 0.46) / dist(q[0], q[3]), (vp.w * (portrait ? 0.74 : 0.42)) / dist(q[0], q[1])) / cover);
    const off = portrait ? [0, vp.h / 2 - (TOP_BAR + 8 + free / 2)] : [vp.w * 0.14, 0];   // + moves the subject left / up
    const at = (i, z) => { const c = mid(quads[i]); return [c[0] + off[0] / (cover * z), c[1] + off[1] / (cover * z)]; };
    let cur = -1;
    ids.forEach((id, i) => { if (t >= START[id][0]) cur = i; });
    let c, z;
    if (cur < 0) { const z0 = fit(quads[0]); c = at(0, z0); z = mv(z0 * 1.25, z0, ease(p(inId))); }
    else {
      const k = ease(clamp(p(ids[cur]) / 0.32)), a = Math.max(0, cur - 1), za = fit(quads[a]), zb = fit(quads[cur]);
      const from = at(a, za), to = at(cur, zb);
      c = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
      z = lerp(za, zb, k) * (quads[a] !== quads[cur] && !reduce ? 1 - 0.1 * Math.sin(Math.PI * k) : 1);   // lift a little while moving
    }
    if (outId && t >= START[outId][0]) z = mv(z, z * 1.12, ease(p(outId)));
    const arrived = cur >= 0 && (!inBeat(ids[cur]) || p(ids[cur]) > 0.32);
    // depth of field: sharp over whatever the camera is on (sized to it), soft beyond
    const q = quads[Math.max(0, cur)], sz = cover * z;
    const half = [dist(q[0], q[1]) * sz / 2, dist(q[0], q[3]) * sz / 2];
    const dof = { x: ((vp.w / 2 - off[0]) / vp.w) * 100, y: ((vp.h / 2 - off[1]) / vp.h) * 100,
      rx: (half[0] / 0.62 * 1.1 / vp.w) * 100, ry: (half[1] / 0.62 * 1.15 / vp.h) * 100 };
    return { c, z, o: Math.min(ease(p(inId)), outId ? 1 - ease(p(outId)) : 1), cur, arrived, dof };
  };
  if (meta.top) cams.top = tablePan(meta.top, meta.top.polaroids.slice(0, POLAROIDS.length).map((q) => q.card), POLAROIDS.map((_, i) => `p${i}`), 'toTable', 'toLate');
  if (meta.top2 && (meta.top2.faqBlocks || meta.top2.faq)) {
    const m = meta.top2, fq = faqQuads(m);
    cams.top2 = tablePan(m, STOPS.map((st) => (st.faq !== undefined ? (fq[st.faq] || m.faq) : m.polaroids[st.print].card)), STOPS.map((st) => st.id), 'toChapters', null);
  }
  if (meta.late) {
    const { c } = hero(meta.late);
    const sc = meta.late.screen ? mid(meta.late.screen) : c, kout = ease(p('toEnd'));
    const zl = mv(1.12, 1, ease(p('toLate'))) * (t >= START.late[0] ? mv(1, 1.03, p('late')) : 1);
    cams.late = t < START.toEnd[0] ? { c, z: zl, o: ease(p('toLate')) }
      : { c: [lerp(c[0], sc[0], kout), lerp(c[1], sc[1], kout)], z: zl * mv(1, 2.4, kout), o: 1 - ease(clamp((p('toEnd') - 0.35) / 0.65)) };
  }
  // the four screen shots: the screen big enough to use (about a third of a wide window, most of a phone's width) and a
  // little above centre so a phone keyboard doesn't cover it. Each pushes in gently as it fades up, and on out as it goes.
  CHAPTERS.forEach(([shot, inId, outId]) => {
    const m = meta[shot]; if (!m || !m.screen) return;
    const q = m.screen, sc = mid(q), cover = Math.max(vp.w / m.width, vp.h / m.height);
    const zs = Math.max(1, ((portrait ? 0.8 : 0.36) * vp.w) / (dist(q[0], q[1]) * cover), portrait ? 1 : (0.42 * vp.h) / (dist(q[0], q[3]) * cover));
    const lift = portrait ? vp.h * 0.12 : vp.h * 0.03;
    const c = [sc[0], sc[1] + lift / (cover * zs)];
    const kin = ease(clamp((p(inId) - 0.25) / 0.75)), kout = outId ? ease(p(outId)) : 0;
    const z = t < START[inId][0] + START[inId][1] ? mv(zs * 0.86, zs, kin) : mv(zs, zs * 1.08, kout);
    cams[shot] = { c, z: Math.max(1, z), o: Math.min(kin, 1 - kout) };
  });
  const onShot = (shot) => cams[shot] && cams[shot].o > 0.6;
  const cur = cams.top ? cams.top.cur : -1, cur2 = cams.top2 ? cams.top2.cur : -1;
  const reached2 = cur2 < 0 ? -1 : STOPS[cur2].faq !== undefined ? CHAPTER_PRINTS.length : STOPS[cur2].print;
  useEffect(() => { if (cams.top && cams.top.arrived && cur > written) setWritten(cur); });
  useEffect(() => { if (cams.top2 && cams.top2.arrived && reached2 > written2) setWritten2(reached2); });

  const place = (m, cam, under = 0) => {
    const cover = Math.max(vp.w / m.width, vp.h / m.height), s = cover * cam.z;
    let tx = vp.w / 2 - cam.c[0] * s, ty = vp.h / 2 - cam.c[1] * s;
    // never show past the picture's edges, except a strip hidden under the text card (`under` px at the bottom)
    tx = clamp(tx, vp.w - m.width * s, 0); ty = clamp(ty, vp.h - m.height * s - under, 0);
    return { tx, ty, s };
  };
  const stageStyle = (m, cam, under = 0) => {
    const { tx, ty, s } = place(m, cam, under);
    return { width: m.width, height: m.height, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s})` };
  };
  // a point in a shot (image pixels) -> where it is in the window right now
  const project = (m, cam, x, y) => { const { tx, ty, s } = place(m, cam); return [tx + x * s, ty + y * s, s]; };
  const warp = (w, h, q) => ({ width: w, height: h, transform: quadToMatrix3d(w, h, q) });

  const screenFor = { close: SCREENS.intro, wide: SCREENS.wide, play: SCREENS.question, late: SCREENS.late };
  // the fire burns down for the end of the night and stays low for everything after it
  const fire = cams.late ? lerp(1, 0.35, Math.max(cams.late.o, cams.top2 ? cams.top2.o : 0, ...CHAPTERS.map(([sh]) => (cams[sh] ? cams[sh].o : 0)))) : 1;
  const endOn = onShot('end');
  setFireLevel((fire - 0.35) / 0.65);   // the crackle follows the fire: full while people play, softer as it dies down
  const show = (id, a = 0.12, b = 0.9) => { const k = p(id); return inBeat(id) ? clamp(Math.min((k - a) / 0.1, (b - k) / 0.1)) : 0; };

  return (
    <section className="tn" ref={section} style={{ '--tn-len': TOTAL + 100 }} aria-label="Jeemu, one game night">
      {/* where "Join the waitlist" links land: partway into the end beat, so the camera is settled on the screen */}
      <span id="waitlist" className="tn-anchor" style={{ '--at': START.end[0] + 45 }} aria-hidden="true" />
      <span id="journey" className="tn-anchor" style={{ '--at': START[STOPS[0].id][0] + 40 }} aria-hidden="true" />
      <span id="team" className="tn-anchor" style={{ '--at': START[STOPS[FIRST_TEAM].id][0] + 40 }} aria-hidden="true" />
      <span id="faq" className="tn-anchor" style={{ '--at': START[STOPS[FIRST_FAQ].id][0] + 40 }} aria-hidden="true" />
      <ChapterText />
      <div className="tn-stage" ref={stage}>
        {SHOTS.map((s) => {
          const m = meta[s], cam = cams[s];
          if (!m || !cam) return null;
          return (
            <div key={s} className="tn-layer" style={{ opacity: cam.o, visibility: cam.o > 0.001 ? 'visible' : 'hidden' }}>
              <div className="tn-shot" style={stageStyle(m, cam, (s === 'top' || s === 'top2') && portrait ? vp.card + 24 : 0)}>
                {(s === FIRST_SHOT || loadRest) && <Pic src={`${BASE}${s}.jpg`} width={m.width} height={m.height} draggable="false" decoding="async"
                  fetchPriority={s === FIRST_SHOT ? 'high' : 'low'} onLoad={s === FIRST_SHOT ? startRest : undefined} />}
                {s === 'late' && fallFrame >= 0 && (
                  <img className="tn-fallframe" src={`${BASE}fall/${String(fallFrame).padStart(2, '0')}.${fall.ext}`} alt="" draggable="false" />
                )}
                {loadRest && (m.firebox || m.flames) && <LiveFire shot={s} m={m} warp={warp} active={cam.o > 0.01} />}
                {m.screen && s === 'end' && (
                  <div className="tn-warp tn-screen is-ui" style={warp(320, 240, m.screen)}>
                    <WaitlistScreen active={endOn} onArrive={() => setTimeout(() => document.getElementById('waitlist')?.scrollIntoView(), 300)} />
                  </div>
                )}
                {m.screen && screenFor[s] && (
                  <div className="tn-warp tn-screen" style={warp(320, 240, m.screen)}><LiveScreen card={screenFor[s]} active={cam.o > 0.5} /></div>
                )}
                {loadRest && m.polaroids && (
                  <PrintOverlays m={m} items={s === 'top2' ? CHAPTER_PRINTS : HOW_PRINTS} warp={warp}
                    written={s === 'top' ? written : s === 'top2' ? written2 : Infinity} />
                )}
                {s === 'top2' && m.faqBlocks && faqQuads(m).slice(0, FAQS.length).map((q, k) => <EtchedBlock key={k} q={q} warp={warp} text={FAQS[k].q} />)}
              </div>
              {(s === 'top' || s === 'top2') && (
                // depth of field: a softened copy of the table on top, with a clear hole where the camera is focused
                <div className="tn-dof" style={{ '--dof-x': `${cam.dof.x}%`, '--dof-y': `${cam.dof.y}%`, '--dof-rx': `${cam.dof.rx}%`, '--dof-ry': `${cam.dof.ry}%` }} aria-hidden="true">
                  <div className="tn-shot" style={stageStyle(m, cam, portrait ? vp.card + 24 : 0)}>
                    {loadRest && <Pic src={`${BASE}${s}_blur.jpg`} width={m.width} height={m.height} draggable="false" decoding="async" />}
                    {loadRest && <PrintOverlays m={m} items={s === 'top2' ? CHAPTER_PRINTS : HOW_PRINTS} warp={warp} written={s === 'top' ? written : written2} soft />}
                    {loadRest && s === 'top2' && m.faqBlocks && faqQuads(m).slice(0, FAQS.length).map((q, k) => <EtchedBlock key={k} q={q} warp={warp} text={FAQS[k].q} soft />)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="tn-fire" style={{ opacity: fire }} aria-hidden="true" />
        {/* walking in: dark first, the fire glows through, then the room comes up (once, on load) */}
        {meta.wide && cams.wide && (() => {
          const [fx, fy] = project(meta.wide, cams.wide, FIREBOX.x, FIREBOX.y);
          return <div className={`tn-lights ${lit ? 'is-up' : ''}`} style={{ '--fx': `${fx}px`, '--fy': `${fy}px` }} aria-hidden="true" />;
        })()}
        <div className="tn-grain" aria-hidden="true" />
        <div className="tn-vignette" aria-hidden="true" />

        {/* words */}
        <div className="tn-hint" style={{ opacity: t < 30 ? 1 - t / 30 : 0 }} aria-hidden="true">Scroll</div>
        {meta.wide && cams.wide && (() => {
          // over the stone chimney breast, moving with it (the wall spans about x 560-1370, y 0-600 in the render)
          const [x, y0, sc] = project(meta.wide, cams.wide, WALL.x, WALL.y);
          const y = Math.max(y0, TOP_BAR + (portrait ? 110 : 80));   // phones crop the top of the wall away
          const cw = Math.min(vp.w - 32, WALL.w * sc);
          return (
            <div className="tn-caption tn-on-wall" style={{ opacity: t < START.toClose[0] ? 1 : clamp(1 - p('toClose') / 0.3), left: clamp(x, cw / 2 + 16, vp.w - cw / 2 - 16), top: y, width: cw }}>
              <h2>{CAPTIONS.wide.title} {CAPTIONS.wide.sub}</h2>
            </div>
          );
        })()}
        <div className="tn-caption" style={{ opacity: show('play') }}>
          <h2>{CAPTIONS.play.title}</h2>
        </div>
        {POLAROIDS.map((pl, i) => (
          <div key={i} className="tn-card" style={{ opacity: show(`p${i}`, 0.3, 0.94) }}>
            <h3>{pl.title}</h3>
            <p>{pl.body}</p>
          </div>
        ))}
 {STOPS.map((st) => (
          <div key={st.id} className="tn-card" style={{ opacity: show(st.id, 0.3, 0.94) }}>
            <h3>{st.title}</h3>
            {st.sub && <p className="tn-sub">{st.sub}</p>}
            <p>{st.body}</p>
          </div>
        ))}
        <div className="tn-finale" style={{ opacity: inBeat('late') ? clamp(Math.min(p('late') / 0.15, (1 - p('late')) / 0.2)) : 0 }}>
          <h2>{FINALE.title}</h2>
          <p>{FINALE.sub}</p>
        </div>
        <p className="tn-fine" style={{ opacity: endOn ? 1 : 0 }}>Joining is free. We only use your email to tell you about the launch.</p>
        <div className="tn-progress" aria-hidden="true"><i style={{ transform: `scaleX(${t / TOTAL})` }} /></div>
      </div>
    </section>
  );
}

// The chapters' full words, for search engines and screen readers (the table shows them one stop at a time)
function ChapterText() {
  return (
    <div className="sr-only">
      <h2>Our story</h2>
      {JOURNEY_MILESTONES.map((j) => <section key={j.title}><h3>{j.title}</h3><p>{j.phase}</p><p>{j.desc}</p></section>)}
      <h3>Why we care</h3><p>{WHY_WE_CARE}</p>
      <h2>The team</h2>
      {TEAM_MEMBERS.map((m) => <section key={m.name}><h3>{m.name}, {m.role}</h3><p>{m.bio}</p></section>)}
      <h2>Questions</h2>
      {FAQS.map((f) => <section key={f.q}><h3>{f.q}</h3><p>{f.a}</p></section>)}
    </div>
  );
}
