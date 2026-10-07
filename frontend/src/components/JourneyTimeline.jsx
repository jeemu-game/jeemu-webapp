import React from 'react';
import { Sparkles, Hammer, Cpu, Rocket, Calendar } from 'lucide-react';
import { JOURNEY_MILESTONES } from '../data/teamData';

const ICONS = {
  Sparkles: <Sparkles size={18} />,
  Hammer: <Hammer size={18} />,
  Cpu: <Cpu size={18} />,
  Rocket: <Rocket size={18} />
};

export default function JourneyTimeline() {
  return (
    <section className="section-container" id="story">
      <div className="section-header">
        <div className="glow-pill">
          <span>Our Story</span>
        </div>
        <h2 className="section-title">We Got Sick of Boring Game Nights.</h2>
        <p className="section-desc">
          Every traditional question tower dies by game three when everyone memorizes block 14. We set out to kill the repetition forever—combining raw tactile physics with infinite digital game modes.
        </p>
      </div>

      <div className="journey-timeline-wrap">
        <div className="timeline-spine" />

        <div className="timeline-items-list">
          {JOURNEY_MILESTONES.map((item, idx) => (
            <div key={idx} className="timeline-item-row">
              {/* Milestone Icon Node */}
              <div className="timeline-node">
                <div className="node-circle">
                  {ICONS[item.icon] || <Sparkles size={18} />}
                </div>
              </div>

              {/* Milestone Card */}
              <div className="spotlight-card timeline-card">
                <div className="timeline-card-header">
                  <div className="timeline-phase-wrap">
                    <span className="timeline-phase-tag">{item.phase}</span>
                    <span className="timeline-badge-pill">{item.badge}</span>
                  </div>
                  <div className="timeline-date-tag">
                    <Calendar size={13} />
                    <span>{item.date}</span>
                  </div>
                </div>

                <h3 className="timeline-title">{item.title}</h3>
                <p className="timeline-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
        <button 
          onClick={() => {
            const el = document.getElementById('reserve-funnel');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }} 
          className="btn-primary" 
          style={{ padding: '12px 24px', fontSize: '1rem' }}
        >
          <span>Join the Journey</span>
          <span style={{ marginLeft: '8px' }}>→</span>
        </button>
      </div>
    </section>
  );
}
