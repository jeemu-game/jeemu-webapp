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
    <section className="section-container" id="journey">
      <div className="section-header">
        <div className="glow-pill">
          <span>Our Story</span>
        </div>
        <h2 className="section-title">Built in Shanghai, one September at a time.</h2>
        <p className="section-desc">
          We're a team of business students from around the world who landed in Shanghai with one assignment: build a real product and bring it to life. Our love for games gave us a starting point. A frustration gave us a mission.
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
        <button className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
          <span>Join the Journey</span>
          <span style={{ marginLeft: '8px' }}>→</span>
        </button>
      </div>
    </section>
  );
}
