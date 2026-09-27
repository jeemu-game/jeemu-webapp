import React from 'react';
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
                <span>Smart Beechwood Tumbling Tower</span>
              </div>

              <h1 className="hero-title">
                The Tabletop Game That <span className="gradient-text">Rewrites Its Own Rules.</span>
              </h1>

              <p className="hero-subtitle">
                45 NFC-embedded hardwood blocks meet a standalone smart dock with a panoramic IPS display. 
                Customize unlimited party games with AI — 100% phone-free during play.
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
