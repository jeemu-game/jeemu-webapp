import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameScreen from './GameScreen';
import { quadToMatrix3d } from './quad';
import { STAGES, STOPS, SCREEN_CARDS, INTRO_CARD, INTRO_UNTIL } from './stages';
import { track } from '../../analytics';

const BASE = import.meta.env.BASE_URL;
const PREVIEW = import.meta.env.VITE_PREVIEW === 'true';
const SCREEN_W = 320, SCREEN_H = 240;
const CARD_MS = 3600;   // the question is up for about as long as the zoom-in takes, then the waitlist card
const mq = (q) => typeof matchMedia !== 'undefined' && matchMedia(q).matches;
// true when the video already holds every second from a to b, so playing that span cannot freeze or flash empty
const hasBuffered = (v, a, b) => { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= a + 0.05 && v.buffered.end(i) >= b - 0.05) return true; return false; };

// One video, four stops. Scroll / swipe / key at a stop plays the next piece at normal speed and lands
// on the next stop. It never sits half way. Going back is a straight cut to the previous stop.
export default function StoryPlayer({ onCta }) {
  // windows that are taller than they are wide (phones, narrow panes) get the portrait render
  const dir = useRef(window.innerWidth / window.innerHeight < 0.75 ? `${BASE}story/mobile/` : `${BASE}story/`).current;
  const [narrow, setNarrow] = useState(() => window.innerWidth / window.innerHeight < 1.1 || window.innerWidth < 760);
  const root = useRef(null), view = useRef(null), video = useRef(null), vrev = useRef(null), screenEl = useRef(null);
  const s = useRef({ tl: null, stage: -1, playing: false, queued: false, cooldown: 0, awayAt: 0, mode: 'intro', raf: 0, toCta: false });
  const [tl, setTl] = useState(null);
  const [src, setSrc] = useState('');
  const [srcRev, setSrcRev] = useState('');
  const [act, setAct] = useState('f');   // which of the two videos is on show: forward or the reversed copy
  const [ready, setReady] = useState(false);
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

  // the video file this browser can decode starts downloading straight away; the timeline arrives alongside it
  useEffect(() => {
    let dead = false;
    const t = document.createElement('video');
    const ext = t.canPlayType('video/mp4; codecs="avc1.640028"') ? 'mp4' : 'webm';
    const get = (name, set) => {
      if (PREVIEW) fetch(dir + name).then((r) => r.blob()).then((b) => { if (!dead) set(URL.createObjectURL(b)); });   // the preview host can't serve byte ranges
      else set(dir + name);
    };
    get(`story.${ext}`, setSrc);
    fetch(`${dir}timeline.json`).then((r) => r.json()).then((j) => {
      if (dead) return;
      j.rests = STOPS.filter((f) => f < j.frames);
      s.current.tl = j; setTl(j);
      if (j.reverse) {
        s.current.revLoader = () => get(`story-rev.${ext}`, setSrcRev);
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
      const isNarrow = cw / ch < 1.1 || cw < 760;
      // landscape: cover, so things enter and leave at the window's own edges. Phones: cover is too tight (the screen
      // close-up fills the whole width and the tower is cut off), so fit the whole frame (with a little air) and let the dark backdrop fill the rest.
      const sc = isNarrow ? Math.min(cw / tl.width, ch / tl.height) * 0.92 : Math.max(cw / tl.width, ch / tl.height);
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

  const play = useCallback((k, d = 1) => {
    const st = s.current, vf = video.current, vr = vrev.current;
    if (!vf || !st.tl || st.playing) return;
    const { fps, rests, frames: N } = st.tl;
    if (mq('(prefers-reduced-motion: reduce)')) { cutRef.current(k); return; }   // no animated playback for people who asked for less motion
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
    const p = v.play();
    // if the browser refuses to play (no gesture yet, data saver), land on the stop anyway rather than asking for a tap
    if (p && p.catch) p.catch((err) => { if (err && err.name !== 'AbortError' && st.playing && st.target === k) cutRef.current(k); });
    setAct(rev ? 'r' : 'f');
    const done = () => {
      v.pause(); v.currentTime = tOf(to); paint(to);
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
  }, [arrive, paint, startRev]);

  const cutRef = useRef(() => {});
  const cut = useCallback((k) => {
    const st = s.current, v = video.current, vr = vrev.current;
    if (!v || !st.tl) return;
    st.playing = false; st.target = -1; v.pause(); if (vr) vr.pause();
    v.currentTime = st.tl.rests[k] / st.tl.fps;
    if (vr && st.tl.reverse) vr.currentTime = (st.tl.frames - 1 - st.tl.rests[k]) / st.tl.fps;
    setAct('f');
    paint(st.tl.rests[k]);
    st.toCta = k === st.tl.rests.length - 1;
    st.stage = k; st.cooldown = performance.now() + 500;
    setUi({ stage: k, playing: false });
  }, [paint]);
  cutRef.current = cut;

  // first load: rest on the opening stop (or the last one if the page was restored part way down)
  const booted = ready && !!tl;
  useEffect(() => {
    if (!booted || s.current.stage !== -1) return;
    cut(window.scrollY > 80 ? s.current.tl.rests.length - 1 : 0);
  }, [booted, cut]);

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
      [video.current, vrev.current].forEach((v) => { if (v && v.paused) { const p = v.play(); if (p && p.then) p.then(() => { if (!st.playing) v.pause(); }).catch(() => {}); } });
      window.removeEventListener('touchend', unlock);
    };
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTs, { passive: true });
    window.addEventListener('touchmove', onTm, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTs);
      window.removeEventListener('touchmove', onTm); window.removeEventListener('touchend', unlock); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll);
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
    <section className={`story ${narrow ? 'is-narrow' : ''} ${ui.stage >= last && !ui.playing ? 'is-done' : ''}`} id="story" ref={root} aria-label="How Jeemu plays">
      {/* everything the pixel screen says is drawn, so say it in text too */}
      <h1 className="sr-only">Jeemu, a tower game that starts the conversation</h1>
      <p className="sr-only">{INTRO_CARD.text} Pull a block from the tower, tap it on the base, and the screen asks you a question. {SCREEN_CARDS.map((c) => c.text).join(' ')}</p>
      <div className="story-view" ref={view} style={tl ? { width: tl.width, height: tl.height } : undefined}>
        <div className="story-videos">
        {/* the first frame is on screen as soon as the page is, while the video downloads behind it */}
        {tl && <img className="story-poster" src={`${dir}poster.jpg`} alt="" aria-hidden="true" />}
        {src && (
          <video
            ref={video} className={`story-video ${act === 'f' ? '' : 'hide'}`} src={src} poster={`${dir}poster.jpg`} muted playsInline preload="auto" aria-hidden="true"
            onLoadedData={() => setReady(true)} onProgress={onForwardProgress} onSeeked={(e) => paint(e.currentTarget.currentTime * (s.current.tl?.fps || 30))}
          />
        )}
        {srcRev && <video ref={vrev} className={`story-video ${act === 'r' ? '' : 'hide'}`} src={srcRev} muted playsInline preload="auto" aria-hidden="true" />}
        </div>
        <div className={`story-screen ${mode !== 'off' && booted ? 'on' : ''}`} ref={screenEl} aria-hidden="true">
          <GameScreen card={mode === 'intro' ? INTRO_CARD : SCREEN_CARDS[cardIdx]} onCta={onCta} />
        </div>
      </div>
      <div className="story-fx" aria-hidden="true" />

      {!booted && (
        <div className="story-loading" role="status">
          <img src={`${BASE}story/frog-pixel.png`} alt="" className="px-frog" />
          <div className="px-label">LOADING</div>
          <div className="px-bar"><span /></div>
        </div>
      )}

      {ui.stage >= last && !ui.playing && <button className="sr-only" onClick={onCta}>Join the waitlist</button>}

      <nav className="story-rail" aria-label="Story steps">
        {STAGES.map((b, i) => (b.rail ? (
          <button key={b.id} className={shown === i ? 'on' : ''} onClick={() => !s.current.playing && cut(i)} aria-label={`Go to step ${b.rail}`}><span>{b.rail}</span></button>
        ) : null))}
      </nav>

      <div className={`story-hint ${!ui.playing && booted ? 'show' : ''}`} aria-hidden="true">
        <span>{ui.stage >= last ? 'MORE BELOW' : ui.stage === 0 ? 'SCROLL TO PLAY' : 'SCROLL'}</span><i />
      </div>
    </section>
  );
}
