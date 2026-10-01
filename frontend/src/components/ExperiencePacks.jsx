import React, { useState } from 'react';
import { Beer, Sparkles, Dumbbell, Brain, Briefcase, HeartHandshake, Coffee, BatteryCharging, Radio, Volume2 } from 'lucide-react';
import { EXPERIENCE_PACKS } from '../data/experiencePacks';

const ICON_MAP = {
  Beer: <Beer size={16} />,
  Sparkles: <Sparkles size={16} />,
  Dumbbell: <Dumbbell size={16} />,
  Brain: <Brain size={16} />,
  Briefcase: <Briefcase size={16} />,
  HeartHandshake: <HeartHandshake size={16} />,
  Coffee: <Coffee size={16} />
};

export default function ExperiencePacks() {
  const [activePackId, setActivePackId] = useState(EXPERIENCE_PACKS[0].id);
  const [activeBlockNum, setActiveBlockNum] = useState(14);
  const [isNfcPulsing, setIsNfcPulsing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activePack = EXPERIENCE_PACKS.find(p => p.id === activePackId) || EXPERIENCE_PACKS[0];
  const activePrompt = activePack.blocks[activeBlockNum] || activePack.blocks[14] || { tag: 'Prompt', text: 'Pull a block cleanly.', penalty: 'None' };

  const blockNumbers = [7, 14, 23, 36, 45];

  // Synthesize tactile wooden block knock sound using Web Audio API
  const playKnockAudio = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (_) {}
  };

  const handleTapBlock = (num) => {
    setActiveBlockNum(num);
    setIsNfcPulsing(true);
    playKnockAudio();
    setTimeout(() => setIsNfcPulsing(false), 600);
  };

  return (
    <section className="section-container" id="experiences">
      <div className="section-header">
        <div className="glow-pill">
          <span>7 Launch Experiences</span>
        </div>
        <h2 className="section-title">One Hardware Tower. Seven Game Modes.</h2>
        <p className="section-desc">
          Tap any wooden block below onto the NFC reader to experience how Jeemu transforms the exact same physical beechwood into endless game rules.
        </p>
      </div>

      <div className="packs-stage-box">
        {/* Horizontal Category Switcher */}
        <div className="packs-tabs-scroll">
          {EXPERIENCE_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setActivePackId(pack.id)}
              className={`pack-tab-btn ${pack.id === activePackId ? 'active' : ''}`}
            >
              {ICON_MAP[pack.icon]}
              <span>{pack.name}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Display Stage */}
        <div className="pack-preview-grid">
          <div className="pack-info-col">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="glow-pill">{activePack.tag}</span>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}
                title="Toggle wooden knock sound"
              >
                <Volume2 size={13} color={soundEnabled ? '#00d97e' : '#546b62'} />
                <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
              </button>
            </div>

            <h3 className="pack-name-headline">{activePack.name}</h3>
            <p className="section-desc" style={{ color: 'var(--text-muted)' }}>
              {activePack.summary}
            </p>

            {/* FANCY TACTILE WOODEN BLOCK TAPPER */}
            <div className="block-tapper-wrapper">
              <span className="block-tapper-label">
                👉 TAP A PHYSICAL BEECHWOOD BLOCK ONTO THE DOCK:
              </span>

              <div className="wooden-blocks-row">
                {blockNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleTapBlock(num)}
                    className={`wooden-block-btn ${num === activeBlockNum ? 'active' : ''}`}
                  >
                    <div className="block-wood-grain" />
                    <span className="block-nfc-icon">((•))</span>
                    <span className="block-num-text">#{String(num).padStart(2, '0')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-faint)' }}>
              <span>✓ Instant sub-80ms read</span>
              <span>✓ Standalone 8-hour battery</span>
            </div>
          </div>

          {/* Interactive Hardware Dock Screen Simulator */}
          <div className="dock-simulator-wrap">
            <div className="dock-physical-body">
              {/* Recessed block slot with animated green NFC pulse ring */}
              <div className="dock-top-recess">
                <div className={`nfc-glow-ring ${isNfcPulsing ? 'pulsing' : ''}`} />
              </div>

              {/* Panoramic IPS Screen */}
              <div className="dock-ips-screen">
                <div className="dock-screen-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={12} color="#00d97e" />
                    <span>NFC DOCKED: BLOCK #{String(activeBlockNum).padStart(2, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BatteryCharging size={12} />
                    <span>88%</span>
                  </div>
                </div>

                <div className="dock-screen-action">
                  "{activePrompt.text}"
                </div>

                <div className="dock-screen-bottom">
                  <span>TAG: {activePrompt.tag}</span>
                  <span style={{ color: '#00d97e', fontWeight: 700 }}>
                    {activePrompt.penalty}
                  </span>
                </div>
              </div>
            </div>

            {/* Ambient LED underglow bar */}
            <div 
              className="dock-ambient-glow-bar" 
              style={{ background: '#00d97e', boxShadow: '0 0 25px rgba(0, 217, 126, 0.45)' }} 
            />
          </div>
        </div>
      </div>
    </section>
  );
}
