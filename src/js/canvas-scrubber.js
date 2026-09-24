/**
 * JEEMU 3D CANVAS SCRUBBER & GUIDED TOUR ENGINE
 * Ported & enhanced from colleague's jeemu/app-v2.js.
 * Features:
 * - 240-frame memory-bounded WebP scrubbing
 * - Pinned scrollytelling synchronization with page scroll
 * - 22-second user-initiated Guided Tour with pause/resume
 * - Range slider & keyboard navigation
 * - Reduced motion support
 */

import { analytics } from './analytics.js';

export class CanvasScrubber {
  constructor() {
    this.canvas = document.querySelector('#product');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.product = document.querySelector('.product');
    this.panels = [...document.querySelectorAll('.panel')];
    this.slider = document.querySelector('#progress');
    this.motion = document.querySelector('#motion');
    this.playback = document.querySelector('#playback');
    this.hint = document.querySelector('#hint');
    this.track = document.querySelector('.hero-scrolly-track');

    this.pref = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.pref.matches;
    this.target = this.reduced ? 1 : 0;
    this.value = this.target;

    this.raf = 0;
    this.lastTime = 0;
    this.lastFrame = -1;
    this.focusEnd = false;
    this.touchY = null;
    this.skipTransition = false;
    this.playing = false;
    this.tourTime = 0;
    this.tourStarted = false;
    this.isProgrammaticScroll = false;

    // 22-second narrative tour waypoints
    this.tour = [
      [0, 0.14],
      [6500, 0.54],
      [11500, 0.74],
      [17500, 0.91],
      [22000, 1]
    ];

    // Frame URLs
    this.urls = window.JEEMU_FRAMES || Array.from({ length: 240 }, (_, i) => `/frames-smooth/${String(i).padStart(3, '0')}.webp`);
    this.cache = new Map();
    this._trackBounds = null; // Cached via ResizeObserver

    this._bindEvents();
    this._initResizeObserver();
    this.setReduced(this.reduced);
    this.render();

    // Preload initial frames
    for (let i = 0; i < 6; i++) {
      this.requestFrame(i);
    }

    // Expose globally so funnel.js can pause the tour on modal open
    window.canvasScrubber = this;
  }

  clamp(v, a = 0, b = 1) {
    return Math.min(b, Math.max(a, v));
  }

  frameAt(v) {
    return Math.round(this.clamp((v - 0.17) / 0.83) * (this.urls.length - 1));
  }

  requestFrame(i) {
    if (i < 0 || i >= this.urls.length || this.cache.has(i)) return;
    const im = new Image();
    const entry = { im, ready: false };
    this.cache.set(i, entry);
    im.src = this.urls[i];
    im.decode()
      .then(() => {
        if (this.cache.get(i) !== entry) return;
        entry.ready = true;
        this.schedule();
      })
      .catch(() => this.cache.delete(i));
  }

  tourPosition(t) {
    for (let i = 1; i < this.tour.length; i++) {
      if (t <= this.tour[i][0]) {
        const [a, x] = this.tour[i - 1];
        const [b, y] = this.tour[i];
        return x + (y - x) * (t - a) / (b - a);
      }
    }
    return 1;
  }

  playbackUI() {
    if (!this.playback) return;
    this.playback.hidden = !this.tourStarted || this.value >= 1 || this.reduced;
    this.playback.textContent = this.playing ? 'Pause tour' : 'Resume tour';
  }

  startTour() {
    if (this.reduced) {
      this.go(1, true);
      return;
    }
    this.tourStarted = true;
    this.playing = true;
    this.tourTime = 0;
    this.value = this.target = 0.14;
    this.lastTime = 0;
    this.focusEnd = false;
    this.playbackUI();
    this.schedule();

    try {
      analytics?.track('start_guided_tour', { source: 'button' });
    } catch (_) {}
  }

  draw() {
    if (!this.ctx || !this.urls.length) return;
    const index = this.frameAt(this.value);
    const direction = this.target >= this.value ? 1 : -1;

    this.requestFrame(index);
    for (let n = 1; n <= 8; n++) this.requestFrame(index + n * direction);
    for (let n = 1; n <= 3; n++) this.requestFrame(index - n * direction);

    for (const [i] of this.cache) {
      if (Math.abs(i - index) > 14 && i !== this.lastFrame) {
        this.cache.delete(i);
      }
    }

    const ready = this.cache.get(index);
    if (!ready?.ready || index === this.lastFrame) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(ready.im, 0, 0, this.canvas.width, this.canvas.height);
    this.lastFrame = index;
    this.canvas.dataset.frame = String(index);
  }

  render() {
    const mobile = window.innerWidth <= 760;
    const stage = this.value < 0.14 ? 0 : this.value < 0.60 ? 1 : this.value < 0.75 ? 2 : this.value < 0.94 ? 3 : 4;

    this.panels.forEach((p, i) => {
      const active = i === stage;
      p.style.opacity = active ? '1' : '0';
      p.inert = !active;
      p.setAttribute('aria-hidden', String(!active));
      p.style.pointerEvents = active ? 'auto' : 'none';
    });

    if (this.product) {
      this.product.style.transform = 'none';
      this.product.style.opacity = '1';
    }

    if (this.slider) {
      this.slider.value = Math.round(this.value * 1000);
      this.slider.style.setProperty('--progress', `${this.value * 100}%`);
      const stageLabels = ['Introduction', 'Build the tower', 'Pull and tap', 'Choose your game', 'Kickstarter waitlist'];
      this.slider.setAttribute('aria-valuetext', stageLabels[stage] || 'Experience');
    }

    if (this.hint) {
      this.hint.textContent = this.playing
        ? 'PLAYING THE TOUR'
        : this.value > 0.97
        ? 'SCROLL DOWN FOR SPECS & HARDWARE ↓'
        : mobile
        ? 'SWIPE TO EXPLORE'
        : 'SCROLL TO DISCOVER';
    }

    this.draw();
    this.playbackUI();

    if (this.focusEnd && this.value > 0.995) {
      const signupTitle = document.querySelector('#signup-title');
      if (signupTitle) signupTitle.focus({ preventScroll: true });
      this.focusEnd = false;
    }
  }

  tick(time) {
    const dt = Math.min((time - this.lastTime) || 16, 40);
    this.lastTime = time;

    if (this.playing) {
      this.tourTime = Math.min(22000, this.tourTime + dt);
      this.value = this.target = this.tourPosition(this.tourTime);
      if (this.tourTime >= 22000) this.playing = false;

      // Sync window scroll with tour
      this.syncScrollFromProgress(this.value);
    } else {
      // Responsive, smooth exponential interpolation without artificial lag
      const factor = this.skipTransition ? 1 : 1 - Math.exp(-dt / 50);
      this.value = this.reduced ? this.target : this.value + (this.target - this.value) * factor;
      if (Math.abs(this.target - this.value) < 0.0004) this.value = this.target;
    }

    this.render();
    this.raf = 0;
    if (this.value !== this.target || this.playing) {
      this.schedule();
    } else {
      this.skipTransition = false;
    }
  }

  schedule() {
    if (!this.raf) {
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }

  go(v, focus = false, syncScroll = true) {
    this.playing = false;
    this.tourStarted = false;
    this.target = this.clamp(v);
    this.focusEnd = focus;
    this.skipTransition = focus;
    if (this.reduced) this.value = this.target;
    this.schedule();

    if (syncScroll) {
      this.syncScrollFromProgress(this.target);
    }
  }

  _initResizeObserver() {
    if (!this.track) return;
    const updateBounds = () => {
      const rect = this.track.getBoundingClientRect();
      this._trackBounds = {
        top: this.track.offsetTop,
        height: this.track.offsetHeight
      };
    };
    updateBounds();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateBounds);
      ro.observe(this.track);
      ro.observe(document.body);
    }
    window.addEventListener('load', updateBounds, { once: true });
  }

  getMaxTrackScroll() {
    if (!this.track) return window.innerHeight * 2.2;
    const trackHeight = this._trackBounds?.height || this.track.offsetHeight;
    return Math.max(window.innerHeight * 1.5, trackHeight - window.innerHeight);
  }

  syncScrollFromProgress(progress) {
    if (!this.track) return;
    const maxScroll = this.getMaxTrackScroll();
    const trackTop = this._trackBounds?.top ?? this.track.offsetTop;
    const desiredScroll = trackTop + progress * maxScroll;

    this.isProgrammaticScroll = true;
    window.scrollTo({
      top: desiredScroll,
      behavior: this.skipTransition ? 'smooth' : 'auto'
    });
    // Guard must be longer than the smooth scroll animation (~600ms)
    clearTimeout(this._progScrollTimer);
    this._progScrollTimer = setTimeout(() => { this.isProgrammaticScroll = false; }, 800);
  }

  handleWindowScroll() {
    if (this.isProgrammaticScroll || this.playing) return;
    if (!this.track) return;

    const scrollY = window.scrollY;
    const trackTop = this._trackBounds?.top ?? this.track.offsetTop;
    const maxScroll = this.getMaxTrackScroll();

    if (scrollY <= trackTop) {
      this.target = 0;
      this.schedule();
    } else if (scrollY >= trackTop + maxScroll) {
      this.target = 1;
      this.schedule();
    } else {
      const ratio = (scrollY - trackTop) / maxScroll;
      this.target = this.clamp(ratio, 0, 1);
      this.schedule();
    }
  }

  setReduced(v) {
    this.reduced = v;
    if (this.motion) {
      this.motion.textContent = v ? 'Enable animation' : 'Reduce motion';
      this.motion.setAttribute('aria-pressed', String(v));
    }
    if (v) this.go(1, false, false);
    else this.schedule();
  }

  _editing(el) {
    return !!el?.closest('input, textarea, button, a, form, select');
  }

  _bindEvents() {
    // Scroll listener on window
    window.addEventListener('scroll', () => this.handleWindowScroll(), { passive: true });

    // Slider scrubbing
    this.slider?.addEventListener('input', () => {
      this.go(Number(this.slider.value) / 1000, false, true);
    });

    // Tour Playback Button
    this.playback?.addEventListener('click', () => {
      this.playing = !this.playing;
      this.lastTime = 0;
      this.playbackUI();
      this.schedule();
    });

    // Motion preference
    this.motion?.addEventListener('click', () => this.setReduced(!this.reduced));
    this.pref.addEventListener('change', (e) => this.setReduced(e.matches));

    // Experience tour buttons
    document.querySelectorAll('.experience, .replay').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.startTour();
        if (this.playback) this.playback.focus();
      });
    });

    // Skip to signup
    document.querySelectorAll('.skip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.go(1, true, true);
      });
    });

    // Wordmark home jump
    document.querySelectorAll('.wordmark, #nav-brand-logo').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.go(0, false, true);
      });
    });

    // Keyboard navigation when focus is in viewport and not editing
    window.addEventListener('keydown', (e) => {
      if (this._editing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (window.scrollY > (this.track?.offsetTop || 0) + this.getMaxTrackScroll() + 100) return;

      const steps = {
        ArrowDown: 0.06,
        ArrowRight: 0.06,
        ArrowUp: -0.06,
        ArrowLeft: -0.06,
        PageDown: 0.23,
        PageUp: -0.23,
        ' ': 0.18
      };

      if (e.key in steps) {
        e.preventDefault();
        this.go(this.target + steps[e.key], false, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.go(1, true, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.go(0, false, true);
      }
    });

    // Resize handler
    window.addEventListener('resize', () => {
      this.lastFrame = -1;
      this.schedule();
    }, { passive: true });
  }
}

export const canvasScrubber = new CanvasScrubber();
