import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import DepositStep from './DepositStep';
import Pic from './tonight/Pic';
import { track } from '../analytics';
import { EARLY_BIRD_PRICE, LAUNCH_DATE, vipUrl } from '../data/offer';

// Waitlist signup. Posts to the existing /api/subscribers endpoint (same contract as before).
export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState('');   // '', 'free' or 'vip'
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [returned, setReturned] = useState('');
  const [vipThanks, setVipThanks] = useState(null);   // set when Stripe sends the buyer back to /?vip=thanks

  const section = useRef(null);
  const card = useRef(null);
  useEffect(() => {
    const el = section.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { track('waitlist_view', {}, { once: true }); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setRefCode(ref);
    const d = new URLSearchParams(window.location.search).get('deposit');
    if (d === 'success' || d === 'cancelled') setReturned(d);
    const q = new URLSearchParams(window.location.search);
    if (q.get('vip') === 'thanks') {
      // Stripe sends the payer back to /?vip=thanks&session_id=cs_... The session id is unguessable and only the payer's browser has it, so the
      // server asks Stripe whether it was really paid before this page claims anything or shows a referral link. Anyone else who opens
      // /?vip=thanks gets a plain page that says nothing about their status.
      const sid = q.get('session_id') || '';
      try { window.history.replaceState(null, '', '/?vip=thanks'); } catch (_) { /* keep the url */ }
      track('vip_thanks_view', {}, { once: true });
      setTimeout(() => section.current?.scrollIntoView(), 300);
      if (!/^cs_(test|live)_[A-Za-z0-9]{8,190}$/.test(sid)) { setVipThanks({ state: 'plain' }); return undefined; }
      setVipThanks({ state: 'checking' });
      let tries = 0, dead = false;
      const ask = async () => {
        tries += 1;
        let r = null;
        try { const res = await fetch(`/api/v1/stripe/checkout-status?session_id=${encodeURIComponent(sid)}`); r = res.ok ? await res.json() : null; } catch (_) { r = null; }
        if (dead) return;
        if (r && r.paid && r.vip) { setVipThanks({ state: 'verified', code: r.referralCode || '' }); return; }
        if (r && r.paid) {   // paid, and the payment is still being recorded: keep looking for about a minute, quickly at first
          setVipThanks((v) => (v && v.state === 'verified' ? v : { state: 'paid' }));
          if (tries < 16) { setTimeout(ask, tries < 6 ? 2000 : 6000); }
          return;
        }
        setVipThanks({ state: 'plain' });
      };
      ask();
      return () => { dead = true; };
    }
    return undefined;
  }, []);

  // Posts the signup. Returns the subscriber, or throws with a message that is safe to show.
  const signup = async () => {
    const res = await fetch('/api/v1/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), ref: refCode || undefined, hp_jeemu_check: honeypot || undefined })
    });
    const data = await res.json().catch(() => ({}));   // a crashed server can reply with plain text
    if (!res.ok || data.error) throw new Error(data.error || 'Could not join the waitlist. Please try again.');
    return data.subscriber || {};
  };
  const validEmail = () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return false; }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validEmail()) return;
    if (import.meta.env.VITE_PREVIEW === 'true') { setError('This is a preview build, so signup is switched off here. It works on the live site.'); return; }
    setLoading('free');
    track('waitlist_submit');
    try {
      setDone(await signup());
      // the thank-you is taller than the form: make sure its top isn't hidden under the top bar (phones)
      requestAnimationFrame(() => {
        const el = card.current;
        if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      track('waitlist_joined');
      try { confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 }, shapes: ['square'], scalar: 0.8, disableForReducedMotion: true, colors: ['#cfa96b', '#f2eadf', '#a3e8c8', '#8a5a2b'] }); } catch (_) {}
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading('');
    }
  };

  // Go VIP: add them to the waitlist (best effort), then open the Stripe payment link with their email filled in.
  const goVip = async () => {
    setError('');
    if (!validEmail()) return;
    setLoading('vip');
    track('vip_click');
    let code = '';
    if (import.meta.env.VITE_PREVIEW !== 'true') {
      try { code = (await signup()).referralCode || ''; } catch (_) { /* Stripe also records the email, so do not block the payment */ }
    }
    window.location.assign(vipUrl(email.trim(), code));
  };

  useEffect(() => {
    if (vipThanks?.state !== 'verified') return;
    try { confetti({ particleCount: 110, spread: 80, origin: { y: 0.7 }, shapes: ['square'], scalar: 0.9, disableForReducedMotion: true, colors: ['#cfa96b', '#f2eadf', '#a3e8c8', '#e2c08a'] }); } catch (_) { /* decoration only */ }
  }, [vipThanks?.state]);

  const refCode2 = done?.referralCode || (vipThanks?.state === 'verified' ? vipThanks.code : '') || '';
  const link = refCode2 ? `${window.location.origin}/?ref=${refCode2}` : '';
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });

  const shareBox = link && (
    <div className="wn-share">
      <span className="wn-share-label">Pass it on</span>
      <div className="wn-share-row">
        <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.target.select()} />
        <button type="button" className="wn-btn wn-btn-ghost wn-btn-small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
  const THANKS = {
    verified: { note: "You're VIP!", lines: ['Early-bird price locked.', 'Free carry bag reserved.'], sub: link ? 'Every friend who goes VIP through your link counts:' : "We'll tell you first on launch day." },
    paid: { note: 'Payment received', lines: ["We're recording your VIP spot..."], sub: "You can close this page. We'll email you." },
    checking: { note: 'One moment...', lines: ['Checking your payment.'], sub: '' },
    plain: { note: 'Welcome back', lines: ["If you just paid, we'll email your receipt."], sub: '' }
  };

  return (
    <section className="wl wn" id="waitlist" ref={section}>
      <div className="wn-inner">
        <div className="wn-copy">
          <p className="wn-kicker">The waitlist</p>
          <h2 className="wn-title">I never run out of questions.</h2>
          <p className="wn-lede">New ones keep arriving, and you can write your own in the Jeemu app.</p>
          <dl className="wn-price">
            <div><dt>Early bird</dt><dd>{EARLY_BIRD_PRICE}<small> USD</small></dd></div>
            <div><dt>Kickstarter</dt><dd>{LAUNCH_DATE}</dd></div>
          </dl>
          <div className="wn-rewards">
            <p className="wn-kicker">Kickstarter exclusive</p>
            <h3>Get rewarded.</h3>
            <ol>
              <li><span className="wn-num">$1</span><div><b>Go VIP</b><span>A free premium Jeemu carry bag</span></div></li>
              <li><span className="wn-num">5</span><div><b>Refer 5 friends</b><span>A bonus NFC card deck, so you can play without the tower</span></div></li>
              <li><span className="wn-num">20</span><div><b>Refer 20 friends</b><span>A Jeemu of your own, completely free</span></div></li>
            </ol>
          </div>
        </div>

        <div className="wn-card" ref={card}>
          {returned === 'success' && <div className="wn-banner" role="status">Thanks, your deposit was received. We'll email your receipt.</div>}
          {returned === 'cancelled' && <div className="wn-banner is-warn" role="status">Checkout was cancelled. You have not been charged.</div>}
          {vipThanks && !done ? (
            <div className="wn-done" role="status">
              <Polaroid note={THANKS[vipThanks.state].note} />
              {THANKS[vipThanks.state].lines.map((l) => <p key={l} className="wn-done-line">{l}</p>)}
              {THANKS[vipThanks.state].sub && <p className="wn-done-sub">{THANKS[vipThanks.state].sub}</p>}
              {shareBox}
              {vipThanks.state === 'verified' && <p className="wn-fine">VIP spots are tied to the email you signed up with. 5 friends going VIP through your link earns the bonus NFC card deck, and 20 earns a Jeemu of your own.</p>}
              {vipThanks.state === 'plain' && <p className="wn-fine">Your VIP status is recorded against the email you signed up with. If it does not show up within a day, write to us from that email.</p>}
            </div>
          ) : done ? (
            <div className="wn-done" role="status">
              <Polaroid note="You're on the list!" />
              <p className="wn-done-line">We'll email you before launch.</p>
              {shareBox}
              <a className="wn-btn wn-btn-primary wn-btn-wide" href={vipUrl(done?.email || email.trim(), done?.referralCode)} onClick={() => track('vip_click')}>Go VIP for $1</a>
              <p className="wn-fine">VIPs lock in the early-bird price, receive a free Jeemu carry bag and hear about launch day first.</p>
              <DepositStep subscriber={done} />
            </div>
          ) : (
            <form className="wn-form" onSubmit={submit} noValidate>
              <h3 className="wn-card-title">Join the waitlist</h3>
              <label className="wn-field">
                <span>Your email</span>
                <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={!!error} aria-describedby={error ? 'wn-error' : undefined} />
              </label>
              <input type="text" className="wl-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              {error && <div className="wn-error" id="wn-error" role="alert">{error}</div>}
              <div className="wn-actions">
                <button className="wn-btn wn-btn-primary" type="submit" disabled={!!loading}>{loading === 'free' ? 'Joining…' : 'Join free'}</button>
                <button className="wn-btn wn-btn-ghost" type="button" onClick={goVip} disabled={!!loading}>{loading === 'vip' ? 'Opening…' : 'Go VIP for $1'}</button>
              </div>
              <p className="wn-fine">VIPs lock in the early-bird price, receive a free Jeemu carry bag and hear about launch day first. Joining free needs no payment, and we only use your email to tell you about the launch.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// The confirmation: a polaroid from tonight with a note written on it, like the ones on the table.
function Polaroid({ note }) {
  return (
    <figure className="wn-polaroid" aria-hidden="true">
      <Pic src={`${import.meta.env.BASE_URL}tonight/photos/4.jpg`} width="800" height="800" loading="lazy" decoding="async" />
      <figcaption>{note}</figcaption>
    </figure>
  );
}
