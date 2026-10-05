import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export default function Navbar({ onCtaClick }) {
  const [backerCount, setBackerCount] = useState(1848);

  useEffect(() => {
    fetch('/api/waitlist/count')
      .then(res => res.json())
      .then(data => {
        if (data && data.count) {
          setBackerCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handleCta = (e) => {
    e.preventDefault();
    if (onCtaClick) {
      onCtaClick();
    } else {
      const el = document.getElementById('reserve-funnel');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="site-navbar">
      <div className="navbar-container">
        <a href="#" className="nav-brand" aria-label="Jeemu Home">
          <img src="/brand/logos/jeemu-logo-horizontal.svg" alt="Jeemu" className="brand-logo" height="36" />
        </a>

        {/* Navigation links matching jeemu.fun */}
        <nav className="nav-links" aria-label="Main Navigation">
          <a href="#reserve-funnel" className="nav-link">Reservation</a>
          <a href="#simulator" className="nav-link">Interactive Dock</a>
          <a href="#story" className="nav-link">Our Story</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </nav>

        <div className="nav-center-stats">
          <div className="live-counter-pill">
            <span className="pulse-beacon" />
            <span>Kickstarter Q4:</span>
            <strong>{backerCount.toLocaleString()}+ Backers</strong>
          </div>
        </div>

        <div className="nav-actions">
          <button onClick={handleCta} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
            <span>Reserve $1 VIP</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
