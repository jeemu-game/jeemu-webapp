import React, { useEffect, useMemo, useRef, useState } from 'react';
import { quadToMatrix3d } from '../story/quad';
import LiveScreen from './LiveScreen';
import Pic from './Pic';
import LiveFire from './LiveFire';
import { ASSET_V } from './assetVersion';
import { SMALL, MOBILE, CAPTURE, DEBUG } from './device';
import MobileStage from './MobileStage';
import SeqPlayer, { filmReady, segInfo, frameFit } from './SeqPlayer';
import WaitlistScreen from '../waitlist/WaitlistScreen';
import KickstarterScreen from '../waitlist/KickstarterScreen';
import { useLive } from './useCountdown';
import { SCREENS, CAPTIONS, POLAROIDS, EXTRA_PHOTOS, FINALE, STORY, TEAM_PRINT } from './copy';
import { TEAM_MEMBERS, JOURNEY_MILESTONES, WHY_WE_CARE } from '../../data/teamData';
import { FAQS } from '../../data/faq';

// "Tonight": one game night, told by scrolling. Rendered stills of the room (from scripts/blender/room) sit on a
// sticky stage; a virtual camera pans and zooms across them in step with the scroll, and everything that changes
// (the Jeemu screen, the photos and handwriting on the polaroids, all text) is live HTML laid over the render using
// the corner positions the render script exports. Preview build: the stills stand in for the final rendered video.

const BASE = `${import.meta.env.BASE_URL}tonight/`;
// every render file goes out with the version of the current renders, so a re-render never shows from an old cache
const at = (file) => `${BASE}${file}?v=${ASSET_V}`;
// Phones get smaller copies of the renders (<shot>_m.jpg, from prepare_site_assets.py): a phone can't show more than
// that, and decoding the full ones as the reader scrolls is what ran iPhone Safari out of memory. Same layout either way.
const shotSrc = (s) => at(`${s}${SMALL ? '_m' : ''}.jpg`);

// the FAQ close-ups: one render per question, low and square to the block it's burnt into (scripts/blender/room/render_faq.sh)
const FAQ_SHOTS = FAQS.map((_, k) => `faq${k}`);
const SHOTS = ['wide', 'close', 'play', 'top', 'late', 'end', 'top2', ...FAQ_SHOTS];
const FIRST_SHOT = 'wide';   // the landing frame
// shots of Jeemu's screen used as an interface: [shot, beat that brings it in, beat that takes it out]
const CHAPTERS = [['end', 'toEnd', 'toChapters']];

// After the waitlist the camera looks straight down on the late-night table (shot "top2") and stops at each thing on it:
// the five story prints, the team print (one stop: the six of us on one card, no scrolling through six bios), then the
// questions (once each).
// A wide window frames two prints at a stop (half the scrolling); a phone keeps one per screen so each stays readable.
// Decided once, at load (the stops are the page's length).
const WIDE_AT_LOAD = !MOBILE && (typeof window === 'undefined' || window.innerWidth >= window.innerHeight * 0.9);
// The rendered film (SeqPlayer.jsx): once every camera move for this device is rendered and packed, the story plays it.
const FILM_DEV = MOBILE ? 'phone' : 'desk';
const FILM = !CAPTURE && filmReady(FILM_DEV);
const DESK_FILM = FILM && FILM_DEV === 'desk';
const groups = (n) => (WIDE_AT_LOAD ? Array.from({ length: Math.ceil(n / 2) }, (_, g) => [2 * g, 2 * g + 1].filter((i) => i < n))
  : Array.from({ length: n }, (_, i) => [i]));
const HOW = groups(POLAROIDS.length);   // the table of polaroids: which ones each stop frames
// prints: which prints in the render's list the stop frames; faq: the question's block
const STOPS = [
  ...groups(STORY.length).map((g, j) => ({ id: `c${j}`, prints: g, len: 95 + 30 * (g.length - 1), items: g.map((i) => STORY[i]) })),
  { id: 'team', prints: [STORY.length], len: 120, title: 'The six of us', team: TEAM_MEMBERS },
  ...FAQS.map((f, k) => ({ id: `q${k}`, faq: k, len: 80, title: f.q, body: f.a }))
];
const FIRST_TEAM = STOPS.findIndex((st) => st.id === 'team'), FIRST_FAQ = FIRST_TEAM + 1;
const PAIRED = new Set([...HOW.map((g, j) => (g.length > 1 ? `p${j}` : '')), ...STOPS.map((st) => (st.prints && st.prints.length > 1 ? st.id : ''))]);
// the rectangle around several prints, for the camera to frame them together
const around = (qs) => { const xs = qs.flat().map((p) => p[0]), ys = qs.flat().map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; };
// after the fall the questions are etched on blocks lying on the table: the camera goes round them in this order
// (names from the render's meta, faqBlocks; scripts/blender/room: flat, wide face up, clear of the tower)
const FAQ_BLOCKS = ['Block11', 'Block51', 'Block39', 'Block43', 'Block52', 'Block42', 'Block09'];   // same order as the questions (render: --faq-blocks)
// the prints on the chapters table, in the render's order
const CHAPTER_PRINTS = [...STORY, TEAM_PRINT];

// Scroll length of every beat, in % of the window height
const PRINT_STOPS = STOPS.filter((st) => st.faq === undefined), FAQ_STOPS = STOPS.filter((st) => st.faq !== undefined);
// the film: each move gets its own beat (the camera moves as you scroll); on a phone the table stops include the glide
// from the print before, so they're longer
const FILM_BEATS = [
  ['wide', 110], ['toClose', 130], ['close', 100], ['toPlay', 130], ['play', 120], ['toTable', 150],
  ...HOW.map((g, j) => [`p${j}`, DESK_FILM ? 105 + 30 * (g.length - 1) : j ? 125 : 100]),
  ...(DESK_FILM ? [['backTop', 60]] : []),
  ['toLate', DESK_FILM ? 160 : 190], ['late', 110], ['fall', 200], ['toEnd', 120], ['end', 150], ['toChapters', 150],
  ...PRINT_STOPS.map((st, i) => [st.id, DESK_FILM ? st.len : i ? 125 : 100]),
  ...(DESK_FILM ? [['backTop2', 60]] : []),
  ['toFaq', 150], ...FAQ_STOPS.map((st, k) => [st.id, k ? 130 : 90])
];
const BEATS = FILM ? FILM_BEATS : [
  // opens on the room; the first scroll pushes in to Jeemu's screen, the next pulls back into the game
  ['wide', 110], ['toClose', 90], ['close', 100], ['toPlay', 90], ['play', 120], ['toTable', 90],
  ...HOW.map((g, j) => [`p${j}`, 105 + 30 * (g.length - 1)]),
  ['toLate', 90], ['late', 110], ['fall', 120], ['toEnd', 80], ['end', 150],   // fall: the tower comes down, scrubbed by the scroll   // end: the waitlist, on Jeemu's screen
  ['toChapters', 90], ...STOPS.map((st) => [st.id, st.len])
];
const BEAT_IDS = BEATS.map(([id]) => id);
const START = {}; let acc = 0;
for (const [id, len] of BEATS) { START[id] = [acc, len]; acc += len; }
const TOTAL = acc;
// Where in the scroll each shot can be on screen [from, to]. Only shots near the reader are mounted: a phone can't hold
// every render decoded at once (that's what made iPhone Safari reload the page), and the browser frees what's unmounted.
const endOf = (id) => START[id][0] + START[id][1];
const SPAN = {
  wide: [0, endOf('toClose')], close: [START.toClose[0], endOf('toPlay')], play: [START.toPlay[0], endOf('toTable')],
  top: [START.toTable[0], endOf('toLate')], late: [START.toLate[0], endOf('toEnd')], end: [START.toEnd[0], endOf('toChapters')],
  top2: [START.toChapters[0], TOTAL],
  ...Object.fromEntries(FAQS.map((_, k) => { const n = STOPS[FIRST_FAQ + k + 1]; return [`faq${k}`, [START[`q${k}`][0], n ? endOf(n.id) : TOTAL]]; }))
};
// The phone version's frames (MobileStage.jsx): each stop held from a to b (% of the window height), crossfading between.
// Table stops move on in the first third of their beat, like the camera does here; the fall plays its own frames.
const hold = (id, a, b) => ({ id, a, b });
const beatHold = (id, first) => { const [s, l] = START[id]; return hold(id, first ? s : s + 0.32 * l, s + l); };
const FALL_END = START.fall[0] + START.fall[1] * 0.87;   // the last fall frame is reached here (fallFrame below)
export const MOBILE_KEYS = [
  hold('wide', 0, START.toClose[0]), hold('close', endOf('toClose'), START.toPlay[0]), hold('play', endOf('toPlay'), START.toTable[0]),
  ...HOW.map((_, j) => beatHold(`p${j}`, j === 0)),
  hold('late', endOf('toLate'), START.fall[0]), hold('fallen', FALL_END, START.toEnd[0]), hold('end', endOf('toEnd'), START.toChapters[0]),
  ...STOPS.map((st, i) => beatHold(st.id, i === 0))
];
const MOBILE_FALL = { from: START.fall[0], to: FALL_END };
const AHEAD = 140;   // mount this far (in % of the window height) before a shot comes into view, so it's decoded in time
const near = (s, t) => t >= SPAN[s][0] - AHEAD && t <= SPAN[s][1] + AHEAD;
const FILM_SPAN = FILM ? { top: [START.toTable[0], endOf('toLate')], top2: [START.toChapters[0], endOf('toFaq')] } : {};
const filmNear = (s, t) => FILM_SPAN[s] && t >= FILM_SPAN[s][0] - AHEAD && t <= FILM_SPAN[s][1] + AHEAD;
const TOP_BAR = 56;
const WALL = { x: 965, y: 300, w: 720 };   // the chimney breast in the wide shot, image pixels

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
        <div className={`tn-warp tn-photo ${soft ? 'is-soft' : ''}`} style={warp(600, ph, q.photo)}><Pic src={at(it.photo)} decoding="async" /></div>
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
  const size = text.length > 34 ? 28 : text.length > 22 ? 32 : 38;
  return (
    <div className={`tn-warp tn-etch ${soft ? 'is-soft' : ''}`} style={warp(600, 200, q)}>
      <span style={{ fontSize: `${size}px` }}>{text}</span>
    </div>
  );
}
// until the chapters table is re-rendered with fallen blocks: the question written on the top index card
function FaqCard({ q, warp, k, soft = false }) {
  return (
    <div className={`tn-warp tn-index ${soft ? 'is-soft' : ''}`} style={warp(600, 360, q)}>
      <span key={k}>{FAQS[Math.max(0, k)].q}</span>
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
  const live = useLive();                              // the campaign has opened: Jeemu's end screen sends people to it
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
  const fallImgs = useRef([]);              // the fall's frames, decoded and held (computers only)
  useEffect(() => {
    if (FILM || MOBILE || fall || t < START.play[0]) return;
    let live = true;
    fetch(at('fall/index.json')).then((r) => (r.ok ? r.json() : null)).then(async (j) => {
      if (!j || !live) return;
      const ext = await new Promise((res) => { const im = new Image(); im.onload = () => res('avif'); im.onerror = () => res('jpg');
        im.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='; });
      // fetched ahead into the cache so scrubbing never waits. A computer also keeps them decoded, so every frame
      // shows the instant it's asked for (otherwise a quick scroll skips from standing to fallen); a phone can't afford that
      for (let i = 0; i < j.count; i++) {
        const u = at(`fall/${String(i).padStart(2, '0')}${SMALL ? '_m' : ''}.${ext}`);
        if (SMALL) fetch(u).catch(() => {});
        else { const im = new Image(); im.src = u; im.decode?.().catch(() => {}); fallImgs.current[i] = im; }
      }
      if (live) setFall({ count: j.count, ext });
    }).catch(() => {});
    return () => { live = false; };
  }, [t > START.play[0], fall]);
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (FILM) setTimeout(() => setLit(true), 150);
    if (MOBILE && !DESK_FILM) { setTimeout(() => setLit(true), 150); return; }
    (DESK_FILM ? ['top', 'top2'] : SHOTS).forEach((s) => fetch(at(`${s}.json`)).then((r) => r.json()).then((j) => setMeta((m) => ({ ...m, [s]: j }))).catch(() => {}));
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
  const fallFrame = fall && t >= START.fall[0] ? Math.min(fall.count - 1, Math.round(p('fall') * (fall.count - 1) * 1.15)) : -1;
  const portrait = vp.w / vp.h < 0.9;

  // ---- the film: which frame, or which shot in full, the scroll is on (SeqPlayer)
  const film = (() => {
    if (!FILM) return null;
    let bi = 0; while (bi < BEAT_IDS.length - 1 && t >= START[BEAT_IDS[bi + 1]][0]) bi++;
    const id = BEAT_IDS[bi], k = p(id), desk = DESK_FILM;
    const sq = (seg, x) => ({ seg, frame: Math.round(clamp(x) * (segInfo(FILM_DEV, seg).n - 1)) });
    const st = (seg, which) => ({ seg, still: which });
    // a stop reached by a move at the start of its own beat: the move, then the shot in full
    const arrive = (seg, x, share = 0.35) => (x < share ? sq(seg, x / share) : st(seg, 'last'));
    let v = null, css = null, o = 1, under = null, waitlist = false;
    if (id === 'wide') v = st('wide-close', 'first');
    else if (id === 'toClose') v = sq('wide-close', k);
    else if (id === 'close') v = st('wide-close', 'last');
    else if (id === 'toPlay') v = sq('close-play', k);
    else if (id === 'play') v = st('close-play', 'last');
    else if (id === 'toTable') v = sq(desk ? 'play-top' : 'play-print0', k);
    else if (/^p\d+$/.test(id) || id === 'backTop') {
      const j = +id.slice(1);
      if (desk) { css = 'top'; o = 0; v = st('play-top', 'last'); }
      else v = j === 0 ? st('play-print0', 'last') : arrive(`hprint${j - 1}-${j}`, k);
    } else if (id === 'toLate') {
      if (desk) { if (k < 0.15) { css = 'top'; o = k / 0.15; v = sq('top-late', 0); } else v = sq('top-late', (k - 0.15) / 0.85); }   // the night moves on: same view, later
      else if (k < 0.3) v = sq('hprints-out', k / 0.3);
      else if (k < 0.42) { under = st('hprints-out', 'last'); v = sq('top-late', 0); o = (k - 0.3) / 0.12; }
      else v = sq('top-late', (k - 0.42) / 0.58);
    } else if (id === 'late') v = st('fall', 'first');
    else if (id === 'fall') v = k < 0.92 ? sq('fall', k / 0.92) : st('fall', 'last');
    else if (id === 'toEnd') v = sq('fallen-end', k);
    else if (id === 'end') { v = st('fallen-end', 'last'); waitlist = true; }
    else if (id === 'toChapters') v = sq(desk ? 'end-top2' : 'end-print0', k);
    else if (id === 'backTop2' || PRINT_STOPS.some((x) => x.id === id)) {
      const i = PRINT_STOPS.findIndex((x) => x.id === id);
      if (desk) { css = 'top2'; o = 0; v = st('end-top2', 'last'); }
      else v = i === 0 ? st('end-print0', 'last') : arrive(`cprint${i - 1}-${i}`, k);
    } else if (id === 'toFaq') v = sq(desk ? 'top2-faq0' : 'team-faq0', k);
    else {   // a question: q0 is where the camera came down; the others are reached by gliding from the one before
      const q = +id.slice(1);
      v = q === 0 ? st(desk ? 'top2-faq0' : 'team-faq0', 'last') : arrive(`faq${q - 1}-faq${q}`, k, 0.38);
    }
    // fetch ahead: the moves in this beat and the next two
    const segsOf = (b) => {
      const fixed = { toClose: ['wide-close'], toPlay: ['close-play'], toTable: [desk ? 'play-top' : 'play-print0'], toLate: desk ? ['top-late'] : ['hprints-out', 'top-late'],
        fall: ['fall'], toEnd: ['fallen-end'], toChapters: [desk ? 'end-top2' : 'end-print0'], toFaq: [desk ? 'top2-faq0' : 'team-faq0'] }[b];
      if (fixed) return fixed;
      const n = /^([pq])(\d+)$/.exec(b); const ci = PRINT_STOPS.findIndex((x) => x.id === b);
      if (n && n[1] === 'q' && +n[2] > 0) return [`faq${n[2] - 1}-faq${n[2]}`];
      if (!desk && n && n[1] === 'p' && +n[2] > 0) return [`hprint${n[2] - 1}-${n[2]}`];
      if (!desk && ci > 0) return [`cprint${ci - 1}-${ci}`];
      return [];
    };
    const next = BEAT_IDS.slice(bi, bi + 3).flatMap(segsOf);
    return { v, css, o, under, waitlist, next };
  })();

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
  // hand: the film's handoffs (desktop) { inRect, outRect, outBeat, frame }: the rendered camera arrives at, and leaves
  // from, exactly these parts of the overhead still (pixels), so the cut between film and pan can't be seen
  const tablePan = (m, quads, ids, inId, outId, hand) => {
    const cover = Math.max(vp.w / m.width, vp.h / m.height);
    const free = portrait ? Math.max(vp.h * 0.3, vp.h - TOP_BAR - (vp.card || vp.h * 0.25) - 34) : vp.h;
    const wideCard = (i) => !portrait && ids[i] === 'team';   // the team's card is wide: the print moves over for it
    const pair = (i) => !portrait && PAIRED.has(ids[i]);   // two prints: more of the window for them
    const fitQ = (q, i) => Math.max(1, Math.min((portrait ? free * 0.86 : vp.h * (wideCard(i) ? 0.4 : pair(i) ? 0.66 : 0.46)) / dist(q[0], q[3]),
      (vp.w * (portrait ? 0.74 : wideCard(i) ? 0.32 : pair(i) ? 0.54 : 0.42)) / dist(q[0], q[1])) / cover);
    const offFor = (i) => (portrait ? [0, vp.h / 2 - (TOP_BAR + 8 + free / 2)] : [vp.w * (wideCard(i) ? 0.26 : 0.14), 0]);   // + moves the subject left / up
    // the camera turns so what it looks at reads (nearly) level: blocks almost all the way, prints a little
    const turn = (i) => { const q = quads[i]; const a = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]) * 180 / Math.PI;
      return reduce ? 0 : -a * (ids[i].startsWith('q') ? 0.88 : 0.6); };
    const rot = (v, deg) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]; };
    const at = (i, z, r) => { const c = mid(quads[i]), o = rot(offFor(i), -r); return [c[0] + o[0] / (cover * z), c[1] + o[1] / (cover * z)]; };
    // on the FAQ blocks the overhead table only needs to get near: the close-up render dissolves in for the reading
    const fitI = (i) => fitQ(quads[i], i) * (ids[i].startsWith('q') ? 0.6 : 1);
    let cur = -1;
    ids.forEach((id, i) => { if (t >= START[id][0]) cur = i; });
    let c, z, r;
    // the camera on a rectangle of the still: the frame's width across it, no turn
    const rectCam = (rc) => { const sf = Math.max(vp.w / hand.frame[0], vp.h / hand.frame[1]);
      return { c: [(rc[0] + rc[2]) / 2, (rc[1] + rc[3]) / 2], z: (sf * hand.frame[0] / (rc[2] - rc[0])) / cover, r: 0 }; };
    const stopCam = (i) => { const zi = fitI(i), ri = turn(i); return { c: at(i, zi, ri), z: zi, r: ri }; };
    const blend = (A, B, k) => ({ c: [lerp(A.c[0], B.c[0], k), lerp(A.c[1], B.c[1], k)], z: lerp(A.z, B.z, k), r: lerp(A.r, B.r, k) });
    let rectness = 0;
    if (hand && cur <= 0) {   // coming down from the film onto the first stop
      const k = cur < 0 ? 0 : ease(clamp(p(ids[0]) / 0.32)); ({ c, z, r } = blend(rectCam(hand.inRect), stopCam(0), k)); rectness = 1 - k;
    } else if (cur < 0) { const z0 = fitI(0); r = turn(0); c = at(0, z0, r); z = mv(z0 * 1.25, z0, ease(p(inId))); }
    else {
      const k = ease(clamp(p(ids[cur]) / 0.32)), a = Math.max(0, cur - 1), za = fitI(a), zb = fitI(cur);
      r = lerp(turn(a), turn(cur), k);
      const from = at(a, za, r), to = at(cur, zb, r);
      c = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
      z = lerp(za, zb, k) * (quads[a] !== quads[cur] && !reduce ? 1 - 0.1 * Math.sin(Math.PI * k) : 1);   // lift a little while moving
    }
    if (hand && t >= START[hand.outBeat][0]) {   // back up to where the film takes over
      const k = ease(p(hand.outBeat)); ({ c, z, r } = blend({ c, z, r }, rectCam(hand.outRect), k)); rectness = k;
    } else if (outId && !hand && t >= START[outId][0]) z = mv(z, z * 1.12, ease(p(outId)));
    const arrived = cur >= 0 && (!inBeat(ids[cur]) || p(ids[cur]) > 0.32);
    // depth of field: sharp over whatever the camera is on (it reads level now, so its own width and height), soft beyond
    const q = quads[Math.max(0, cur)], sz = cover * z;
    const roomy = ids[Math.max(0, cur)].startsWith('q') ? 1.9 : 1.15;
    const half = [dist(q[0], q[1]) * sz / 2 * roomy, dist(q[0], q[3]) * sz / 2 * roomy];
    const off = offFor(Math.max(0, cur));
    const dof = { x: ((vp.w / 2 - off[0]) / vp.w) * 100, y: ((vp.h / 2 - off[1]) / vp.h) * 100,
      rx: lerp((half[0] / 0.62 * 1.1 / vp.w) * 100, 400, rectness), ry: lerp((half[1] / 0.62 * 1.15 / vp.h) * 100, 400, rectness) };   // the film's view is sharp all over
    return { c, z, r, o: Math.min(ease(p(inId)), outId ? 1 - ease(p(outId)) : 1), cur, arrived, dof };
  };
  const handOf = (into, outOf, outBeat) => { const a = segInfo('desk', into), b = segInfo('desk', outOf);
    return a && b && a.handoffOut && b.handoffIn ? { inRect: a.handoffOut.rect, outRect: b.handoffIn.rect, outBeat, frame: [a.width, a.height] } : null; };
  if (meta.top) cams.top = tablePan(meta.top, HOW.map((g) => around(g.map((i) => meta.top.polaroids[i].card))), HOW.map((_, j) => `p${j}`), 'toTable', 'toLate',
    DESK_FILM ? handOf('play-top', 'top-late', 'backTop') : null);
  if (meta.top2 && (meta.top2.faqBlocks || meta.top2.faq)) {
    const m = meta.top2, fq = faqQuads(m);
    const stops = DESK_FILM ? PRINT_STOPS : STOPS;   // the film flies to the questions itself
    cams.top2 = tablePan(m, stops.map((st) => (st.faq !== undefined ? (fq[st.faq] || m.faq) : st.prints.length > 1 ? around(st.prints.map((i) => m.polaroids[i].card)) : m.polaroids[st.prints[0]].card)), stops.map((st) => st.id), 'toChapters', null,
      DESK_FILM ? handOf('end-top2', 'top2-faq0', 'backTop2') : null);
  }
  if (film) {   // the film decides when the overhead stills are on
    if (cams.top) cams.top.o = film.css === 'top' ? 1 : 0;
    if (cams.top2) cams.top2.o = film.css === 'top2' ? 1 : 0;
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
  FAQ_SHOTS.forEach((shot, k) => {
    const m = meta[shot]; if (!m || !m.subject) return;
    const id = `q${k}`, next = STOPS[FIRST_FAQ + k + 1];
    if (t < START[id][0]) { cams[shot] = { c: [m.width / 2, m.height / 2], z: 1, o: 0 }; return; }
    const cover = Math.max(vp.w / m.width, vp.h / m.height), sc = mid(m.subject);
    const free = portrait ? Math.max(vp.h * 0.3, vp.h - TOP_BAR - (vp.card || vp.h * 0.25) - 34) : vp.h;
    const off = portrait ? [0, vp.h / 2 - (TOP_BAR + 8 + free / 2)] : [vp.w * 0.14, 0];
    const kin = ease(clamp((p(id) - 0.16) / 0.24)), kout = next ? ease(clamp(p(next.id) / 0.16)) : 0;
    const z = mv(1.06, 1, kin) * mv(1, 1.03, p(id)) * (kout > 0 ? mv(1, 1.06, kout) : 1);   // settles in, drifts, leans on as it goes
    cams[shot] = { c: [sc[0] + off[0] / (cover * z), sc[1] + off[1] / (cover * z)], z, o: Math.min(kin, 1 - kout) };
  });
  const onShot = (shot) => cams[shot] && cams[shot].o > 0.6;
  const cur = cams.top ? cams.top.cur : -1, cur2 = cams.top2 ? cams.top2.cur : -1;
  const reached2 = cur2 < 0 ? -1 : STOPS[cur2].faq !== undefined ? CHAPTER_PRINTS.length : Math.max(...STOPS[cur2].prints);
  const reached = cur < 0 ? -1 : Math.max(...HOW[cur]);
  useEffect(() => { if (cams.top && cams.top.arrived && reached > written) setWritten(reached); });
  useEffect(() => { if (cams.top2 && cams.top2.arrived && reached2 > written2) setWritten2(reached2); });
  const faqK = cur2 >= FIRST_FAQ ? cur2 - FIRST_FAQ : 0;

  const place = (m, cam, under = 0) => {
    const cover = Math.max(vp.w / m.width, vp.h / m.height), s = cover * cam.z;
    let tx = vp.w / 2 - cam.c[0] * s, ty = vp.h / 2 - cam.c[1] * s;
    // never show past the picture's edges, except a strip hidden under the text card (`under` px at the bottom)
    tx = clamp(tx, vp.w - m.width * s, 0); ty = clamp(ty, vp.h - m.height * s - under, 0);
    return { tx, ty, s };
  };
  const stageStyle = (m, cam, under = 0) => {
    if (cam.r) {   // turned: rotate about the middle of the window (the table is big enough that no edge shows)
      const s = Math.max(vp.w / m.width, vp.h / m.height) * cam.z;
      return { width: m.width, height: m.height, transform: `translate3d(${vp.w / 2}px, ${vp.h / 2}px, 0) rotate(${cam.r}deg) scale(${s}) translate(${-cam.c[0]}px, ${-cam.c[1]}px)` };
    }
    const { tx, ty, s } = place(m, cam, under);
    return { width: m.width, height: m.height, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s})` };
  };
  // a point in a shot (image pixels) -> where it is in the window right now
  const project = (m, cam, x, y) => { const { tx, ty, s } = place(m, cam); return [tx + x * s, ty + y * s, s]; };
  const warp = (w, h, q) => ({ width: w, height: h, transform: quadToMatrix3d(w, h, q) });

  const screenFor = { close: SCREENS.intro, wide: SCREENS.wide, play: SCREENS.question, late: SCREENS.late };
  // the fire burns down for the end of the night and stays low for everything after it
  const fire = cams.late ? lerp(1, 0.35, Math.max(cams.late.o, cams.top2 ? cams.top2.o : 0, ...CHAPTERS.map(([sh]) => (cams[sh] ? cams[sh].o : 0)))) : 1;
  const endOn = FILM ? inBeat('end') : MOBILE ? t >= START.toEnd[0] + START.toEnd[1] * 0.6 && t < START.toChapters[0] + START.toChapters[1] * 0.3 : onShot('end');
  // the capture script (scripts/web/capture_mobile.cjs) reads where things are
  if ((CAPTURE || DEBUG) && typeof window !== 'undefined') {
    window.__tn = { START, TOTAL, keys: MOBILE_KEYS, fall: MOBILE_FALL, fallCount: fall ? fall.count : 0,
      endScreen: meta.end && cams.end && meta.end.screen.map(([x, y]) => project(meta.end, cams.end, x, y).slice(0, 2)) };
  }
  const endScreen = live ? <KickstarterScreen active={endOn} />
    : <WaitlistScreen active={endOn} onArrive={() => setTimeout(() => document.getElementById('waitlist')?.scrollIntoView(), 300)} />;
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
        {MOBILE && !FILM && <MobileStage t={t} vp={vp} keys={MOBILE_KEYS} fall={MOBILE_FALL}
          waitlist={endScreen} />}
        {(FILM ? (DESK_FILM ? ['top', 'top2'] : []) : MOBILE ? [] : SHOTS).map((s) => {
          const m = meta[s], cam = cams[s];
          if (!m || !cam || (FILM ? !filmNear(s, t) : !near(s, t))) return null;
          return (
            <div key={s} className="tn-layer" style={{ opacity: cam.o, visibility: cam.o > 0.001 ? 'visible' : 'hidden' }}>
              <div className="tn-shot" style={stageStyle(m, cam, (s === 'top' || s === 'top2') && portrait ? vp.card + 24 : 0)}>
                {(s === FIRST_SHOT || loadRest) && <Pic src={shotSrc(s)} width={m.width} height={m.height} draggable="false" decoding="async"
                  fetchPriority={s === FIRST_SHOT ? 'high' : 'low'} onLoad={s === FIRST_SHOT ? startRest : undefined} />}
                {s === 'late' && fallFrame >= 0 && (
                  <img className="tn-fallframe" decoding="sync" src={at(`fall/${String(fallFrame).padStart(2, '0')}${SMALL ? '_m' : ''}.${fall.ext}`)} alt="" draggable="false" />
                )}
                {(s === FIRST_SHOT || loadRest) && !s.startsWith('faq') && (m.firebox || m.flames) && <LiveFire shot={s} m={m} warp={warp} active={cam.o > 0.01}
                  mask={s === 'late' && fall && fallFrame > fall.count * 0.3 ? 'fallen' : undefined} />}
                {s === FIRST_SHOT && <div className={`tn-roomdark ${lit ? 'is-up' : ''}`} style={{ width: m.width, height: m.height }} aria-hidden="true" />}
                {m.screen && s === 'end' && (
                  <div className="tn-warp tn-screen is-ui" style={warp(320, 240, m.screen)}>
                    {endScreen}
                  </div>
                )}
                {m.screen && screenFor[s] && (
                  <div className="tn-warp tn-screen" style={warp(320, 240, m.screen)}><LiveScreen card={screenFor[s]} active={cam.o > 0.5} /></div>
                )}
                {/* sharp close-ups go under the prints: the photos on the prints are laid over the render */}
                {(s === 'top2' || s === 'top') && loadRest && m.insets && (DESK_FILM || (s === 'top2' && t < endOf(STOPS[FIRST_FAQ].id))) && Object.entries(m.insets).map(([n, [x0, y0, x1, y1]]) => (
                  <Pic key={n} src={at(`insets/${n}${SMALL ? "_s" : ""}.jpg`)} className="tn-inset" style={{ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }} decoding="async" />
                ))}
                {loadRest && m.polaroids && !m.baked && !s.startsWith('faq') && (
                  <PrintOverlays m={m} items={s === 'top2' ? CHAPTER_PRINTS : HOW_PRINTS} warp={warp}
                    written={s === 'top' ? written : s === 'top2' ? written2 : Infinity} />
                )}
                {s === 'top2' && m.faqBlocks && !m.burnt && faqQuads(m).slice(0, FAQS.length).map((q, k) => <EtchedBlock key={k} q={q} warp={warp} text={FAQS[k].q} />)}
                {DESK_FILM && m.screen && (s === 'top' || s === 'top2') && (   // Jeemu's screen, as the film shows it either side of this still
                  <img className="tn-warp tn-stillscreen" src={at(`screens/${s === 'top' ? 'question' : 'waitlist'}.jpg`)} alt="" draggable="false" style={warp(320, 240, m.screen)} />
                )}
                {s === 'top2' && !m.faqBlocks && m.faq && <FaqCard q={m.faq} warp={warp} k={faqK} />}
              </div>
              {(s === 'top' || s === 'top2') && (
                // depth of field: a softened copy of the table on top, with a clear hole where the camera is focused
                <div className="tn-dof" style={{ '--dof-x': `${cam.dof.x}%`, '--dof-y': `${cam.dof.y}%`, '--dof-rx': `${cam.dof.rx}%`, '--dof-ry': `${cam.dof.ry}%` }} aria-hidden="true">
                  <div className="tn-shot" style={stageStyle(m, cam, portrait ? vp.card + 24 : 0)}>
                    {loadRest && <Pic src={at(`${s}_blur.jpg`)} width={m.width} height={m.height} draggable="false" decoding="async" />}
                    {loadRest && !m.baked && <PrintOverlays m={m} items={s === 'top2' ? CHAPTER_PRINTS : HOW_PRINTS} warp={warp} written={s === 'top' ? written : written2} soft />}
                    {DESK_FILM && m.screen && (   // the screen in the softened copy too, or the blur would cover it with a black one
                      <img className="tn-warp tn-stillscreen is-soft" src={at(`screens/${s === 'top' ? 'question' : 'waitlist'}.jpg`)} alt="" draggable="false" style={warp(320, 240, m.screen)} />
                    )}
                    {loadRest && s === 'top2' && m.faqBlocks && !m.burnt && faqQuads(m).slice(0, FAQS.length).map((q, k) => <EtchedBlock key={k} q={q} warp={warp} text={FAQS[k].q} soft />)}
                    {loadRest && s === 'top2' && !m.faqBlocks && m.faq && <FaqCard q={m.faq} warp={warp} k={faqK} soft />}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {FILM && film && (<>
          {film.under && <SeqPlayer dev={FILM_DEV} vp={vp} view={film.under} />}
          <SeqPlayer dev={FILM_DEV} vp={vp} view={film.v} o={film.o} next={film.next} waitlist={film.waitlist ? endScreen : null} />
        </>)}
        {!MOBILE && <div className="tn-fire" style={{ opacity: FILM ? (t >= START.toLate[0] ? 0.35 : 1) : fire }} aria-hidden="true" />}
        {/* walking in: dark, the fire catches, then the firelight comes up across the room (once, on load) */}
        <div className={`tn-lights ${lit ? 'is-up' : ''}`} aria-hidden="true" />
        {!MOBILE && <div className="tn-grain" aria-hidden="true" />}
        {!MOBILE && <div className="tn-vignette" aria-hidden="true" />}

        {/* words */}
        <div className="tn-hint" style={{ opacity: t < 30 ? 1 - t / 30 : 0 }} aria-hidden="true">Scroll</div>
        {DESK_FILM && (() => {   // over the stone chimney breast in the landing frame (same camera as the old still)
          const f = frameFit(segInfo('desk', 'wide-close'), vp);
          const x = f.tx + WALL.x * f.s, y = Math.max(f.ty + WALL.y * f.s, TOP_BAR + 80), cw = Math.min(vp.w - 32, WALL.w * f.s);
          return (
            <div className="tn-caption tn-on-wall" style={{ opacity: t < START.toClose[0] ? 1 : clamp(1 - p('toClose') / 0.3), left: clamp(x, cw / 2 + 16, vp.w - cw / 2 - 16), top: y, width: cw }}>
              <h2>{CAPTIONS.wide.title} {CAPTIONS.wide.sub}</h2>
            </div>
          );
        })()}
        {!FILM && meta.wide && cams.wide && (() => {
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
        {MOBILE && (   // on a phone the line sits high on the wall, as the full version puts it
          <div className="tn-caption tn-on-wall mb-wall" style={{ opacity: t < START.toClose[0] ? 1 : clamp(1 - p('toClose') / 0.3) }}>
            <h2>{CAPTIONS.wide.title} {CAPTIONS.wide.sub}</h2>
          </div>
        )}
        <div className="tn-caption" style={{ opacity: show('play') }}>
          <h2>{CAPTIONS.play.title}</h2>
        </div>
        {HOW.map((g, j) => (
          <div key={j} className={`tn-card ${g.length > 1 ? 'is-pair' : ''}`} style={{ opacity: show(`p${j}`, FILM && !DESK_FILM ? 0.4 : 0.3, 0.94) }}>
            {g.map((i) => <section key={i}><h3>{POLAROIDS[i].title}</h3><p>{POLAROIDS[i].body}</p></section>)}
          </div>
        ))}
 {STOPS.map((st) => (
          <div key={st.id} className={`tn-card ${st.faq !== undefined ? 'is-answer' : ''} ${st.team && !portrait ? 'is-team' : ''}`} style={{ opacity: show(st.id, FILM && (!DESK_FILM || st.faq !== undefined) ? 0.42 : 0.3, 0.94) }}>
            {/* FAQ: the question is already burnt into the block on screen; it stays here for screen readers */}
            {st.items ? st.items.map((it) => <section key={it.title}><h3>{it.title}</h3><p>{it.body}</p></section>) : (
              <h3 className={st.faq !== undefined ? 'ws-sr' : undefined}>{st.title}</h3>)}
            {st.sub && <p className="tn-sub">{st.sub}</p>}
            {st.items ? null : st.team ? (
              // a wide window has room for everyone's whole story at once; a phone gets names and roles
              <ul className="tn-team">{st.team.map((m) => <li key={m.name}><b>{m.name}</b><span>{m.role}</span>{!portrait && <p>{m.bio}</p>}</li>)}</ul>
            ) : <p>{st.body}</p>}
          </div>
        ))}
        <div className="tn-finale" style={{ opacity: inBeat('late') ? clamp(Math.min(p('late') / 0.15, (1 - p('late')) / 0.2)) : 0 }}>
          <h2>{FINALE.title}</h2>
          <p>{live ? FINALE.subLive : FINALE.sub}</p>
        </div>
        <p className="tn-fine" style={{ opacity: endOn && !live ? 1 : 0 }}>Joining is free. We only use your email to tell you about the launch.</p>
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
