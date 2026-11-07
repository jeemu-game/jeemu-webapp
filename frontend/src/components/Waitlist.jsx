import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import DepositStep from './DepositStep';
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
    if (new URLSearchParams(window.location.search).get('vip') === 'thanks') {
      let code = '';
      try { code = localStorage.getItem('jeemu_ref') || ''; } catch (_) { /* private mode: no referral link, still thank them */ }
      setVipThanks({ code });
      track('vip_thanks_view', {}, { once: true });
      setTimeout(() => section.current?.scrollIntoView(), 300);
    }
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
      track('waitlist_joined');
      try { confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 }, shapes: ['square'], scalar: 0.8, colors: ['#05ffa1', '#ff71ce', '#01cdfe', '#b967ff'] }); } catch (_) {}
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
    try { if (code) localStorage.setItem('jeemu_ref', code); } catch (_) { /* optional */ }
    window.location.assign(vipUrl(email.trim(), code));
  };

  const refCode2 = done?.referralCode || vipThanks?.code || '';
  const link = refCode2 ? `${window.location.origin}/?ref=${refCode2}` : '';
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });

  return (
    <section className="wl" id="waitlist" ref={section}>
      <div className="wl-inner">
        <div className="wl-copy">
          <div className="px-label">WAITLIST</div>
          <h2>I never run out of questions.</h2>
          <p>New ones keep arriving, and you can write your own in the Jeemu app.</p>
          <p className="wl-price"><strong>Early bird: {EARLY_BIRD_PRICE} USD.</strong> Kickstarter launches on {LAUNCH_DATE}.</p>
          <div className="wl-rewards">
            <div className="px-label">KICKSTARTER EXCLUSIVE</div>
            <h3>Get rewarded.</h3>
            <ul>
              <li><b>Go VIP ($1)</b><span>A free premium Jeemu carry bag</span></li>
              <li><b>5 referrals</b><span>A bonus NFC card deck, so you can play without the tower</span></li>
              <li><b>20 referrals</b><span>A Jeemu of your own, completely free</span></li>
            </ul>
          </div>
        </div>

        <div className="wl-card">
          {returned === 'success' && <div className="wl-ok" role="status">Thanks, your deposit was received. We'll email your receipt.</div>}
          {returned === 'cancelled' && <div className="wl-error" role="status">Checkout was cancelled. You have not been charged.</div>}
          {vipThanks && !done ? (
            <div className="wl-done wl-thanks" role="status">
              <div className="wl-screen">
                <div className="gs-bar"><span className="gs-jade">VIP UNLOCKED</span><img src={`${import.meta.env.BASE_URL}story/frog-pixel.png`} alt="" className="px-frog" /></div>
                <p className="l1">THANK YOU. YOU'RE VIP.</p>
                <p className="l2">WE'LL EMAIL YOUR RECEIPT.</p>
                <p className="l3">{link ? 'PASS IT ON:' : 'MORE NEWS BEFORE LAUNCH.'}</p>
              </div>
              {link && (
                <div className="wl-share">
                  <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn-pixel btn-small" onClick={copy}>{copied ? 'COPIED' : 'COPY'}</button>
                </div>
              )}
              <p className="wl-fine">You get the early-bird price, a free Jeemu carry bag and word on launch day before everyone else. Every friend who goes VIP through your link counts towards the bonus rewards.</p>
            </div>
          ) : done ? (
            <div className="wl-done" role="status">
              <div className="wl-screen">
                <div className="gs-bar"><span className="gs-jade">BLOCK READ</span><img src={`${import.meta.env.BASE_URL}story/frog-pixel.png`} alt="" className="px-frog" /></div>
                <p className="l1">YOU'RE ON THE LIST.</p>
                <p className="l2">WE'LL EMAIL YOU BEFORE LAUNCH.</p>
                <p className="l3">PASS IT ON:</p>
              </div>
              {link && (
                <div className="wl-share">
                  <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn-pixel btn-small" onClick={copy}>{copied ? 'COPIED' : 'COPY'}</button>
                </div>
              )}
              <a className="btn-pixel btn-vip" href={vipUrl(done?.email || email.trim(), done?.referralCode)} onClick={() => track('vip_click')}>GO VIP FOR $1</a>
              <p className="wl-fine">VIPs lock in the early-bird price, receive a free Jeemu carry bag and hear about launch day first.</p>
              <DepositStep subscriber={done} />
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="wl-field">
                <span className="px-label">EMAIL</span>
                <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <input type="text" className="wl-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              {error && <div className="wl-error" role="alert">{error}</div>}
              <div className="wl-actions">
                <button className="btn-pixel" type="submit" disabled={!!loading}>{loading === 'free' ? 'JOINING…' : 'JOIN FREE'}</button>
                <button className="btn-pixel btn-vip" type="button" onClick={goVip} disabled={!!loading}>{loading === 'vip' ? 'OPENING…' : 'GO VIP FOR $1'}</button>
              </div>
              <p className="wl-fine">VIPs lock in the early-bird price, receive a free Jeemu carry bag and hear about launch day first. Joining free needs no payment, and we only use your email to tell you about the launch.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
