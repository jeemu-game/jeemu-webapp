import React, { useState } from 'react';
import { ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react';

export default function FaqFooter() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'Do I need my phone out while playing?',
      a: 'Absolutely not. You use the companion app for 10 seconds before the game starts to select your theme pack. Once synced via Bluetooth, you lock your phone and put it away. The Jeemu Smart Dock acts as your complete standalone Game Master.'
    },
    {
      q: 'How long does the smart dock battery last?',
      a: 'The internal rechargeable battery provides over 8 hours of continuous playtime on a single charge via standard USB-C. You can take it to parks, cafes, friend\'s apartments, or parties without needing a wall outlet.'
    },
    {
      q: 'What is the $1 VIP deposit and is it refundable?',
      a: 'Yes, your $1 deposit is 100% refundable at any time prior to campaign shipping if you change your mind. Reserving as a VIP guarantees you our lowest early-bird launch pricing, priority Batch 01 allocation, and the exclusive Gold-Stamped Founder Block.'
    },
    {
      q: 'Will the blocks break when the tower crashes?',
      a: 'No. The blocks are precision-milled from durable solid wood and polished for a buttery slide. The internal NFC micro-transponders are encapsulated in high-impact shock-absorbent resin capable of withstanding thousands of violent tower collapses.'
    },
    {
      q: 'Can I create my own games without AI?',
      a: 'Yes! The companion app includes a full visual game editor where you can handcraft custom prompts, dares, drinking rules, math questions, or trivia for all 45 individual blocks and save them to your personal library or share them to the community.'
    }
  ];

  return (
    <>
      <section className="section-container" id="faq">
        <div className="section-header">
          <div className="glow-pill">
            <span>Got Questions?</span>
          </div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-desc">
            Everything you need to know about the hardware, gameplay mechanics, and VIP reservation.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="faq-item">
                <button 
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="faq-trigger"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                      transition: 'transform 200ms ease',
                      flexShrink: 0
                    }} 
                  />
                </button>
                {isOpen && (
                  <div className="faq-content">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Premium Clean Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-top-row">
            <div className="footer-brand-column">
              <a href="#" className="footer-logo-link" aria-label="Jeemu Home">
                <img 
                  src="/brand/logos/jeemu-logo-horizontal-dark-bg.svg" 
                  alt="Jeemu" 
                  className="footer-brand-logo" 
                />
              </a>
              <p className="footer-brand-desc">
                The classic stacking game reimagined with endless questions. Pure physical tension, unscripted human connection, zero phones at the table.
              </p>
              <div className="footer-trust-pill">
                <ShieldCheck size={14} color="#00d97e" />
                <span>100% Refundable $1 VIP Reservation</span>
              </div>
            </div>

            <div className="footer-nav-grid">
              <div className="footer-nav-col">
                <span className="footer-col-title">The Game</span>
                <a href="#how-it-works">How It Works</a>
                <a href="#simulator">Interactive Dock</a>
                <a href="#story-pillars">The Experience</a>
                <a href="#pricing">VIP Perks</a>
              </div>

              <div className="footer-nav-col">
                <span className="footer-col-title">Our Story</span>
                <a href="#story">Behind the Scenes</a>
                <a href="#team">The Creators</a>
                <a href="#faq">Frequently Asked</a>
              </div>

              <div className="footer-nav-col">
                <span className="footer-col-title">Founding Backers</span>
                <a href="#reserve-funnel">Reserve Batch 01</a>
                <a href="#pricing">Launch Guarantees</a>
                <a href="mailto:team@jeemu.fun">Contact Team</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p className="footer-legal-text">
              © {new Date().getFullYear()} Jeemu Inc. All rights reserved. Kickstarter is a trademark of Kickstarter, PBC.
            </p>
            <div className="footer-bottom-links">
              <a href="#reserve-funnel">Join Waitlist</a>
              <span>•</span>
              <a href="#pricing">VIP Guarantee</a>
              <span>•</span>
              <a href="#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
