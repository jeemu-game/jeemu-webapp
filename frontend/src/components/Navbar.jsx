import React, { useCallback, useEffect, useRef, useState } from 'react';

const LINKS = [
  ['#how', 'How it plays'],
  ['#journey', 'Our story'],
  ['#team', 'Team'],
  ['#faq', 'FAQ']
];

// Same breakpoint as the CSS that hides the desktop links
const DESKTOP = '(min-width: 761px)';

export default function Navbar({ onCtaClick }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const refocus = useRef(false);

  useEffect(() => {
    const f = () => setSolid(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  // Closing removes the scroll lock straight away, so a link tapped in the menu can still scroll the page.
  const close = useCallback((returnFocus = true) => {
    document.documentElement.classList.remove('menu-open');
    refocus.current = returnFocus;
    setOpen(false);
  }, []);

  // Focus goes back to the menu button only after the header is interactive again (it is inert while the menu is open).
  useEffect(() => {
    if (!open && refocus.current) { refocus.current = false; toggleRef.current?.focus(); }
  }, [open]);

  // While the menu is open it behaves as a modal: the page behind is locked (the story player also ignores input,
  // see the menu-open class), keyboard focus stays inside, Escape closes, and a desktop-sized window closes it.
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    root.classList.add('menu-open');
    const behind = document.querySelectorAll('main, .skip-link');
    behind.forEach((el) => el.setAttribute('inert', ''));
    panelRef.current?.querySelector('button, a')?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll('a[href], button:not([disabled])')];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (!panelRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const mq = window.matchMedia(DESKTOP);
    const onSize = () => { if (mq.matches) close(false); };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onSize);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onSize);
      root.classList.remove('menu-open');
      behind.forEach((el) => el.removeAttribute('inert'));
    };
  }, [open, close]);

  return (
    <>
    <header className={`site-navbar nb ${solid ? 'is-solid' : ''}`}>
      <div className="navbar-container" inert={open}>
        <button
          ref={toggleRef}
          type="button"
          className="nb-burger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className="nb-burger-bars" aria-hidden="true" />
        </button>
        <a href="#" className="nb-brand" aria-label="Jeemu home">
          <img src={`${import.meta.env.BASE_URL}story/frog-pixel.png`} alt="" className="px-frog" />
          <span>JEEMU</span>
        </a>
        <nav className="nb-links" aria-label="Main">
          {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <button onClick={onCtaClick} className="btn-pixel btn-small">JOIN THE WAITLIST</button>
      </div>
    </header>

    {/* outside the header on purpose: a blurred (backdrop-filter) parent would trap this fixed layer inside the 68px bar */}
      <div id="mobile-menu" className={`nb-drawer ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="nb-backdrop" onClick={() => close()} aria-hidden="true" />
        <div className="nb-panel" ref={panelRef}>
          <button type="button" className="nb-close" aria-label="Close menu" onClick={() => close()}>
            <span className="nb-close-x" aria-hidden="true" />
          </button>
          <nav aria-label="Site sections">
            {LINKS.map(([href, label]) => <a key={href} href={href} onClick={() => close(false)}>{label}</a>)}
          </nav>
          <button type="button" className="btn-pixel" onClick={() => { close(false); onCtaClick(); }}>JOIN THE WAITLIST</button>
        </div>
      </div>
    </>
  );
}
