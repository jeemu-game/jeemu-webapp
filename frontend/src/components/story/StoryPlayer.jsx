import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameScreen from './GameScreen';
import { quadToMatrix3d } from './quad';
import { STAGES, STOPS, SCREEN_CARDS, INTRO_CARD, INTRO_UNTIL, TOWER_CAPTION } from './stages';
import { track } from '../../analytics';

const BASE = import.meta.env.BASE_URL;
// /story/* is cached for a year (immutable). Bump this and rename the video files whenever they are re-encoded.
const V = '-v2';
const PREVIEW = import.meta.env.VITE_PREVIEW === 'true';
const SCREEN_W = 320, SCREEN_H = 240;
const CARD_MS = 3600;   // the question is up for about as long as the zoom-in takes, then the waitlist card
const mq = (q) => typeof matchMedia !== 'undefined' && matchMedia(q).matches;
const GIVE_UP_MS = 8000;   // no usable video after this long: show the plain page instead of an endless LOADING screen
const SYNC_TIMEOUT_MS = 8000;   // never keep the pixel screen hidden longer than this while the video catches up
// Calls cb once the picture on screen really is the frame at time t. "Seeking finished" is not enough: iOS in Low Power Mode, slow networks and
// Data Saver can report a finished seek while still showing another frame, which put the pixel screen on top of the wrong picture.
// requestVideoFrameCallback reports the media time of the frame actually presented; without it we wait for a real `seeked` event.
// After ms the callback fires anyway so the pixel screen is never hidden for good (the picture itself is always visible).
const whenPictureIs = (v, t, fps, cb, ms) => {
  let done = false, raf = 0;
  const t0 = performance.now(), tol = 1.6 / fps, rvfc = typeof v.requestVideoFrameCallback === 'function';
  const finish = () => { if (done) return; done = true; clearTimeout(timer); clearInterval(poll); cancelAnimationFrame(raf); v.removeEventListener('seeked', onSeeked); cb(); };
  // a picture that is already on the stop presents no new frame, so no callback would ever come: after 1.5 s of a settled, matching video, accept it
  const poll = setInterval(() => { if (!done && !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - t) <= tol && performance.now() - t0 > 1500) finish(); }, 300);
  const timer = setTimeout(finish, ms);
  const onFrame = (_, meta) => { if (done) return; if (Math.abs(meta.mediaTime - t) <= tol) finish(); else v.requestVideoFrameCallback(onFrame); };
  const onSeeked = () => {
    if (done || rvfc) return;
    raf = requestAnimationFrame(() => requestAnimationFrame(() => { if (!done && !v.seeking && Math.abs(v.currentTime - t) <= tol) finish(); }));
  };
  v.addEventListener('seeked', onSeeked);
  if (rvfc) v.requestVideoFrameCallback(onFrame);
};
// A 1.5 KB silent video, played once to learn whether this browser lets the page play video at all (Low Power Mode, Data Saver and some
// in-app browsers do not). It never touches the real videos, so nothing flickers.
const TINY_MP4 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMYbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAkJ0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAG6bWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAQABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABZW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAASVzdGJsAAAAwXN0c2QAAAAAAAAAAQAAALFhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAN2F2Y0MBZAAK/+EAGWdkAAqscgRewEQAAAMABAAAAwAIPEiWEYABAAdo6EODksiw/fj4AAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABYoAAAWKAAAABhzdHRzAAAAAAAAAAEAAAABAABAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAALFAAAAAQAAABRzdGNvAAAAAAAAAAEAAANIAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDAAAAAIZnJlZQAAAs1tZGF0AAACrwYF//+r3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTE2IGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMzMgbWU9dW1oIHN1Ym1lPTEwIHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTEgbWVfcmFuZ2U9MjQgY2hyb21hX21lPTEgdHJlbGxpcz0yIDh4OGRjdD0xIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTggYl9weXJhbWlkPTIgYl9hZGFwdD0yIGJfYmlhcz0wIGRpcmVjdD0zIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MiBrZXlpbnQ9MjUwIGtleWludF9taW49MSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTYwIHJjPWNyZiBtYnRyZWU9MSBjcmY9NDAuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAA5liIEAAr/+8dzwKZrl2Q==';
const probePlayback = () => new Promise((resolve) => {
  try {
    const t = document.createElement('video'); t.muted = true; t.playsInline = true; t.setAttribute('playsinline', ''); t.src = TINY_MP4;
    const p = t.play();
    if (p && p.then) p.then(() => { try { t.pause(); } catch (_) { /* ignore */ } resolve(true); }).catch((e) => resolve(!(e && e.name === 'NotAllowedError')));
    else resolve(true);
    setTimeout(() => resolve(true), 1500);   // no answer: assume it works, the real attempt will tell
  } catch (_) { resolve(true); }
});
// true when the video already holds every second from a to b, so playing that span cannot freeze or flash empty
const hasBuffered = (v, a, b) => { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= a + 0.05 && v.buffered.end(i) >= b - 0.05) return true; return false; };

// One video, four stops. Scroll / swipe / key at a stop plays the next piece at normal speed and lands
// on the next stop. It never sits half way. Going back is a straight cut to the previous stop.
export default function StoryPlayer({ onCta }) {
  // windows that are taller than they are wide (phones, narrow panes) get the portrait render
  const dir = useRef(window.innerWidth / window.innerHeight < 0.75 ? `${BASE}story/mobile/` : `${BASE}story/`).current;
  const [narrow, setNarrow] = useState(() => window.innerWidth / window.innerHeight < 1.1 || window.innerWidth < 760);
  const [feather, setFeather] = useState(false);   // the video does not fill the window, so its edges fade into the page backdrop
  const root = useRef(null), view = useRef(null), video = useRef(null), vrev = useRef(null), screenEl = useRef(null);
  const s = useRef({ tl: null, stage: -1, playing: false, queued: false, cooldown: 0, awayAt: 0, mode: 'intro', raf: 0, toCta: false, picT: 0, soft: false, deck: null });   // picT: time (s) of the frame verified on screen; soft: playback is blocked
  const [tl, setTl] = useState(null);
  const [src, setSrc] = useState('');
  const [srcRev, setSrcRev] = useState('');
  const [act, setAct] = useState('f');   // what is on show: the forward video, the reversed copy ('r'), or the frame deck ('c', canvas)
  const deckEl = useRef(null);
  const [ready, setReady] = useState(false);
  const [stuck, setStuck] = useState(false);     // the video never became usable (see GIVE_UP_MS)
  const [synced, setSynced] = useState(false);   // the video is really showing the frame the pixel screen is drawn for
  const [ui, setUi] = useState({ stage: -1, playing: false });
  const [mode, setMode] = useState('intro');   // what the pixel screen shows: the tagline, nothing (the render's own logo), or the question cards
  const [cardIdx, setCardIdx] = useState(0);

  // The reversed copy is only needed when someone scrolls back up, so it stays off the network until the forward
  // video is fully downloaded (or the first scroll-up asks for it). It must never compete with the video being played.
  const startRev = useCallback(() => {
    const st = s.current;
    st.wantRev = true;
    if (st.revLoader && !st.revStarted) { st.revStarted = true; st.revLoader(); }
  }, []);

  // ---- frame deck: when the browser will not play video (Low Power Mode, Data Saver...) the story is drawn from small stills on a canvas instead.
  // Every 3rd frame, neighbours cross-faded, so it runs at the full frame rate, needs no tap, and the pixel screen is exactly on the picture.
  const deckList = useCallback(() => {
    const t = s.current.tl; if (!t) return [];
    const out = []; for (let f = 0; f < t.frames; f += 3) out.push(f);
    if (out[out.length - 1] !== t.frames - 1) out.push(t.frames - 1);
    return out;
  }, []);
  const loadDeck = useCallback(() => {
    const st = s.current;
    if (st.deck || !st.tl) return;
    const base = `${BASE}story/deck${V}/${dir.includes('mobile') ? 'm' : 'd'}/`;
    const d = st.deck = { imgs: new Map(), list: deckList() };
    d.list.forEach((f) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { d.imgs.set(f, im); if (st.soft && !st.playing && st.stage >= 0) cutRef.current(st.stage); };   // a stop's frame just arrived: swap to it
      im.src = `${base}${String(f).padStart(4, '0')}.webp`;
    });
  }, [dir, deckList]);
  const deckReady = (a, b) => {   // every stored frame covering a..b has arrived
    const d = s.current.deck; if (!d) return false;
    const lo = Math.min(a, b) - 2, hi = Math.max(a, b) + 2;
    return d.list.every((f) => f < lo || f > hi || d.imgs.has(f));
  };
  const drawDeck = (pos) => {
    const d = s.current.deck, cv = deckEl.current; if (!d || !cv) return false;
    let i = 0; while (i + 1 < d.list.length && d.list[i + 1] <= pos) i++;
    const a = d.imgs.get(d.list[i]); if (!a) return false;
    const bf = d.list[i + 1], b = bf !== undefined ? d.imgs.get(bf) : null;
    if (cv.width !== a.naturalWidth) { cv.width = a.naturalWidth; cv.height = a.naturalHeight; }
    const g = cv.getContext('2d'); g.globalAlpha = 1; g.drawImage(a, 0, 0);
    if (b) { const t = (pos - d.list[i]) / (bf - d.list[i]); if (t > 0.02) { g.globalAlpha = Math.min(1, t); g.drawImage(b, 0, 0); g.globalAlpha = 1; } }
    return true;
  };
  const markBlocked = useCallback(() => { const st = s.current; if (st.soft) return; st.soft = true; loadDeck(); }, [loadDeck]);

  // the video file this browser can decode starts downloading straight away; the timeline arrives alongside it
  useEffect(() => {
    let dead = false;
    const t = document.createElement('video');
    const ext = t.canPlayType('video/mp4; codecs="avc1.640028"') ? 'mp4' : 'webm';
    const get = (name, set) => {
      if (PREVIEW) fetch(dir + name).then((r) => r.blob()).then((b) => { if (!dead) set(URL.createObjectURL(b)); });   // the preview host can't serve byte ranges
      else set(dir + name);
    };
    get(`story${V}.${ext}`, setSrc);
    fetch(`${dir}timeline.json`).then((r) => r.json()).then((j) => {
      if (dead) return;
      j.rests = STOPS.filter((f) => f < j.frames);
      s.current.tl = j; setTl(j);
      if (j.reverse) {
        s.current.revLoader = () => get(`story-rev${V}.${ext}`, setSrcRev);
        if (s.current.wantRev) startRev();
      }
    }).catch(() => {});
    return () => { dead = true; };
  }, [dir, startRev]);

  // fit the video box to the viewport: height-fit on landscape sets, cover on portrait
  useEffect(() => {
    if (!tl) return undefined;
    const fit = () => {
      const el = root.current, v = view.current;
      if (!el || !v) return;
      const cw = el.clientWidth, ch = el.clientHeight;
      setNarrow(cw / ch < 1.1 || cw < 760);
      // Wide render: cover the window, so things enter and leave at the window's own edges. In a narrow window (half-screen
      // browser, tablet, small laptop pane) cover zooms in so far that the screen close-up is cut off at the sides, so zoom only
      // as far as keeps the whole screen visible; the dark backdrop fills any gap. Portrait (phone) render: show the whole frame
      // with a little air. (Applying the phone rule to every narrow window once shrank the wide render into a small band.)
      const cover = Math.max(cw / tl.width, ch / tl.height), contain = Math.min(cw / tl.width, ch / tl.height);
      const screenW = (tl.screen[0][1][0] - tl.screen[0][0][0]) * 1.08;   // the close-up screen's width in the render, plus a margin
      const sc = tl.height > tl.width ? contain * 0.92 : Math.max(contain, Math.min(cover, cw / screenW));
      setFeather(sc * tl.width < cw - 1 || sc * tl.height < ch - 1);
      v.style.transform = `translate(-50%, -50%) scale(${sc})`;
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('orientationchange', fit); };
  }, [tl]);

  const paint = useCallback((frame) => {
    const { tl: t } = s.current;
    if (!t || !screenEl.current) return;
    const f = Math.max(0, Math.min(t.frames - 1, Math.round(frame)));
    screenEl.current.style.transform = quadToMatrix3d(SCREEN_W, SCREEN_H, t.screen[f]);
    const m = f >= t.tapFrame ? 'qa' : f <= INTRO_UNTIL ? 'intro' : 'off';
    if (m !== s.current.mode) { s.current.mode = m; setMode(m); }
  }, []);

  const arrive = useCallback((k) => {
    const st = s.current;
    st.playing = false; st.stage = k; st.cooldown = performance.now() + 900;
    setUi({ stage: k, playing: false });
    track('story_stage', { stage: STAGES[k].id }, { once: true });
    if (st.queued && k < st.tl.rests.length - 1) { st.queued = false; setTimeout(() => play(k + 1), 250); }
    st.queued = false;
  }, []); // eslint-disable-line

  const playRef = useRef(() => {});
  const play = useCallback((k, d = 1) => {
    const st = s.current, vf = video.current, vr = vrev.current;
    if (!vf || !st.tl || st.playing) return;
    const { fps, rests, frames: N } = st.tl;
    if (mq('(prefers-reduced-motion: reduce)')) { cutRef.current(k); return; }   // no animated playback for people who asked for less motion
    const dFrom = d > 0 ? rests[k - 1] : rests[k + 1], dTo = rests[k];
    if (st.soft) {
      // playback is blocked: animate from the frame deck if it has arrived, otherwise land on the stop and keep loading it
      if (deckReady(dFrom, dTo)) {
        const t0 = performance.now(); st.playing = true; st.target = k; setUi({ stage: st.stage, playing: true }); setAct('c');
        const stepDeck = () => {
          if (!st.playing || st.target !== k) return;
          const pos = dFrom + d * ((performance.now() - t0) / 1000) * fps, end = d > 0 ? pos >= dTo : pos <= dTo, f = end ? dTo : pos;
          drawDeck(f); paint(f);
          if (end) { arrive(k); return; }
          st.raf = requestAnimationFrame(stepDeck);
        };
        stepDeck(); return;
      }
      loadDeck(); if (d < 0) startRev(); cutRef.current(k); return;
    }
    // the reversed copy is fetched lazily: only play it once the part this step needs has arrived, otherwise cut straight there
    const rev = d < 0 && st.tl.reverse && vr && hasBuffered(vr, (N - 1 - rests[k + 1]) / fps, (N - 1 - rests[k]) / fps);
    if (d < 0 && !rev) { startRev(); cutRef.current(k); return; }
    const v = rev ? vr : vf, other = rev ? vf : vr;
    const from = d > 0 ? rests[k - 1] : rests[k + 1], to = rests[k];
    const tOf = (f) => (rev ? N - 1 - f : f) / fps;           // logical frame -> time in whichever video plays
    const logical = (t) => (rev ? N - 1 - t * fps : t * fps);
    st.playing = true; st.target = k;
    setUi({ stage: st.stage, playing: true });
    if (Math.abs(v.currentTime - tOf(from)) * fps > 0.5) v.currentTime = tOf(from);
    st.cur = v;
    // If the browser refuses to play (autoplay blocked, Low Power Mode, data saver): remember it, and do this step again from the frame deck
    // (or as a plain cut to the stop while the deck is still arriving). No button, no tap.
    const goBlocked = () => {
      if (!st.playing || st.target !== k) return;
      if (st.primed) st.noPrime = true;      // real playback worked after a tap, then was refused again: stop asking, the deck is the answer
      markBlocked(); v.pause(); st.playing = false; st.target = -1; setUi({ stage: st.stage, playing: false });
      playRef.current(k, d);
    };
    const p = v.play();
    if (p && p.catch) p.catch((err) => { if (err && err.name !== 'AbortError') goBlocked(); });
    setTimeout(() => { if (v.paused) goBlocked(); }, 500);   // play() resolved but something paused the video again
    setAct(rev ? 'r' : 'f');
    const done = () => {
      v.pause(); v.currentTime = tOf(to); paint(to); st.picT = to / fps;
      if (other && st.tl.reverse) other.currentTime = (rev ? to : N - 1 - to) / fps;   // keep the other copy parked on the same frame
      arrive(k);
    };
    const step = (_, meta) => {
      if (!st.playing || st.target !== k) return;
      const frame = logical(v.currentTime);
      paint(frame);
      if ((d > 0 ? frame >= to - 0.5 : frame <= to + 0.5) || v.ended) { done(); return; }
      queue();
    };
    const queue = () => { st.raf = requestAnimationFrame(() => step()); };   // polled every display frame; frame callbacks don't fire for a video that is not showing
    queue();
  }, [arrive, paint, startRev, loadDeck, markBlocked]);
  playRef.current = play;

  const cutRef = useRef(() => {});
  const cut = useCallback((k) => {
    const st = s.current, v = video.current, vr = vrev.current;
    if (!v || !st.tl) return;
    const { fps, rests, frames: N } = st.tl, tgt = rests[k] / fps;
    st.playing = false; st.target = -1; v.pause(); if (vr) vr.pause();
    st.toCta = k === rests.length - 1;
    st.stage = k; st.cooldown = performance.now() + 500;
    setUi({ stage: k, playing: false });
    const id = (st.cutId = (st.cutId || 0) + 1);
    // blocked playback and the stop's still has arrived: show the still, exactly in step with the pixel screen
    if (st.soft && deckReady(rests[k], rests[k]) && drawDeck(rests[k])) { setAct('c'); paint(rests[k]); setSynced(true); return; }
    if (vr && st.tl.reverse) vr.currentTime = (N - 1 - rests[k]) / fps;
    // Already showing this stop (verified): nothing to wait for. Otherwise seek, and keep the pixel screen hidden until the picture really is this
    // frame, or its text would sit on top of the wrong picture.
    const same = Math.abs(st.picT - tgt) < 0.5 / fps;
    if (!same) { v.currentTime = tgt; setAct('f'); }
    paint(rests[k]);
    if (same) { setSynced(true); return; }
    setSynced(false);
    whenPictureIs(v, tgt, fps, () => { if (st.cutId === id) { st.picT = tgt; paint(rests[k]); setSynced(true); } }, SYNC_TIMEOUT_MS);
  }, [paint]);
  cutRef.current = cut;

  // first load: rest on the opening stop (or the last one if the page was restored part way down)
  const booted = ready && !!tl;
  const staticMode = stuck && !booted;   // no working video: poster + tagline + button, and the page scrolls normally
  useEffect(() => { s.current.static = staticMode; }, [staticMode]);
  useEffect(() => {
    const id = setTimeout(() => setStuck(true), GIVE_UP_MS);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!booted || s.current.stage !== -1) return;
    cut(window.scrollY > 80 ? s.current.tl.rests.length - 1 : 0);
  }, [booted, cut]);

  // learn at once (not on the first swipe) whether this browser blocks video, so the frame deck is already arriving by then
  useEffect(() => {
    let dead = false;
    probePlayback().then((ok) => { if (!dead && !ok) { if (s.current.tl) markBlocked(); else s.current.wantDeck = true; } });
    return () => { dead = true; };
  }, [markBlocked]);
  useEffect(() => { if (tl && s.current.wantDeck) { s.current.wantDeck = false; markBlocked(); } }, [tl, markBlocked]);

  // watchdog: at rest, the picture must stay on the stop. If something moved it (the browser resumed playback, a seek landed late), hide the pixel
  // screen and put the picture back, rather than leave text over the wrong frame.
  useEffect(() => {
    const id = setInterval(() => {
      const st = s.current, vf = video.current, vr = vrev.current;
      if (!st.tl || st.playing || st.stage < 0 || act === 'c') return;
      const v = act === 'r' ? vr : vf; if (!v || v.seeking) return;
      const { fps, frames: N } = st.tl, want = st.tl.rests[st.stage] / fps;
      const at = act === 'r' ? (N - 1) / fps - v.currentTime : v.currentTime;
      if (!v.paused) v.pause();
      if (Math.abs(at - want) > 2 / fps) { st.picT = -1; cutRef.current(st.stage); }
    }, 700);
    return () => clearInterval(id);
  }, [act]);

  // once the forward video is fully buffered, fetch the reverse copy in the background
  const onForwardProgress = (e) => {
    const v = e.currentTarget, b = v.buffered;
    if (v.duration && b.length && b.end(b.length - 1) >= v.duration - 0.3) startRev();
  };

  // input: wheel, touch and keys drive the story while the page is at the top
  useEffect(() => {
    const st = s.current;
    const act = (d, e) => {
      if (document.documentElement.classList.contains('menu-open')) return true;   // the mobile menu is open: it owns the screen
      if (st.static) return false;   // no video: leave scrolling to the page
      if (st.stage < 0) { e && e.cancelable && e.preventDefault(); return true; }   // still loading: input does nothing
      if (!st.tl || window.scrollY > 2) return false;
      if (performance.now() - st.awayAt < 600) { e && e.cancelable && e.preventDefault(); return true; }
      const last = st.tl.rests.length - 1;
      const atEnd = st.stage === last && !st.playing;
      if (d > 0 && atEnd && performance.now() >= st.cooldown) return false;   // hand over to normal page scroll
      if (e && e.cancelable) e.preventDefault();
      if (performance.now() < st.cooldown) return true;
      if (st.playing) { if (d > 0 && st.stage === -1) st.queued = true; return true; }
      if (d > 0 && st.stage < last) play(st.stage + 1);
      else if (d < 0 && st.stage > 0) play(st.stage - 1, -1);
      return true;
    };
    const onScroll = () => { if (window.scrollY > 2) st.awayAt = performance.now(); };
    const onWheel = (e) => { if (Math.abs(e.deltaY) > 3) act(Math.sign(e.deltaY), e); };
    let y0 = 0, fired = false, unlocked = false, pending = 0;
    const onTs = (e) => { y0 = e.touches[0].clientY; fired = false; };
    const onTm = (e) => {
      if (st.static) return;
      if (st.stage < 0) { if (e.cancelable) e.preventDefault(); return; }
      const dy = y0 - e.touches[0].clientY;
      if (!st.tl || window.scrollY > 2 || Math.abs(dy) < 4) return;
      const d = Math.sign(dy);
      if (fired) { if (e.cancelable && !(d > 0 && st.stage === st.tl.rests.length - 1 && !st.playing)) e.preventDefault(); return; }
      if (Math.abs(dy) > 28) {
        // before the first real tap the browser may refuse play(): hold the first swipe until the finger lifts, which counts as a gesture
        if (!unlocked && !(d > 0 && st.stage === st.tl.rests.length - 1 && !st.playing)) { pending = d; fired = true; if (e.cancelable) e.preventDefault(); }
        else if (act(d, e)) fired = true;
      }
      else if (e.cancelable && !(d > 0 && st.stage === st.tl.rests.length - 1 && !st.playing)) e.preventDefault();
    };
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) act(1, e);
      else if (['ArrowUp', 'PageUp'].includes(e.key)) act(-1, e);
    };
    // iOS / low-power mode only allow play() after a real gesture, and a touchmove isn't one: prime both videos on the first tap
    const unlock = () => {
      unlocked = true;
      if (pending) { const d = pending; pending = 0; act(d); }
      [video.current, vrev.current].forEach((v) => { if (v && v.paused) { const p = v.play(); if (p && p.then) p.then(() => { if (!st.playing || v !== st.cur) v.pause(); }).catch(() => {}); } });   // never leave the hidden copy playing
      window.removeEventListener('touchend', unlock);
    };
    window.addEventListener('touchend', unlock, { passive: true });
    // after playback was refused, a real tap or key press asks again: if the browser accepts, switch from the frame deck back to smooth video
    const prime = () => {
      if (!st.soft || st.playing || st.noPrime) return;
      const v = video.current; if (!v) return;
      const p = v.play();
      if (p && p.then) p.then(() => { st.soft = false; st.primed = true; v.pause(); st.picT = -1; if (!st.playing) cutRef.current(st.stage); }).catch(() => {});
    };
    window.addEventListener('touchend', prime, { passive: true });
    window.addEventListener('click', prime);
    window.addEventListener('keydown', prime);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTs, { passive: true });
    window.addEventListener('touchmove', onTm, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTs);
      window.removeEventListener('touchmove', onTm); window.removeEventListener('touchend', unlock); window.removeEventListener('touchend', prime); window.removeEventListener('click', prime); window.removeEventListener('keydown', prime); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll);
    };
  }, [play, cut]);

  // question cards: one after another from the tap, then the call to action stays
  useEffect(() => {
    if (mode !== 'qa') return undefined;
    setCardIdx(s.current.toCta ? SCREEN_CARDS.length - 1 : 0);
    const id = setInterval(() => setCardIdx((i) => Math.min(i + 1, SCREEN_CARDS.length - 1)), CARD_MS);
    return () => clearInterval(id);
  }, [mode]);

  const last = tl ? tl.rests.length - 1 : 3;
  const shown = ui.playing ? -2 : ui.stage;

  return (
    <section className={`story ${narrow ? 'is-narrow' : ''} ${ui.stage >= last && !ui.playing ? 'is-done' : ''} ${staticMode ? 'is-static' : ''} ${feather ? 'is-feather' : ''}`} id="story" ref={root} aria-label="How Jeemu plays">
      {/* everything the pixel screen says is drawn, so say it in text too */}
      <h1 className="sr-only">Jeemu, a tower game that starts the conversation</h1>
      <p className="sr-only">{INTRO_CARD.text} {TOWER_CAPTION} {SCREEN_CARDS.map((c) => c.text).join(' ')}</p>
      <div className="story-view" ref={view} style={tl ? { width: tl.width, height: tl.height } : undefined}>
        <div className="story-videos">
        {/* the first frame is on screen as soon as the page is, while the video downloads behind it */}
        {tl && <img className="story-poster" src={`${dir}poster.jpg`} alt="" aria-hidden="true" />}
        <canvas ref={deckEl} className={`story-deck ${act === 'c' ? '' : 'hide'}`} aria-hidden="true" />
        {src && (
          <video
            ref={video} className={`story-video ${act === 'f' ? '' : 'hide'}`} src={src} poster={`${dir}poster.jpg`} muted playsInline preload="auto" aria-hidden="true" disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback" x-webkit-airplay="deny" tabIndex={-1}
            onLoadedMetadata={() => setReady(true)} onLoadedData={() => setReady(true)} onCanPlay={() => setReady(true)} onError={() => setStuck(true)} onProgress={onForwardProgress} onSeeked={(e) => paint(e.currentTarget.currentTime * (s.current.tl?.fps || 30))}
          />
        )}
        {srcRev && <video ref={vrev} className={`story-video ${act === 'r' ? '' : 'hide'}`} src={srcRev} muted playsInline preload="auto" aria-hidden="true" disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback" x-webkit-airplay="deny" tabIndex={-1} />}
        </div>
        <div className={`story-screen ${mode !== 'off' && booted && synced ? 'on' : ''}`} ref={screenEl} aria-hidden="true">
          <GameScreen card={mode === 'intro' ? INTRO_CARD : SCREEN_CARDS[cardIdx]} onCta={onCta} />
        </div>
      </div>
      <div className="story-fx" aria-hidden="true" />

      {!booted && !staticMode && (
        <div className="story-loading" role="status">
          <img src={`${BASE}story/frog-pixel.png`} alt="" className="px-frog" />
          <div className="px-label">LOADING</div>
          <div className="px-bar"><span /></div>
        </div>
      )}

      {ui.stage === 1 && !ui.playing && booted && !staticMode && <p className="story-cap" aria-hidden="true">{TOWER_CAPTION}</p>}

      {staticMode && (
        <div className="story-static">
          <p>{INTRO_CARD.text}</p>
          <button type="button" className="btn-pixel" onClick={onCta}>JOIN THE WAITLIST</button>
        </div>
      )}

      {ui.stage >= last && !ui.playing && <button className="sr-only" onClick={onCta}>Join the waitlist</button>}

      <nav className="story-rail" aria-label="Story steps">
        {STAGES.map((b, i) => (b.rail ? (
          <button key={b.id} className={shown === i ? 'on' : ''} onClick={() => !s.current.playing && cut(i)} aria-label={`Go to step ${b.rail}`}><span>{b.rail}</span></button>
        ) : null))}
      </nav>

      <div className={`story-hint ${(!ui.playing && booted) || staticMode ? 'show' : ''}`} aria-hidden="true">
        <span>{staticMode || ui.stage >= last ? 'MORE BELOW' : ui.stage === 0 ? 'SCROLL TO PLAY' : 'SCROLL'}</span><i />
      </div>
    </section>
  );
}
