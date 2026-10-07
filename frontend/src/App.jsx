import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemSteps from './components/ProblemSteps';
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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = document.getElementById('subscriber-email');
      if (input) input.focus();
    }
  };

  return (
    <div className="jeemu-app">
      {/* Subtle organic texture */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* 1. Responsive Sticky Navbar */}
      <Navbar onCtaClick={scrollToReserve} />

      <main>
        {/* 2. Hero: Split-Screen Asymmetric Layout */}
        <HeroSection />

        {/* 3. The Problem & How It Works (3 Steps to Endless Play) */}
        <ProblemSteps />

        {/* 4. Three Pillars of Hardware Craft */}
        <SpotlightPillars />

        {/* 5. Streamlined Mobile-First Interactive Dock Demo */}
        <HardwareSimulator />

        {/* 6. AI-Assisted Game Studio Companion */}
        <AiStudioPreview />

        {/* 7. Hardware Story & Evolution Timeline */}
        <JourneyTimeline />

        {/* 8. The Creators & Founding Team */}
        <TeamSection />

        {/* 9. Transparent Kickstarter Pricing & VIP Guarantee */}
        <PricingTier onReserveClick={scrollToReserve} />

        {/* 10. FAQ & Clean Footer */}
        <FaqFooter />
      </main>
    </div>
  );
}
