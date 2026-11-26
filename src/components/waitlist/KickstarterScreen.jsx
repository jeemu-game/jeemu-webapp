import React from 'react';
import { track } from '../../analytics';
import { EARLY_BIRD_PRICE, KICKSTARTER_URL, FUNDED, leftText } from '../../data/offer';

// Launch day onwards: Jeemu's end screen sends people to the campaign instead of the waitlist (same 320 x 240 screen).
export default function KickstarterScreen({ active }) {
  return (
    <div className="ls ws" role="region" aria-label="Jeemu on Kickstarter">
      <div className="ws-page">
        <div className="ls-bar"><span className="ls-tag">LIVE ON KICKSTARTER</span><span className="ls-mark">Jeemu</span></div>
        <p className="ws-big">{FUNDED}.</p>
        <p className="ws-small">{leftText()}. Early bird {EARLY_BIRD_PRICE} USD while the spots last.</p>
        <div className="ws-keys ws-keys-one">
          <a className="ws-key ws-key-go" href={KICKSTARTER_URL} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1}
            onClick={() => track('cta_click', { where: 'end_screen_kickstarter' })}>Back us on Kickstarter</a>
        </div>
      </div>
    </div>
  );
}
