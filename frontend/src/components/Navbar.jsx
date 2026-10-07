import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function Navbar({ onCtaClick }) {
  const [backerCount, setBackerCount] = useState(1848);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCta = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onCtaClick) {
      onCtaClick();
    } else {
      const el = document.getElementById('reserve-funnel');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavLink = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className={`site-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand */}
        <a href="#" className="nav-brand" aria-label="Jeemu Home">
          <img 
            src="/brand/logos/jeemu-logo-horizontal-dark-bg.svg" 
            alt="Jeemu" 
            className="brand-logo-img"
          />
        </a>

        {/* Desktop Navigation Links */}
        <nav className="nav-links" aria-label="Main Navigation">
          <a href="#how-it-works" onClick={(e) => handleNavLink(e, 'how-it-works')} className="nav-link">
            How It Works
          </a>
          <a href="#simulator" onClick={(e) => handleNavLink(e, 'simulator')} className="nav-link">
            Interactive Dock
          </a>
          <a href="#story" onClick={(e) => handleNavLink(e, 'story')} className="nav-link">
            Our Story
          </a>
          <a href="#pricing" onClick={(e) => handleNavLink(e, 'pricing')} className="nav-link">
            Pricing
          </a>
          <a href="#faq" onClick={(e) => handleNavLink(e, 'faq')} className="nav-link">
            FAQ
          </a>
        </nav>

        {/* Right Actions: Backer Count + CTA + Mobile Toggle */}
        <div className="nav-actions">
          <div className="live-counter-pill">
            <span className="pulse-beacon" />
            <span className="counter-label">Kickstarter:</span>
            <strong>{backerCount.toLocaleString()}+</strong>
          </div>

          <button onClick={handleCta} className="btn-primary nav-cta-btn">
            <span>Reserve $1 VIP</span>
            <ArrowRight size={15} />
          </button>

          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-nav-links">
            <a href="#how-it-works" onClick={(e) => handleNavLink(e, 'how-it-works')} className="mobile-nav-link">
              How It Works
            </a>
            <a href="#simulator" onClick={(e) => handleNavLink(e, 'simulator')} className="mobile-nav-link">
              Interactive Dock
            </a>
            <a href="#story" onClick={(e) => handleNavLink(e, 'story')} className="mobile-nav-link">
              Our Story
            </a>
            <a href="#pricing" onClick={(e) => handleNavLink(e, 'pricing')} className="mobile-nav-link">
              Pricing & Perks
            </a>
            <a href="#faq" onClick={(e) => handleNavLink(e, 'faq')} className="mobile-nav-link">
              FAQ
            </a>
          </nav>
          <div className="mobile-drawer-footer">
            <div className="mobile-backer-stat">
              <span className="pulse-beacon" />
              <span>{backerCount.toLocaleString()}+ Backers on waitlist</span>
            </div>
            <button onClick={handleCta} className="btn-primary mobile-cta-btn">
              <span>Reserve $1 VIP Early Bird</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
