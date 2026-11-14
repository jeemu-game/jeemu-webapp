import React, { useEffect, useState } from 'react';
import { startFire, stopFire } from './fireSound';

// No bar: the wordmark and a few quiet links float over the night scene. "Sound" lets the fire crackle
// (off until asked for; a visitor who turned it on before gets it back at their first tap or key press).
const LINKS = [['#journey', 'Our story'], ['#faq', 'FAQ']];
const KEY = 'jeemu-sound';

export default function TopBar({ onCtaClick }) {
  const [sound, setSound] = useState(false);
  const toggle = () => {
    const next = !sound;
    if (next) { if (!startFire()) return; } else stopFire();
    setSound(next);
    try { localStorage.setItem(KEY, next ? 'on' : 'off'); } catch (_) { /* private mode: just this visit */ }
  };
  useEffect(() => {
    let wanted = false;
    try { wanted = localStorage.getItem(KEY) === 'on'; } catch (_) { wanted = false; }
    if (!wanted) return undefined;
    const first = () => { if (startFire()) setSound(true); off(); };
    const off = () => { window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
    window.addEventListener('pointerdown', first, { once: true }); window.addEventListener('keydown', first, { once: true });
    return off;
  }, []);

  return (
    <header className="tb">
      <a className="tb-mark" href="#top" aria-label="Jeemu, back to the top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>Jeemu</a>
      <nav className="tb-links" aria-label="Main">
        {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <button type="button" className={`tb-sound ${sound ? 'is-on' : ''}`} onClick={toggle} aria-pressed={sound}>
        <span className="tb-wave" aria-hidden="true"><i /><i /><i /></span>{sound ? 'Sound on' : 'Sound'}
      </button>
      <button type="button" className="tb-cta" onClick={onCtaClick}>Join the waitlist</button>
    </header>
  );
}
