import React, { useEffect, useState } from 'react';

export default function Navbar({ onCtaClick }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={`site-navbar nb ${solid ? 'is-solid' : ''}`}>
      <div className="navbar-container">
        <a href="#" className="nb-brand" aria-label="Jeemu home">
          <img src={`${import.meta.env.BASE_URL}story/frog-pixel.png`} alt="" className="px-frog" />
          <span>JEEMU</span>
        </a>
        <nav className="nb-links" aria-label="Main">
          <a href="#how">How it plays</a>
          <a href="#journey">Our story</a>
          <a href="#team">Team</a>
          <a href="#faq">FAQ</a>
        </nav>
        <button onClick={onCtaClick} className="btn-pixel btn-small">JOIN THE WAITLIST</button>
      </div>
    </header>
  );
}
