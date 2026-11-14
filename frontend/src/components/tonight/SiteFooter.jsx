import React from 'react';
import { SOCIAL_LINKS } from '../../data/socials';

// When the night is over: the wordmark, where to go, the small print. Nothing else.
export default function SiteFooter() {
  return (
    <footer className="sf">
      <span className="sf-mark">Jeemu</span>
      <nav className="sf-links" aria-label="Footer">
        <a href="#waitlist">Join the waitlist</a>
        <a href="#journey">Our story</a>
        <a href="#team">Team</a>
        <a href="#faq">FAQ</a>
        {SOCIAL_LINKS.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
      </nav>
      <p className="sf-legal">
        © {new Date().getFullYear()} Jeemu. Made in Shanghai. Jeemu is an independent game and is not affiliated with Kickstarter.
        Launch date and pricing may change before the campaign goes live.
      </p>
    </footer>
  );
}
