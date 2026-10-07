import React, { useState } from 'react';
import { ArrowDown, Sparkles, Flame, Users, Heart, Brain, PartyPopper } from 'lucide-react';

export default function ProblemSteps() {
  const [activePackIndex, setActivePackIndex] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Pull',
      subtitle: 'Slide a block from the tower (carefully!).',
      desc: 'Precision-milled wood with a buttery slide. The tower teeters, the tension builds.',
      badge: 'Physical'
    },
    {
      num: '02',
      title: 'Tap',
      subtitle: 'Place it on the smart Jeemu base.',
      desc: 'Instant detection. The dock wakes up with responsive light and tactile haptics.',
      badge: 'Instant Response'
    },
    {
      num: '03',
      title: 'Play',
      subtitle: 'A fresh prompt appears on your screen.',
      desc: 'Answer it, laugh, stack it on top, and pass the turn. The game never repeats.',
      badge: 'Endless Prompts'
    }
  ];

  const packs = [
    {
      id: 'party',
      name: 'Drinking & Party',
      vibe: 'Unhinged, high-stakes party chaos with partner drink penalties, secret table rules, and dare waterfalls that escalate as the tower grows taller.',
      samplePrompt: 'Social Roulette: All players vote on who has the worst screen time today. Most votes takes 3 sips.',
      players: '3–8 Players',
      occasion: 'Late-Night Gatherings',
      intensity: 'High Energy'
    },
    {
      id: 'icebreakers',
      name: 'Icebreakers & Social',
      vibe: 'Skip the boring small talk. Spark unexpected childhood confessions, nostalgic debates, and genuinely hilarious truths that bring strangers together.',
      samplePrompt: 'Declare your most controversial pop culture opinion. Defend it for 30 seconds!',
      players: '2–10 Players',
      occasion: 'Dinner Parties & Friends',
      intensity: 'Warm & Funny'
    },
    {
      id: 'datenight',
      name: 'Spicy Date Night',
      vibe: 'Close quarters, playful tension, and honest flirtation designed to turn an ordinary night into an electric, intimate connection.',
      samplePrompt: 'Whisper your partner\'s most attractive everyday habit in their ear, or drink 2 sips.',
      players: '2 Players',
      occasion: 'Couples Night In',
      intensity: 'Playful & Romantic'
    },
    {
      id: 'dorm',
      name: 'College Dorm Chaos',
      vibe: 'Rowdy floor tournaments, ridiculous physical handicaps, and high-stakes pizza wagers when the entire apartment gathers around the table.',
      samplePrompt: 'Non-dominant elbow pull only. If the tower drops, you buy the late-night pizza.',
      players: '4–12 Players',
      occasion: 'Dorm Rooms & Lounges',
      intensity: 'Pure Hype'
    },
    {
      id: 'trivia',
      name: 'Brain Teasers & Trivia',
      vibe: 'Fast-paced logic puzzles, rapid-fire trivia, and mental math under intense physical pressure. Think fast before your hands start shaking.',
      samplePrompt: 'Quick Math: What is 7 × 8 minus 14? You have 10 seconds to shout it!',
      players: 'Any Group',
      occasion: 'Family & Trivia Buffs',
      intensity: 'Brain & Reflexes'
    }
  ];

  const currentPack = packs[activePackIndex];

  return (
    <section className="section-container" id="how-it-works">
      {/* The Problem Callout */}
      <div className="problem-highlight-box">
        <div className="problem-badge">
          <span>THE PROBLEM</span>
        </div>
        <h2 className="problem-title">
          The tower comes out at every party. <br />
          <span className="text-secondary">By the third game, everyone knows what's on block 14.</span>
        </h2>
        <p className="problem-desc">
          The fun fades because the questions never change. <strong>Jeemu fixes that.</strong>
        </p>
      </div>

      {/* The 3 Steps */}
      <div className="steps-header">
        <div className="glow-pill">
          <span>How It Works</span>
        </div>
        <h3 className="section-title">Three Steps to Endless Play</h3>
      </div>

      <div className="steps-grid">
        {steps.map((s, idx) => (
          <div key={idx} className="step-card">
            <div className="step-card-top">
              <span className="step-number">{s.num}</span>
              <span className="step-badge">{s.badge}</span>
            </div>
            <h4 className="step-title">{s.title}</h4>
            <p className="step-subtitle">{s.subtitle}</p>
            <p className="step-desc">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Made for Every Kind of Night: Detailed Showcase */}
      <div className="experience-packs-showcase">
        <div className="packs-showcase-header">
          <div className="glow-pill">
            <Sparkles size={14} />
            <span>Digital Game Packs</span>
          </div>
          <h3 className="packs-showcase-title">Made for Every Kind of Night</h3>
          <p className="packs-showcase-sub">
            Swap the mood in seconds. One physical tower connects to endlessly expanding digital themes.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="packs-tabs-row">
          {packs.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActivePackIndex(i)}
              className={`pack-tab-btn ${i === activePackIndex ? 'active' : ''}`}
            >
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Active Pack Detailed Card */}
        <div className="pack-detail-card">
          <div className="pack-detail-meta-row">
            <span className="pack-meta-pill">{currentPack.players}</span>
            <span className="pack-meta-pill">{currentPack.occasion}</span>
            <span className="pack-meta-pill intensity-pill">{currentPack.intensity}</span>
          </div>

          <h4 className="pack-detail-name">{currentPack.name}</h4>
          <p className="pack-detail-vibe">{currentPack.vibe}</p>

          <div className="pack-sample-quote">
            <span className="sample-label">Sample Prompt on Dock:</span>
            <p className="sample-prompt-text">"{currentPack.samplePrompt}"</p>
          </div>

          <div className="pack-card-footer">
            <span>One tower. Endless games.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
