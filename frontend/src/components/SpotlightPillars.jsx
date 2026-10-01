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
      title: 'Handcrafted Beechwood + NFC',
      desc: '45 solid German beechwood blocks, each with an embedded 13.56MHz micro-transponder. Finished with organic beeswax for the signature buttery slide.',
      meta: '45 Unique Block IDs'
    },
    {
      icon: <Cpu size={24} />,
      title: 'Panoramic IPS Smart Dock',
      desc: 'High-contrast wide curved display reads any docked block in under 80 milliseconds. Features integrated dual-antenna coil and internal 8-hour rechargeable battery.',
      meta: 'Sub-80ms Tag Latency'
    },
    {
      icon: <PhoneOff size={24} />,
      title: '100% Phone-Free During Play',
      desc: 'No apps open during your party. Jeemu acts as an autonomous digital game master so your friends stay fully immersed in physical tabletop chaos.',
      meta: 'Zero Screen Distractions'
    }
  ];

  return (
    <section className="section-container" id="hardware">
      <div className="section-header">
        <div className="glow-pill">
          <span>Physical Meets Digital</span>
        </div>
        <h2 className="section-title">The Three Pillars of Jeemu</h2>
        <p className="section-desc">
          We rebuilt tabletop tumbling from the molecular level. Zero fragile mechanisms, zero phone distraction, infinite game possibilities.
        </p>
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
              <ArrowUpRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
