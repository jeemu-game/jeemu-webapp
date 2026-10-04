import React from 'react';
import { Users, Award } from 'lucide-react';
import { TEAM_MEMBERS } from '../data/teamData';

export default function TeamSection() {
  return (
    <section className="section-container" id="team">
      <div className="section-header">
        <div className="glow-pill">
          <span>The Creators</span>
        </div>
        <h2 className="section-title">Built by Tabletop Obsessives</h2>
        <p className="section-desc">
          Meet the industrial designers, firmware architects, and game theorists bringing Jeemu to life.
        </p>
      </div>

      <div className="team-grid">
        {TEAM_MEMBERS.map((member, idx) => (
          <div key={idx} className="spotlight-card team-card">
            <div className="team-card-top">
              <div className="team-avatar-box">
                <span>{member.initials}</span>
              </div>
              <div className="team-member-meta">
                <h3 className="team-member-name">{member.name}</h3>
                <span className="team-member-role">{member.role}</span>
                {member.tagline && <span className="team-member-tagline">{member.tagline}</span>}
              </div>
            </div>

            <p className="team-member-bio">{member.bio}</p>

          </div>
        ))}
      </div>
    </section>
  );
}
