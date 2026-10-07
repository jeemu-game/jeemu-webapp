import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SIMULATOR_CATEGORIES } from '../data/simulatorCategories';
import { Volume2, VolumeX, Sparkles, Smartphone } from 'lucide-react';

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

  // Synthesized Solid Wood Block Knock
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

  // High-frequency digital Tag Confirmation Beep
  const playNfcChirp = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (_) {}
  }, [soundEnabled, getAudioContext]);

  const triggerNfcPulse = useCallback(() => {
    setIsNfcPulsing(true);
    setTimeout(() => setIsNfcPulsing(false), 600);
  }, []);

  const handleSelectBlock = useCallback((id) => {
    if (id === currentBlockId) return;
    setCurrentBlockId(id);
    setReadCount((prev) => prev + 1);
    playWoodBlockTap();
    setTimeout(() => {
      playNfcChirp();
      triggerNfcPulse();
    }, 60);
  }, [currentBlockId, playWoodBlockTap, playNfcChirp, triggerNfcPulse]);

  // Dynamic Typewriter Effect for OLED Prompt Display
  useEffect(() => {
    const fullPrompt = `"${blockData.text}"`;
    setDisplayedText('');
    let index = 0;
    const speed = 12;

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    typewriterTimerRef.current = setInterval(() => {
      if (index < fullPrompt.length) {
        setDisplayedText((prev) => prev + fullPrompt.charAt(index));
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
  }, [currentBlockId, currentCategory, blockData.text]);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    try {
      localStorage.setItem('jeemu_sound_fx', newState ? 'true' : 'false');
    } catch (_) {}
  };

  return (
    <section className="section-container" id="simulator">
      <div className="section-header">
        <div className="glow-pill">
          <Sparkles size={14} />
          <span>Interactive Dock Demo</span>
        </div>
        <h2 className="section-title">Tap Any Block. The Screen Reacts.</h2>
        <p className="section-desc">
          Try it below: pick your night's vibe, then tap any wood block to see the smart pedestal dock reveal a fresh challenge instantly.
        </p>
      </div>

      {/* Vibe Category Pills */}
      <div className="category-switch-bar">
        {Object.values(SIMULATOR_CATEGORIES).map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCurrentCategory(cat.id);
              playWoodBlockTap();
              triggerNfcPulse();
            }}
            className={`cat-pill ${cat.id === currentCategory ? 'active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Simulator Cockpit: Responsive Split Layout */}
      <div className="simulator-cockpit">
        {/* Column 1: Tactile Wooden Blocks Selector */}
        <div className="blocks-column">
          <div className="column-header">
            <span className="col-title">NFC Wood Blocks</span>
            <button 
              onClick={toggleSound} 
              className="sound-toggle-btn"
              title={soundEnabled ? 'Mute wood knock sound FX' : 'Enable wood knock sound FX'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>
          </div>

          <div className="blocks-stack">
            {blockIds.map((id) => {
              const bInfo = catData.blocks[id] || { tag: 'Prompt', text: '' };
              const isActive = id === currentBlockId;
              return (
                <button
                  key={id}
                  onClick={() => handleSelectBlock(id)}
                  className={`wooden-block-btn ${isActive ? 'active' : ''}`}
                >
                  <div className="block-content-row">
                    <div className="block-title-group">
                      <span className="block-nfc-mark">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="18" height="18" rx="4" />
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="block-num">
                        BLOCK #{String(id).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="block-peril-tag">{bInfo.tag}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Smart Dock & High-Contrast OLED Screen */}
        <div className="hardware-dock-column">
          <div className="hardware-chassis">
            {/* NFC Reader Pad with Pulse Ring */}
            <div className="nfc-target-pad">
              <div className={`nfc-glow-ring ${isNfcPulsing ? 'pulsing' : ''}`} />
              <div className="nfc-docked-indicator">
                <span className="pulse-indicator-dot" />
                <span className="indicator-text">
                  Block #{String(currentBlockId).padStart(2, '0')} on Dock
                </span>
              </div>
            </div>

            {/* Smart Panoramic Display */}
            <div className="oled-bezel">
              <div className="oled-display">
                <div className="oled-header-line">
                  <span className="oled-mode">{catData.modeTitle}</span>
                  <span className="oled-ready-state">SUB-80ms NFC</span>
                </div>

                <div className="oled-prompt-stage">
                  <div className="oled-block-id-tag">
                    BLOCK #{String(currentBlockId).padStart(2, '0')} · {blockData.tag.toUpperCase()}
                  </div>
                  <p className="oled-prompt-output">
                    {displayedText}
                  </p>
                </div>

                <div className="oled-footer-line">
                  <span>PANORAMIC IPS DISPLAY</span>
                  <span>READS: {readCount}/45</span>
                </div>
              </div>
            </div>

            {/* Phone Free Trust Banner */}
            <div className="chassis-footer-row">
              <div className="phone-free-guarantee">
                <Smartphone size={15} style={{ opacity: 0.6 }} />
                <span>100% Phone-Free During Play</span>
              </div>
              <div className="dock-sub-tag">
                <span>USB-C RECHARGEABLE · 8H BATTERY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
