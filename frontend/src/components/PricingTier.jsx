import React from 'react';
import { Check, ShieldCheck, ArrowRight, Sparkles, Tag, Users, PackageCheck } from 'lucide-react';

export default function PricingTier({ onReserveClick }) {
  const scrollToReserve = () => {
    if (onReserveClick) {
      onReserveClick();
    } else {
      const el = document.getElementById('reserve-funnel');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="section-container" id="pricing">
      <div className="section-header">
        <div className="glow-pill">
          <Sparkles size={14} />
          <span>VIP Backer Perks</span>
        </div>
        <h2 className="section-title">Lock in the Lowest Price Before We Launch</h2>
        <p className="section-desc">
          We are finalizing our manufacturing tooling and Kickstarter campaign goals. Reserving your VIP spot with a 100% refundable $1 deposit locks in our steepest early-bird pricing and priority Batch 01 delivery.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Perk 1: Maximum Early Bird Discount */}
        <div className="spotlight-card pricing-card">
          <div className="pillar-icon-box">
            <Tag size={22} />
          </div>

          <div>
            <span className="step-badge">VIP Exclusive</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginTop: '8px' }}>
              Steepest Launch Discount
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              When the Kickstarter drop goes live, VIP holders unlock our lowest pledge tier before public backers.
            </p>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} color="#00d97e" /> <strong>Guaranteed lowest price tier</strong></li>
            <li><Check size={16} color="#00d97e" /> Secret early-bird access link</li>
            <li><Check size={16} color="#00d97e" /> 100% refundable $1 deposit anytime</li>
            <li><Check size={16} color="#00d97e" /> Zero obligations if you change your mind</li>
          </ul>

          <button 
            onClick={scrollToReserve} 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <span>Lock In Discount</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Perk 2: Featured Batch 01 Allocation */}
        <div className="spotlight-card pricing-card featured">
          <div className="pricing-badge-top">
            Priority Founder Allocation
          </div>

          <div className="pillar-icon-box" style={{ background: 'rgba(0, 217, 126, 0.25)' }}>
            <PackageCheck size={24} color="#00d97e" />
          </div>

          <div>
            <span className="step-badge" style={{ background: 'rgba(0, 217, 126, 0.2)', color: '#00d97e' }}>
              Guaranteed Batch 01
            </span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
              Batch 01 Priority Delivery
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Factory run #1 is strictly quantity-capped. VIP backers are allocated to the first production line.
            </p>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} color="#00d97e" /> <strong>Guaranteed Batch 01 shipping</strong></li>
            <li><Check size={16} color="#00d97e" /> <strong>Gold-Stamped Founder Block included</strong></li>
            <li><Check size={16} color="#00d97e" /> Velvet protective travel storage pouch</li>
            <li><Check size={16} color="#00d97e" /> Lifetime free game expansion pack access</li>
          </ul>

          <button 
            onClick={scrollToReserve} 
            className="btn-primary" 
            style={{ width: '100%', marginTop: 'auto', padding: '14px' }}
          >
            <span>Reserve Batch 01 for $1</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Perk 3: Founding Community Circle */}
        <div className="spotlight-card pricing-card">
          <div className="pillar-icon-box">
            <Users size={22} />
          </div>

          <div>
            <span className="step-badge">Co-Creator Access</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginTop: '8px' }}>
              Founding Community Circle
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Help shape the game packs and features before manufacturing tooling is finalized.
            </p>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} color="#00d97e" /> Vote on launch prompt packs</li>
            <li><Check size={16} color="#00d97e" /> Early playtest access for AI companion</li>
            <li><Check size={16} color="#00d97e" /> Direct channel with the engineering team</li>
            <li><Check size={16} color="#00d97e" /> Founder badge in the digital community</li>
          </ul>

          <button 
            onClick={scrollToReserve} 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <span>Join Founders</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
