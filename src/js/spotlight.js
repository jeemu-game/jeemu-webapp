/**
 * JEEMU MODERN UI ENHANCEMENT ENGINE
 * Inspired by Skipper UI, Reactbits, Cult UI, Manus.im, Watermelon UI, and Magicui.design.
 * 
 * Features:
 * - Reactbits Spotlight (cursor-following radial glow)
 * - Reactbits 3D Tilt physics (perspective card & block hover)
 * - Magic UI Number Ticker (smooth eased stat counter)
 * - Skipper UI / Watermelon UI Synthesized Web Audio (0-dependency tactile sound FX)
 * - Manus.im Keyboard Shortcuts & Micro-Feedback
 * - Ambient Ember Particles Canvas
 */

class UIEnhancementEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = localStorage.getItem('jeemu_sound_fx') !== 'false';
    this.hasInteracted = false;
  }

  init() {
    this._initSpotlight();
    this._init3DTilt();
    this._initNumberTicker();
    this._initAudioEngine();
    this._initKeyboardShortcuts();
    this._initAmbientParticles();
  }

  /* ================= 1. REACTBITS SPOTLIGHT ENGINE ================= */
  _initSpotlight() {
    const selector = '.spotlight-card, .wooden-block-btn, .bento-card, .hero-reservation-card, .clean-modal-card, .feed-card, .chaos-card, .team-card, .final-cta-card, .dash-card';
    
    document.addEventListener('mousemove', (e) => {
      const activeCard = e.target.closest(selector);
      if (!activeCard) return;

      const rect = activeCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      activeCard.style.setProperty('--mouse-x', `${x}px`);
      activeCard.style.setProperty('--mouse-y', `${y}px`);
    }, { passive: true });
  }

  /* ================= 2. REACTBITS 3D TILT PHYSICS ================= */
  _init3DTilt() {
    const blocks = document.querySelectorAll('.wooden-block-btn');

    blocks.forEach(block => {
      let isHovered = false;

      block.addEventListener('mouseenter', () => {
        isHovered = true;
        block.style.transition = 'transform 0.08s ease-out';
      });

      block.addEventListener('mousemove', (e) => {
        if (!isHovered) return;
        const rect = block.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const rotateX = ((mouseY / height) - 0.5) * -14;
        const rotateY = ((mouseX / width) - 0.5) * 14;

        block.style.transform = `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.025, 1.025, 1.025)`;
      });

      block.addEventListener('mouseleave', () => {
        isHovered = false;
        block.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        block.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
      });
    });
  }

  /* ================= 3. MAGIC UI NUMBER TICKER ================= */
  _initNumberTicker() {
    const elementsToTick = [
      { el: document.getElementById('live-backer-count'), target: 1847, format: n => n.toLocaleString('en-US') },
      { el: document.querySelector('.bento-stat-inline div:nth-child(1) strong'), target: 45, format: n => String(n) },
      { el: document.querySelector('.bento-stat-inline div:nth-child(3) strong'), target: 12, format: n => `${n}h` }
    ];

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const item = elementsToTick.find(t => t.el === entry.target);
          if (item && !entry.target.dataset.ticked) {
            entry.target.dataset.ticked = 'true';
            this._animateValue(entry.target, 0, item.target, 1400, item.format);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    elementsToTick.forEach(item => {
      if (item.el) observer.observe(item.el);
    });
  }

  _animateValue(element, start, end, duration, formatFn) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * eased);
      element.textContent = formatFn ? formatFn(current) : current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = formatFn ? formatFn(end) : end;
      }
    };
    window.requestAnimationFrame(step);
  }

  /* ================= 4. SKIPPER / WATERMELON SYNTHESIZED WEB AUDIO ================= */
  _initAudioEngine() {
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.hasInteracted = true;
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    // Bind sound toggle button in simulator
    const toggleBtn = document.getElementById('sim-sound-toggle-btn');
    if (toggleBtn) {
      this._updateSoundToggleUI(toggleBtn);
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('jeemu_sound_fx', this.soundEnabled ? 'true' : 'false');
        this._updateSoundToggleUI(toggleBtn);
        if (this.soundEnabled) this.playTapFeedback();
      });
    }

    // Attach sound to wooden block taps
    document.querySelectorAll('.wooden-block-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.playWoodBlockTap();
        setTimeout(() => this.playNfcChime(), 140);
      });
    });

    // Attach subtle click feedback to primary buttons
    document.querySelectorAll('.btn-shimmer-primary, .join-primary, .cat-pill').forEach(btn => {
      btn.addEventListener('click', () => this.playTapFeedback());
    });
  }

  _updateSoundToggleUI(btn) {
    if (!btn) return;
    if (this.soundEnabled) {
      btn.innerHTML = `<span class="sound-icon">🔊</span> <span>Sound: ON</span>`;
      btn.classList.add('sound-active');
    } else {
      btn.innerHTML = `<span class="sound-icon">🔇</span> <span>Sound: OFF</span>`;
      btn.classList.remove('sound-active');
    }
  }

  playWoodBlockTap() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Tactile beechwood knock frequency
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  playNfcChime() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      // High-tech NFC handshake 2-tone ping (660Hz -> 880Hz)
      [660, 880].forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.06));

        gain.gain.setValueAtTime(0.12, now + (i * 0.06));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (i * 0.06) + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + (i * 0.06));
        osc.stop(now + (i * 0.06) + 0.18);
      });
    } catch (_) {}
  }

  playTapFeedback() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  /* ================= 5. MANUS.IM KEYBOARD SHORTCUTS ================= */
  _initKeyboardShortcuts() {
    const blockMap = {
      '1': 'block-btn-7',
      '2': 'block-btn-14',
      '3': 'block-btn-23',
      '4': 'block-btn-36',
      '5': 'block-btn-45'
    };

    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if user is typing in form field
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      // 1-5 taps block in simulator
      if (blockMap[e.key]) {
        const blockEl = document.getElementById(blockMap[e.key]);
        if (blockEl) {
          blockEl.click();
          blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          blockEl.style.transform = 'scale(0.95)';
          setTimeout(() => { blockEl.style.transform = ''; }, 120);
        }
      }

      // 'V' opens VIP reservation modal
      if (e.key === 'v' || e.key === 'V') {
        const vipBtn = document.getElementById('nav-cta-btn') || document.querySelector('.btn-open-vip');
        if (vipBtn) vipBtn.click();
      }

      // 'Escape' closes modals
      if (e.key === 'Escape') {
        ['vip-modal', 'stripe-checkout-modal', 'share-modal', 'team-studio-modal'].forEach(id => {
          const modal = document.getElementById(id);
          if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
          }
        });
        const drawer = document.getElementById('analytics-drawer');
        if (drawer && !drawer.classList.contains('hidden')) {
          drawer.classList.add('hidden');
        }
      }
    });
  }

  /* ================= 6. AMBIENT EMBER PARTICLES ================= */
  _initAmbientParticles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heroStage = document.querySelector('.hero-sticky-stage');
    if (!heroStage) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-particles-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    heroStage.insertBefore(canvas, heroStage.firstChild);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = heroStage.clientWidth || window.innerWidth;
    let height = canvas.height = heroStage.clientHeight || window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = heroStage.clientWidth || window.innerWidth;
      height = canvas.height = heroStage.clientHeight || window.innerHeight;
    }, { passive: true });

    // Subtle warm ember specs
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.55 + 0.15,
      hue: Math.random() > 0.6 ? 38 : 18 // warm amber or fire orange
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 55%, 0.8)`;
        ctx.fill();
      });

      requestAnimationFrame(render);
    };

    render();
  }
}

export const uiEnhancements = new UIEnhancementEngine();

// Compatibility export
export function initSpotlightAndTilt() {
  uiEnhancements.init();
}
