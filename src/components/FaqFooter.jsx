import React, { useState } from 'react';
import { ChevronDown, Flame } from 'lucide-react';

export default function FaqFooter() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'Do I need my phone out while playing?',
      a: 'Absolutely not. You use the mobile app for 10 seconds before the game starts to select or generate your game theme via AI. Once synced over Bluetooth, you lock your phone and put it away. The Jeemu Smart Dock acts as your complete standalone Game Master.'
    },
    {
      q: 'How long does the smart dock battery last?',
      a: 'The internal rechargeable lithium-ion battery provides over 8 hours of continuous playtime on a single charge via standard USB-C. You can take it to parks, cafes, friend\'s apartments, or parties without needing a wall outlet.'
    },
    {
      q: 'What is the $1 VIP deposit and is it refundable?',
      a: 'Yes, your $1 deposit is 100% refundable at any time prior to shipping if you change your mind. Reserving as a VIP guarantees you the maximum 45% discount ($89 vs $159 retail), priority Batch 01 allocation, and the exclusive Gold-Stamped Founder\'s Block.'
    },
    {
      q: 'Will the blocks break when the tower crashes?',
      a: 'No. The blocks are precision-milled from dense European beechwood and hand-finished with organic double-sanded beeswax. The internal 13.56MHz NFC micro-transponders are encapsulated in high-impact shock-absorbent resin capable of withstanding thousands of violent tower collapses.'
    },
    {
      q: 'Can I create my own games without AI?',
      a: 'Yes! The companion app includes a full visual game editor where you can handcraft custom prompts, dares, drinking rules, math questions, or trivia for all 45 individual blocks and save them to your personal library or share them to the community marketplace.'
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

      {/* Clean Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.15rem' }}>
            <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
              <Flame size={15} color="#fff" />
            </div>
            <span>JEEMU</span>
          </div>

          <p className="footer-legal">
            © {new Date().getFullYear()} Jeemu Inc. All rights reserved. Jeemu is an independent physical-digital tabletop console. Kickstarter is a trademark of Kickstarter, PBC. Early bird pricing and specifications subject to final production certification.
          </p>
        </div>
      </footer>
    </>
  );
}
