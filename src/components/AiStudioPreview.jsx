import React, { useState } from 'react';
import { Wand2, Bluetooth, CheckCircle2, Sparkles, Terminal } from 'lucide-react';

export default function AiStudioPreview() {
  const [selectedTheme, setSelectedTheme] = useState('Spicy Date Night');

  const presets = [
    'Spicy Date Night',
    'Tech Startup Retro',
    'College Dorm Chaos',
    'D&D Dungeon Crawl'
  ];

  const generatedDemos = {
    'Spicy Date Night': [
      { id: 1, prompt: 'Whisper your partner\'s most attractive habit in their ear, or drink 2 sips.' },
      { id: 2, prompt: 'Reenact the moment you first realized you had feelings for them.' },
      { id: 3, prompt: 'Give your partner a 60-second shoulder massage without speaking.' }
    ],
    'Tech Startup Retro': [
      { id: 1, prompt: 'Describe the worst code deploy of your career in 3 words.' },
      { id: 2, prompt: 'Give a 30-second elevator pitch for an obviously doomed AI startup.' },
      { id: 3, prompt: 'Tag-team block pull: you and your pair programmer pull simultaneously.' }
    ],
    'College Dorm Chaos': [
      { id: 1, prompt: 'Call your most recent food delivery driver and thank them for changing your life.' },
      { id: 2, prompt: 'Non-dominant elbow pull only. If it drops, you finish your cup.' },
      { id: 3, prompt: 'Switch seats with the person directly across from you.' }
    ],
    'D&D Dungeon Crawl': [
      { id: 1, prompt: 'Perception check: Roll d20. On 10+, choose an easy block from tier 1.' },
      { id: 2, prompt: 'Trap triggered! You cannot speak for the next 2 rounds of pulls.' },
      { id: 3, prompt: 'Boss encounter: The next 3 blocks must all be pulled from level 10+.' }
    ]
  };

  const currentPrompts = generatedDemos[selectedTheme] || generatedDemos['Spicy Date Night'];

  return (
    <section className="section-container" id="ai-studio">
      <div className="ai-studio-card">
        <div className="ai-info-side">
          <div className="glow-pill" style={{ marginBottom: '14px' }}>
            <Sparkles size={14} />
            <span>AI Game Engine</span>
          </div>
          <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '14px' }}>
            Generate Custom Games in 8 Seconds.
          </h2>
          <p className="section-desc" style={{ textAlign: 'left', marginBottom: '24px' }}>
            With the Jeemu mobile companion, type any theme to create 45 custom block challenges, sync once via Bluetooth, and put your phone away.
          </p>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Try a theme preset:
            </span>
            <div className="ai-preset-chips">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedTheme(p)}
                  className={`chip-btn ${p === selectedTheme ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Output Terminal Box */}
        <div className="ai-generation-box">
          <div className="ai-terminal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} color="#00d97e" />
              <span>JEEMU AI COMPANION ENGINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00d97e' }}>
              <Bluetooth size={13} />
              <span>Dock Synced</span>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--jade-primary)', fontFamily: 'var(--font-mono)' }}>
            &gt; Prompt: "{selectedTheme}" (45 blocks generated)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentPrompts.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '8px', 
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--jade-primary)', fontWeight: 700, marginTop: '2px' }}>
                  #{item.id}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {item.prompt}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
