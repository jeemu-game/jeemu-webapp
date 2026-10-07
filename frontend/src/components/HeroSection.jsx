import React from 'react';
import HeroCarousel from './HeroCarousel';
import MicroFunnel from './MicroFunnel';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="hero-split-section" id="hero">
      <div className="hero-split-grid">
        {/* Left Column: Asymmetric Hook, Value Prop, and Waitlist Intake */}
        <div className="hero-copy-col">
          <div className="glow-pill hero-status-pill">
            <span className="pulse-beacon" />
            <span>Kickstarter Drop Q4 2026 • VIP Early Bird</span>
          </div>

          <h1 className="hero-title">
            Pull a block. <br />
            Tap it. <br />
            <span className="gradient-text">Say something real.</span>
          </h1>

          <p className="hero-subtitle">
            Jeemu is the classic stacking game you already love, reimagined with endless questions.
            Tap any block on the base and discover something new, every single game.
          </p>

          {/* Micro-Funnel Intake Card */}
          <div className="hero-funnel-wrapper">
            <MicroFunnel />
          </div>

          {/* Trust Guarantees */}
          <div className="hero-trust-row">
            <span className="trust-item">
              <ShieldCheck size={14} className="trust-icon" />
              <span>100% Refundable $1 Deposit</span>
            </span>
            <span className="trust-dot">•</span>
            <span className="trust-item">
              <span>Lowest Launch Price Guaranteed</span>
            </span>
            <span className="trust-dot">•</span>
            <span className="trust-item">
              <span>100% Phone-Free During Play</span>
            </span>
          </div>
        </div>

        {/* Right Column: High-Impact Photography Carousel */}
        <div className="hero-media-col">
          <div className="hero-media-frame">
            <HeroCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}
