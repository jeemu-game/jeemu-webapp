import React, { useEffect, useRef, useState } from 'react';
import useWaitlist from './useWaitlist';
import { track } from '../../analytics';
import { EARLY_BIRD_PRICE, LAUNCH_DATE } from '../../data/offer';

// The waitlist, on Jeemu's own screen: laid out at the device's 320 x 240 and warped onto the render like every
// other screen in the story. Same look as the game's question cards (LiveScreen), but you can type on it.
//   active: the camera is on the screen (it reports a view once, and the field becomes reachable by Tab)
export default function WaitlistScreen({ active, onArrive }) {
  const w = useWaitlist({ onArrive });
  const [page, setPage] = useState('join');           // 'join' or 'rewards'
  const [flash, setFlash] = useState(false);          // the "block read" blink after joining
  const seen = useRef(false);
  useEffect(() => { if (active && !seen.current) { seen.current = true; track('waitlist_view', {}, { once: true }); } }, [active]);
  useEffect(() => {
    if (!w.done && w.vipThanks?.state !== 'verified') return undefined;
    setFlash(true); const id = setTimeout(() => setFlash(false), 900); return () => clearTimeout(id);
  }, [w.done, w.vipThanks?.state]);

  const tab = active ? 0 : -1;
  const shortLink = w.link.replace(/^https?:\/\//, '');
  const Share = ({ lead }) => w.link && (
    <div className="ws-share">
      <p className="ws-small">{lead}</p>
      <div className="ws-linkrow">
        <span className="ws-link">{shortLink}</span>
        <button type="button" className="ws-key" onClick={w.copy} tabIndex={tab}>{w.copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );

  let body;
  if (w.vipThanks && !w.done) {
    const s = w.vipThanks.state;
    body = (
      <div className="ws-page">
        <Bar tag={s === 'verified' ? 'VIP UNLOCKED' : s === 'paid' ? 'PAYMENT IN' : s === 'checking' ? 'CHECKING' : 'WELCOME BACK'} />
        {s === 'verified' && <><p className="ws-big">You're VIP.</p><p className="ws-small">Early-bird price locked. Carry bag reserved.</p><Share lead="Every friend who goes VIP through your link counts:" /></>}
        {s === 'paid' && <><p className="ws-big">Payment received.</p><p className="ws-small">Recording your VIP spot. You can close this page; we'll email you.</p></>}
        {s === 'checking' && <p className="ws-big">Checking your payment<span className="ws-dots" /></p>}
        {s === 'plain' && <><p className="ws-big">Welcome back.</p><p className="ws-small">If you just paid, we'll email your receipt.</p></>}
      </div>
    );
  } else if (w.done) {
    body = (
      <div className="ws-page">
        <Bar tag="BLOCK READ" />
        <p className="ws-big">You're on the list.</p>
        <p className="ws-small">We'll email you before launch.</p>
        <Share lead="Pass it on. Friends who join through your link count:" />
        <a className="ws-key ws-key-go ws-foot-key" href={w.vipHref} onClick={() => track('vip_click')} tabIndex={tab}>Go VIP · $1</a>
      </div>
    );
  } else if (page === 'rewards') {
    body = (
      <div className="ws-page">
        <Bar tag="VIP & REWARDS" />
        <ul className="ws-rewards">
          <li><b>$1</b><span>VIP: the early-bird price, and a free Jeemu carry bag</span></li>
          <li><b>5</b><span>friends go VIP: a bonus NFC card deck</span></li>
          <li><b>20</b><span>friends go VIP: a Jeemu of your own, free</span></li>
        </ul>
        <button type="button" className="ws-key ws-foot-key" onClick={() => setPage('join')} tabIndex={tab}>Back</button>
      </div>
    );
  } else {
    body = (
      <form className="ws-page" onSubmit={w.submit} noValidate>
        <Bar tag={`WAITLIST · OPENS ${LAUNCH_DATE.toUpperCase()}`} />
        <p className="ws-lead">Lock in the early bird: {EARLY_BIRD_PRICE}.</p>
        <label className="ws-field">
          <span className="ws-sr">Your email</span>
          <input type="email" inputMode="email" autoComplete="email" placeholder="your email" value={w.email} tabIndex={tab}
            onChange={(e) => { w.setEmail(e.target.value); if (w.error) w.setError(''); }} aria-invalid={!!w.error} aria-describedby={w.error ? 'ws-error' : undefined} />
        </label>
        <input type="text" className="wl-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={w.honeypot} onChange={(e) => w.setHoneypot(e.target.value)} />
        {w.error
          ? <p className="ws-error" id="ws-error" role="alert">{w.error}</p>
          : <button type="button" className="ws-more" onClick={() => setPage('rewards')} tabIndex={tab}>What does VIP get me?</button>}
        <div className="ws-keys">
          <button type="submit" className="ws-key ws-key-go" disabled={!!w.loading} tabIndex={tab}>{w.loading === 'free' ? 'Joining…' : 'Join free'}</button>
          <button type="button" className="ws-key" onClick={w.goVip} disabled={!!w.loading} tabIndex={tab}>{w.loading === 'vip' ? 'Opening…' : 'VIP · $1'}</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`ls ws ${flash ? 'is-flash' : ''}`} role="region" aria-label="Join the Jeemu waitlist" aria-live="polite">
      {w.returned === 'success' && <p className="ws-note">Deposit received. We'll email your receipt.</p>}
      {w.returned === 'cancelled' && <p className="ws-note">Checkout cancelled. You have not been charged.</p>}
      {body}
    </div>
  );
}

function Bar({ tag }) {
  return <div className="ls-bar"><span className="ls-tag">{tag}</span><span className="ls-mark">Jeemu</span></div>;
}
