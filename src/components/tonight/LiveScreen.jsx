import React, { useEffect, useState } from 'react';

// The Jeemu display, laid out at its real 320 x 240 pixels and warped onto the screen in the render.
// Clean type rather than pixel art, but drawn at the device's own resolution so it never looks HD.
export default function LiveScreen({ card, dim = false }) {
  const [shown, setShown] = useState(0);
  const text = card?.text || '';
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(text.length); return undefined; }
    setShown(0);
    let i = 0;
    const id = setInterval(() => { i += 1; setShown(i); if (i >= text.length) clearInterval(id); }, 28);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div className={`ls ${dim ? 'ls-dim' : ''}`} aria-hidden="true">
      <div className="ls-bar"><span className="ls-tag">{card?.tag}</span><span className="ls-mark">Jeemu</span></div>
      <p className={`ls-text ${text.length > 44 ? 'ls-long' : ''}`}>{text.slice(0, shown)}<i className="ls-caret" /></p>
      {card?.foot && <div className="ls-foot">{card.foot}</div>}
    </div>
  );
}
