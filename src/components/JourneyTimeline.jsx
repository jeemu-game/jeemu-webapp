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
        <div className="px-label">HOW IT STARTED</div>
        <h2 className="section-title">Six students in Shanghai.</h2>
        <p className="section-desc">
          We came from all over the world to study business in Shanghai. The assignment was to make a real product. We like games, and we were annoyed at one in particular.
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

    </section>
  );
}
