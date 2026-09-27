import React from 'react';
import Navbar from './components/Navbar';
import HeroCarousel from './components/HeroCarousel';
import MicroFunnel from './components/MicroFunnel';
import SpotlightPillars from './components/SpotlightPillars';
import ExperiencePacks from './components/ExperiencePacks';
import AiStudioPreview from './components/AiStudioPreview';
import PricingTier from './components/PricingTier';
import FaqFooter from './components/FaqFooter';

export default function App() {
  const scrollToReserve = () => {
    const el = document.getElementById('reserve-funnel');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="jeemu-app">
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

        {/* 3. Three Core Pillars (ReactBits Cursor Spotlight Cards) */}
        <SpotlightPillars />

        {/* 4. 7 Official Experience Categories */}
        <ExperiencePacks />

        {/* 5. AI-Assisted Game Studio */}
        <AiStudioPreview />

        {/* 6. Transparent Kickstarter Pricing & VIP Guarantee */}
        <PricingTier onReserveClick={scrollToReserve} />

        {/* 7. FAQ & Clean Footer */}
        <FaqFooter />
      </main>
    </div>
  );
}
