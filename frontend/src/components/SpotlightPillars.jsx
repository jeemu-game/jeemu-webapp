import React from 'react';
import { Sparkles, HeartHandshake, Eye, Flame } from 'lucide-react';

export default function SpotlightPillars() {
  const storyPillars = [
    {
      icon: <Flame size={24} />,
      badge: 'Tactile Soul',
      title: 'The Weight of Every Breath',
      desc: 'There is no substitute for real physical tension. The satisfying friction of solid wood sliding between trembling fingers, the collective hush falling over the room, and the explosive roar of relief when the tower teeters—and somehow survives.'
    },
    {
      icon: <Sparkles size={24} />,
      badge: 'Unscripted Chaos',
      title: 'A Spark That Catches Fire',
      desc: 'You do not just pull a block to stack it—you pull it to unlock the room. Every placement wakes the table with an unexpected prompt, confession, or dare that catches everyone off guard. No two rounds ever repeat.'
    },
    {
      icon: <Eye size={24} />,
      badge: 'Pure Presence',
      title: 'Phones Put Away. The Room Comes Alive.',
      desc: 'We built Jeemu to reclaim the lost magic of getting completely lost in the moment. No glowing phone screens, no notifications stealing your friends away. Just a circle of people holding their breath and laughing until it hurts.'
    }
  ];

  return (
    <section className="section-container" id="story-pillars">
      <div className="section-header">
        <div className="glow-pill">
          <Sparkles size={14} />
          <span>The Experience</span>
        </div>
        <h2 className="section-title">A Living Game at the Center of the Table</h2>
        <p className="section-desc">
          We did not build another gadget. We built a reason for people to gather, forget about their phones, and say things they will remember for years.
        </p>
      </div>

      <div className="pillars-grid">
        {storyPillars.map((pillar, idx) => (
          <div key={idx} className="spotlight-card pillar-card story-pillar-card">
            <div className="pillar-icon-box">
              {pillar.icon}
            </div>
            <span className="step-badge">{pillar.badge}</span>
            <h3 className="pillar-title">{pillar.title}</h3>
            <p className="pillar-desc">{pillar.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
