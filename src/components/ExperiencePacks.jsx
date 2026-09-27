import React, { useState } from 'react';
import { Beer, Sparkles, Dumbbell, Brain, Briefcase, HeartHandshake, Coffee, Play, BatteryCharging } from 'lucide-react';
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

  const activePack = EXPERIENCE_PACKS.find(p => p.id === activePackId) || EXPERIENCE_PACKS[0];

  return (
    <section className="section-container" id="experiences">
      <div className="section-header">
        <div className="glow-pill">
          <span>7 Launch Experiences</span>
        </div>
        <h2 className="section-title">One Hardware Tower. Seven Game Modes.</h2>
        <p className="section-desc">
          Because the 45 blocks are reprogrammable NFC triggers, the exact same physical tower transforms from a spicy drinking game to a kid-friendly math challenge in seconds.
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
            <span className="glow-pill" style={{ alignSelf: 'flex-start' }}>{activePack.tag}</span>
            <h3 className="pack-name-headline">{activePack.name}</h3>
            <p className="section-desc" style={{ color: 'var(--text-muted)' }}>
              {activePack.summary}
            </p>

            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-faint)' }}>
              <span>✓ Pre-loaded firmware preset</span>
              <span>✓ Custom rule modifications allowed</span>
            </div>
          </div>

          {/* Interactive Hardware Dock Screen Simulator */}
          <div className="dock-simulator-wrap">
            <div className="dock-physical-body">
              {/* Recessed block slot */}
              <div className="dock-top-recess" />

              {/* Panoramic IPS Screen */}
              <div className="dock-ips-screen">
                <div className="dock-screen-top">
                  <span>BLOCK #{activePack.samplePrompt.blockNum} DOCKED</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BatteryCharging size={12} />
                    <span>88%</span>
                  </div>
                </div>

                <div className="dock-screen-action">
                  "{activePack.samplePrompt.action}"
                </div>

                <div className="dock-screen-bottom">
                  <span>TAG: {activePack.samplePrompt.title}</span>
                  <span style={{ color: activePack.samplePrompt.dockColor, fontWeight: 700 }}>
                    {activePack.samplePrompt.penalty}
                  </span>
                </div>
              </div>
            </div>

            {/* Ambient LED underglow bar */}
            <div 
              className="dock-ambient-glow-bar" 
              style={{ background: activePack.samplePrompt.dockColor, boxShadow: `0 0 25px ${activePack.samplePrompt.dockColor}` }} 
            />
          </div>
        </div>
      </div>
    </section>
  );
}
