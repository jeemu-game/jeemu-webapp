import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import AmbientParticles from './components/AmbientParticles';
import HeroCarousel from './components/HeroCarousel';
import MicroFunnel from './components/MicroFunnel';
import HaikeiWaveDivider from './components/HaikeiWaveDivider';
import SpotlightPillars from './components/SpotlightPillars';
import HardwareSimulator from './components/HardwareSimulator';
import AiStudioPreview from './components/AiStudioPreview';
import JourneyTimeline from './components/JourneyTimeline';
import TeamSection from './components/TeamSection';
import PricingTier from './components/PricingTier';
import FaqFooter from './components/FaqFooter';

export default function App() {
  useEffect(() => {
    const host = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    const sub = params.get('subdomain');
    const path = window.location.pathname;

    if (host.startsWith('connect.') || sub === 'connect' || path === '/connect') {
      window.location.replace('/connect.html');
    }
  }, []);

  const scrollToReserve = () => {
    const el = document.getElementById('reserve-funnel');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="jeemu-app">
      {/* Dynamic Animated Ambient Background Movement Particles */}
      <AmbientParticles />

      {/* Dynamic Ambient Background Mesh */}
      <div className="ambient-mesh" aria-hidden="true">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* 1. Sticky Glass Navbar */}
      <Navbar onCtaClick={scrollToReserve} />

      <main>
        {/* 2. Hero Section: Value Prop + Micro-Funnel + Top Media Carousel */}
        <section className="hero-section">
          <div className="hero-grid">
            {/* Left Column: Headline & Micro-Funnel */}
            <div className="hero-content">
              <div className="glow-pill" style={{ alignSelf: 'flex-start' }}>
                <span>Pull a block. Tap it. Say something real</span>
              </div>

              <h1 className="hero-title">
                The Tabletop Game That <span className="gradient-text">Rewrites Its Own Rules.</span>
              </h1>

              <p className="hero-subtitle">
                Jeemu is the classic stacking game you already love, reimagined with endless questions. When you pull a block, Tap any block on the base and discover something new, every single game.
              </p>

              {/* 2-Step Micro-Funnel */}
              <MicroFunnel />
            </div>

            {/* Right Column: Top Media Carousel (Photos & Video) */}
            <div className="hero-carousel-col">
              <HeroCarousel />
            </div>
          </div>
        </section>

        {/* Generative Haikei Wave Divider #1 */}
        <HaikeiWaveDivider variant={1} />

        {/* 3. Three Core Pillars (ReactBits Cursor Spotlight Cards) */}
        <SpotlightPillars />

        {/* The Problem / How It Works Section */}
        <section className="section-container" id="problem-solution">
          <div className="section-header">
            <h2 className="section-title">The Problem</h2>
            <p className="section-desc">
              The tower comes out at every party, with questions printed on the block. By the third game, everyone already knows what's written on block 14.
            </p>
            <p className="section-desc" style={{ fontStyle: 'italic', marginTop: '10px' }}>
              The fun fades because the questions never change.
            </p>
            <h3 className="section-title" style={{ marginTop: '20px', color: 'var(--jade-primary)' }}>Jeemu fixes that.</h3>
          </div>

          <div className="section-header" style={{ marginTop: '60px' }}>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="pillars-grid" style={{ marginTop: '20px' }}>
            <div className="spotlight-card pillar-card">
              <h3 className="pillar-title">1. Pull</h3>
              <p className="pillar-desc">Slide a block from the tower, <em>(carefully!)</em>.</p>
            </div>
            <div className="spotlight-card pillar-card">
              <h3 className="pillar-title">2. Tap</h3>
              <p className="pillar-desc">Place it on the Jeemu base.</p>
            </div>
            <div className="spotlight-card pillar-card">
              <h3 className="pillar-title">3. Play</h3>
              <p className="pillar-desc">A fresh question appears. Answer it, laugh, then stack it on top, and the game goes on!</p>
            </div>
          </div>

          <div className="section-header" style={{ marginTop: '60px' }}>
            <h2 className="section-title">Made for Every Kind of Night</h2>
            <p className="section-desc">
              Swap the mood in seconds with question packs:
            </p>
            <p className="section-desc" style={{ marginTop: '15px', fontWeight: 'bold' }}>
              Party · Date Night · Family · Icebreakers · Deep Talks · Education
            </p>
            <p className="section-desc" style={{ marginTop: '15px', fontStyle: 'italic' }}>
              One tower. Endless games.
            </p>
          </div>

          <div className="distinct-cta-card" style={{
            marginTop: '40px',
            background: 'rgba(0, 217, 126, 0.05)',
            border: '1px solid var(--jade-primary)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <h3 className="pillar-title" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Be first to the table.</h3>
            <p className="pillar-desc" style={{ marginBottom: '20px' }}>
              Jeemu is launching soon on Kickstarter. Join the list for early-bird pricing and first access.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input type="email" placeholder="Email field" style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                minWidth: '250px'
              }} />
              <button className="btn-primary" style={{ padding: '12px 24px' }}>
                Notify Me
              </button>
            </div>
          </div>
        </section>

        {/* Generative Haikei Wave Divider #2 */}
        <HaikeiWaveDivider variant={2} />

        {/* 4. Tactile Wooden Block Tapping Console as in jeemu.fun */}
        <HardwareSimulator />

        {/* 5. AI-Assisted Game Studio */}
        <AiStudioPreview />

        {/* Generative Haikei Wave Divider #3 */}
        <HaikeiWaveDivider variant={3} />

        {/* 6. Hardware Story & Evolution Timeline */}
        <JourneyTimeline />

        {/* 7. The Creators & Founding Team */}
        <TeamSection />

        {/* 8. Transparent Kickstarter Pricing & VIP Guarantee */}
        <PricingTier onReserveClick={scrollToReserve} />

        {/* 9. FAQ & Clean Footer */}
        <FaqFooter />
      </main>
    </div>
  );
}
