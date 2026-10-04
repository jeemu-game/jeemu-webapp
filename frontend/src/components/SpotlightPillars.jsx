import React, { useRef } from 'react';
import { Layers, Cpu, PhoneOff, ArrowUpRight } from 'lucide-react';

export default function SpotlightPillars() {
  const cardsRef = useRef([]);

  const handleMouseMove = (e, index) => {
    const card = cardsRef.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const pillars = [
    {
      icon: <Layers size={24} />,
      title: 'Wood + NFC',
      desc: '45 wood blocks, each with embedded NFC technology. Polished for a buttery slide.',
      meta: '45 Unique Block IDs'
    },
    {
      icon: <Cpu size={24} />,
      title: 'Panoramic IPS Smart Dock',
      desc: 'High contrast display reads the blocks in seconds and displays the questions. Charged with USB-C',
      meta: 'Sub-80ms Tag Latency'
    },
    {
      icon: <PhoneOff size={24} />,
      title: '100% Phone-Free During Play',
      desc: 'No apps during the gameplay. Stay fuller immersed in the tabletop chaos.',
      meta: 'Endless Questions'
    }
  ];

  return (
    <section className="section-container" id="hardware">
      <div className="section-header">
        <div className="glow-pill">
          <span>Physical Meets Digital</span>
        </div>
        <h2 className="section-title">The Three Pillars of Jeemu</h2>
      </div>

      <div className="pillars-grid">
        {pillars.map((pillar, idx) => (
          <div
            key={idx}
            ref={(el) => (cardsRef.current[idx] = el)}
            onMouseMove={(e) => handleMouseMove(e, idx)}
            className="spotlight-card pillar-card"
          >
            <div className="pillar-icon-box">
              {pillar.icon}
            </div>
            <h3 className="pillar-title">{pillar.title}</h3>
            <p className="pillar-desc">{pillar.desc}</p>
            <div className="pillar-meta-tag">
              <span>{pillar.meta}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
