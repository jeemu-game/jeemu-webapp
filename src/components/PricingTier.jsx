import React from 'react';
import { Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

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
          <span>Kickstarter Early Bird Access</span>
        </div>
        <h2 className="section-title">Transparent Launch Pricing</h2>
        <p className="section-desc">
          Lock in your 45% discount today with a 100% refundable $1 reservation. No hidden fees, cancel anytime before shipping.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Tier 1: Retail Future */}
        <div className="spotlight-card pricing-card">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Retail Launch</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Post-Kickstarter MSRP</p>
          </div>

          <div className="pricing-price-wrap">
            <span className="price-val">$159</span>
            <span className="price-sub">USD</span>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} /> 45 Beechwood NFC Blocks</li>
            <li><Check size={16} /> Panoramic IPS Smart Dock</li>
            <li><Check size={16} /> Standard Packaging</li>
            <li style={{ opacity: 0.5 }}>✕ Batch 01 Priority</li>
            <li style={{ opacity: 0.5 }}>✕ Gold Founder's Block</li>
          </ul>

          <button 
            disabled 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: 'auto', opacity: 0.5, cursor: 'not-allowed' }}
          >
            Available 2027
          </button>
        </div>

        {/* Tier 2: VIP Early Bird (Featured) */}
        <div className="spotlight-card pricing-card featured">
          <div className="pricing-badge-top">
            ★ Most Popular • Save 45%
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>VIP Backer Tier</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--amber-500)' }}>$1 Refundable Deposit</p>
          </div>

          <div className="pricing-price-wrap">
            <span className="price-val" style={{ color: 'var(--amber-500)' }}>$89</span>
            <span className="price-sub" style={{ textDecoration: 'line-through', color: 'var(--text-faint)' }}>$159</span>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} /> <strong>45 Beechwood NFC Blocks</strong></li>
            <li><Check size={16} /> <strong>Panoramic IPS Smart Dock</strong></li>
            <li><Check size={16} /> <strong>Guaranteed Batch 01 Shipping</strong></li>
            <li><Check size={16} /> <strong>Gold-Stamped Founder Block #01</strong></li>
            <li><Check size={16} /> Lifetime Free Game Pack Access</li>
            <li><Check size={16} /> Velvet Travel Storage Pouch</li>
          </ul>

          <button 
            onClick={scrollToReserve} 
            className="btn-primary" 
            style={{ width: '100%', marginTop: 'auto', padding: '16px' }}
          >
            <span>Reserve for $1 Deposit</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Tier 3: Kickstarter Standard */}
        <div className="spotlight-card pricing-card">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Kickstarter Public</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Without $1 VIP reservation</p>
          </div>

          <div className="pricing-price-wrap">
            <span className="price-val">$99</span>
            <span className="price-sub" style={{ textDecoration: 'line-through', color: 'var(--text-faint)' }}>$159</span>
          </div>

          <ul className="pricing-features-list">
            <li><Check size={16} /> 45 Beechwood NFC Blocks</li>
            <li><Check size={16} /> Panoramic IPS Smart Dock</li>
            <li><Check size={16} /> Batch 02 Fulfillment</li>
            <li style={{ opacity: 0.5 }}>✕ Gold Founder's Block</li>
            <li><Check size={16} /> Standard Packaging</li>
          </ul>

          <button 
            onClick={scrollToReserve} 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: 'auto' }}
          >
            Wait for Campaign
          </button>
        </div>
      </div>
    </section>
  );
}
