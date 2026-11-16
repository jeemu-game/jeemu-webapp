import React from 'react';
import useCountdown, { fmtLong, fmtClock } from './useCountdown';
import { KICKSTARTER_URL } from '../../data/offer';

// No bar: the wordmark and a few quiet links float over the night scene.
const LINKS = [['#journey', 'Our story'], ['#team', 'Team'], ['#faq', 'FAQ']];

export default function TopBar({ onCtaClick }) {
  const c = useCountdown();

  return (
    <header className="tb">
      <a className="tb-mark" href="#top" aria-label="Jeemu, back to the top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>Jeemu</a>
      <nav className="tb-links" aria-label="Main">
        {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <a className="tb-count" href={KICKSTARTER_URL} target="_blank" rel="noopener noreferrer" title="Kickstarter opens 24 November, 9:00 am EST">
        {c.live ? 'Live on Kickstarter' : (<><span className="tb-count-lead">Kickstarter in {fmtLong(c)}</span><span className="tb-count-short">{fmtClock(c)}</span></>)}
      </a>
      <button type="button" className="tb-cta" onClick={onCtaClick}>Join the waitlist</button>
    </header>
  );
}
