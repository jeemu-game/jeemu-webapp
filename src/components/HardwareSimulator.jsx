import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SIMULATOR_CATEGORIES } from '../data/simulatorCategories';

export default function HardwareSimulator() {
  const [currentCategory, setCurrentCategory] = useState('party');
  const [currentBlockId, setCurrentBlockId] = useState(7);
  const [readCount, setReadCount] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('jeemu_sound_fx') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [displayedText, setDisplayedText] = useState('');
  const [isNfcPulsing, setIsNfcPulsing] = useState(false);
  const [isActionConfirmed, setIsActionConfirmed] = useState(false);

  const blockIds = [7, 14, 23, 36, 45];
  const audioCtxRef = useRef(null);
  const typewriterTimerRef = useRef(null);

  const catData = SIMULATOR_CATEGORIES[currentCategory] || SIMULATOR_CATEGORIES.party;
  const blockData = catData.blocks[currentBlockId] || catData.blocks[7];

  // Initialize or resume Web Audio context
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // 1. Synthesized Beechwood Block Knock (260Hz -> 80Hz triangle wave)
  const playWoodBlockTap = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }, [soundEnabled, getAudioContext]);

  // 2. High-Tech Dual-Tone NFC Handshake Chime (660Hz -> 880Hz)
  const playNfcChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.18);
      });
    } catch (_) {}
  }, [soundEnabled, getAudioContext]);

  // 3. Subtle UI Button Tap Feedback (440Hz -> 300Hz)
  const playTapFeedback = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }, [soundEnabled, getAudioContext]);

  // Trigger NFC pulse animation and audio
  const triggerNfcPulse = useCallback(() => {
    setIsNfcPulsing(false);
    requestAnimationFrame(() => {
      setIsNfcPulsing(true);
    });
    playWoodBlockTap();
    setTimeout(() => {
      playNfcChime();
    }, 120);
  }, [playWoodBlockTap, playNfcChime]);

  // Reactbits 3D Tilt Physics and Spotlight cursor tracking
  const handleBlockMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateX = ((mouseY / height) - 0.5) * -12;
    const rotateY = ((mouseX / width) - 0.5) * 12;

    card.style.setProperty('--mouse-x', `${mouseX}px`);
    card.style.setProperty('--mouse-y', `${mouseY}px`);
    card.style.transform = `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleBlockMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
  };

  // Select a block with spring tactile bounce
  const handleSelectBlock = useCallback((blockId) => {
    const btn = document.getElementById(`block-btn-${blockId}`);
    if (btn) {
      btn.style.transform = 'perspective(700px) scale(0.95)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 140);
    }

    if (currentBlockId === blockId) {
      triggerNfcPulse();
      return;
    }
    setCurrentBlockId(blockId);
    setReadCount(prev => prev + 1);
    triggerNfcPulse();
  }, [currentBlockId, triggerNfcPulse]);

  // Cycle blocks with hardware buttons
  const handleCycleBlock = (direction) => {
    playTapFeedback();
    const currentIndex = blockIds.indexOf(currentBlockId);
    const nextIndex = (currentIndex + direction + blockIds.length) % blockIds.length;
    handleSelectBlock(blockIds[nextIndex]);
  };

  // Hardware Confirm Button
  const handleConfirmAction = () => {
    playTapFeedback();
    triggerNfcPulse();
    setIsActionConfirmed(true);
    setTimeout(() => {
      setIsActionConfirmed(false);
    }, 1400);
  };

  // Typewriter effect on OLED display screen
  useEffect(() => {
    if (isActionConfirmed) {
      setDisplayedText('>> ACTION CONFIRMED! PASS TO NEXT PLAYER <<');
      return;
    }

    const fullPrompt = `"${blockData.text}"`;
    setDisplayedText('');
    let index = 0;
    const speed = 14;

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    typewriterTimerRef.current = setInterval(() => {
      if (index < fullPrompt.length) {
        setDisplayedText(prev => prev + fullPrompt.charAt(index));
        index++;
      } else {
        clearInterval(typewriterTimerRef.current);
      }
    }, speed);

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, [currentBlockId, currentCategory, isActionConfirmed, blockData.text]);

  // Sound Toggle Handler
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    try {
      localStorage.setItem('jeemu_sound_fx', newState ? 'true' : 'false');
    } catch (_) {}
    if (newState) {
      getAudioContext();
      playTapFeedback();
    }
  };

  // Global Manus.im Keyboard Shortcuts: 1-5 to select blocks, V for reservation
  useEffect(() => {
    const keyMap = {
      '1': 7,
      '2': 14,
      '3': 23,
      '4': 36,
      '5': 45
    };

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (keyMap[e.key]) {
        e.preventDefault();
        handleSelectBlock(keyMap[e.key]);
        const blockEl = document.getElementById(`block-btn-${keyMap[e.key]}`);
        if (blockEl) {
          blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      if (e.key === 'v' || e.key === 'V') {
        const reserveEl = document.getElementById('reserve-funnel');
        if (reserveEl) {
          reserveEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectBlock]);

  return (
    <section className="deep-section haikei-ambient-grid" id="simulator">
      <div id="experiences" style={{ position: 'relative', top: '-60px' }} />
      <div className="container">
        {/* Section Header with Sound Toggle */}
        <div className="section-head" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="section-tag">Interactive Hardware Prototype</span>
              <h2 className="section-title">Tap a Block on the Reader</h2>
              <p className="section-desc">
                Experience the tactile physical-to-digital interface. Choose a game category, then click any wooden block or press keys <kbd className="manus-kbd">1</kbd>–<kbd className="manus-kbd">5</kbd> to position it on the Jeemu smart dock.
              </p>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                id="sim-sound-toggle-btn"
                onClick={toggleSound}
                className={`sim-sound-toggle ${soundEnabled ? 'sound-active' : ''}`}
                title="Toggle tactile wood tap & NFC sound FX"
                aria-label="Toggle simulator sound effects"
              >
                <span className="sound-icon">{soundEnabled ? '🔊' : '🔇'}</span>
                <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Switcher Pills */}
        <div className="category-switch-bar" id="sim-category-pills">
          {Object.values(SIMULATOR_CATEGORIES).map((cat) => (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              onClick={() => {
                playTapFeedback();
                setCurrentCategory(cat.id);
                triggerNfcPulse();
              }}
              className={`cat-pill ${cat.id === currentCategory ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Simulator Cockpit */}
        <div className="simulator-cockpit">
          {/* Left Column: 5 Tactile Beechwood Blocks */}
          <div className="blocks-column">
            <div className="column-header">
              <span className="col-title">NFC Beechwood Blocks</span>
              <span className="col-sub">Click block or press keys 1–5</span>
            </div>

            <div className="blocks-stack">
              {blockIds.map((id, idx) => {
                const bInfo = catData.blocks[id] || { tag: 'Peril Tag', text: '' };
                const isActive = id === currentBlockId;
                return (
                  <button
                    key={id}
                    id={`block-btn-${id}`}
                    onClick={() => handleSelectBlock(id)}
                    onMouseMove={handleBlockMouseMove}
                    onMouseLeave={handleBlockMouseLeave}
                    className={`wooden-block-btn spotlight-card border-beam-container ${isActive ? 'active' : ''}`}
                    title={`Press key ${idx + 1} to tap Block #${String(id).padStart(2, '0')}`}
                  >
                    {/* Rotating border beam on active block */}
                    {isActive && <div className="border-beam" aria-hidden="true" />}

                    <div className="block-content-row">
                      <div className="block-title-group">
                        <span className="block-nfc-mark">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                          </svg>
                        </span>
                        <span className="block-num">
                          BLOCK #{String(id).padStart(2, '0')} <kbd className="manus-kbd">{idx + 1}</kbd>
                        </span>
                      </div>
                      <span className="block-peril-tag">{bInfo.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Hardware Chassis & Panoramic IPS Screen */}
          <div className="hardware-dock-column">
            <div className="hardware-chassis border-beam-container" id="device-chassis">
              {/* Rotating border beam around hardware chassis */}
              <div className="border-beam" aria-hidden="true" />
              {/* NFC Target Pad */}
              <div className="nfc-target-pad" id="nfc-pad-target">
                <div
                  className={`nfc-glow-ring ${isNfcPulsing ? 'pulsing' : ''}`}
                  id="nfc-glow-ring"
                />
                <div className="nfc-docked-indicator" id="docked-block-avatar">
                  <span className="pulse-indicator-dot" />
                  <span className="indicator-text" id="docked-block-text">
                    Block #{String(currentBlockId).padStart(2, '0')} Positioned
                  </span>
                </div>
              </div>

              {/* Panoramic IPS Smart Display */}
              <div className="oled-bezel">
                <div className="oled-scanlines" />
                <div className="oled-display" id="oled-display">
                  <div className="oled-header-line">
                    <span className="oled-mode" id="oled-mode-name">
                      {catData.modeTitle}
                    </span>
                    <span className="oled-ready-state" id="oled-status">
                      NFC ACTIVE
                    </span>
                  </div>

                  <div className="oled-prompt-stage">
                    <div className="oled-block-id-tag" id="oled-block-id">
                      BLOCK #{String(currentBlockId).padStart(2, '0')} · {blockData.tag.toUpperCase()}
                    </div>
                    <p className="oled-prompt-output" id="oled-prompt-text">
                      {displayedText}
                    </p>
                  </div>

                  <div className="oled-footer-line">
                    <span>PANORAMIC IPS · JEEMU OS v2.4</span>
                    <span>
                      READS: <span id="oled-read-count">{readCount}</span>/45
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactile Hardware Buttons & Spec Tag */}
              <div className="chassis-footer-row">
                <div className="hw-keys">
                  <button
                    className="hw-key"
                    id="hw-btn-prev"
                    onClick={() => handleCycleBlock(-1)}
                    title="Previous Configuration"
                  >
                    ◀
                  </button>
                  <button
                    className="hw-key hw-key-action"
                    id="hw-btn-select"
                    onClick={handleConfirmAction}
                    title="Action / Confirm"
                  >
                    CONFIRM
                  </button>
                  <button
                    className="hw-key"
                    id="hw-btn-next"
                    onClick={() => handleCycleBlock(1)}
                    title="Next Configuration"
                  >
                    ▶
                  </button>
                </div>

                <div className="hw-spec-tag">
                  <span className="spec-led" />
                  <span>STANDALONE PEDESTAL HARDWARE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
