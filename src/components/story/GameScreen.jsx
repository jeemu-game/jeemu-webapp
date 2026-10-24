import React, { useEffect, useState } from 'react';

// The live pixel-art display, drawn at the device's real 320x240 resolution and warped onto the
// rendered 3D screen by StoryPlayer. Swap the contents for the real in-game screen later.
export default function GameScreen({ card, onCta }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const len = card?.text.length || 0;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(i);
      if (i >= len) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [card]);

  const typed = (card?.text || '').length <= shown;
  return (
    <div className="gs">
      <div className="gs-bar">
        <span className="gs-jade">{card?.tag}</span>
        <span>JEEMU</span>
      </div>
      <div className="gs-body">
        <p className={(card?.text.length || 0) > 70 ? 'long' : ''}>{(card?.text || '').slice(0, shown)}<i className="gs-cursor" /></p>
      </div>
      {card?.cta
        ? <button type="button" tabIndex={-1} className={`gs-cta ${typed ? 'show' : ''}`} onClick={onCta}>{card.cta}</button>
        : <div className="gs-foot">{card?.foot}</div>}
      <div className="gs-scan" />
    </div>
  );
}
