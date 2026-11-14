import React from 'react';

// No bar: the wordmark and two quiet links float over the night scene. The call to action points at Jeemu's screen.
const LINKS = [['#journey', 'Our story'], ['#faq', 'FAQ']];

export default function TopBar({ onCtaClick }) {
  return (
    <header className="tb">
      <a className="tb-mark" href="#top" aria-label="Jeemu, back to the top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>Jeemu</a>
      <nav className="tb-links" aria-label="Main">
        {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <button type="button" className="tb-cta" onClick={onCtaClick}>Join the waitlist</button>
    </header>
  );
}
