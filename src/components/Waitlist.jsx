import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import DepositStep from './DepositStep';
import { track } from '../analytics';

// Waitlist signup. Posts to the existing /api/subscribers endpoint (same contract as before).
export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [returned, setReturned] = useState('');

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
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (import.meta.env.VITE_PREVIEW === 'true') { setError('This is a preview build, so signup is switched off here. It works on the live site.'); return; }
    setLoading(true);
    track('waitlist_submit');
    try {
      const res = await fetch('/api/v1/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), ref: refCode || undefined, hp_jeemu_check: honeypot || undefined })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not join the waitlist. Please try again.');
      setDone(data.subscriber || {});
      track('waitlist_joined');
      try { confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 }, shapes: ['square'], scalar: 0.8, colors: ['#00d97e', '#e2ede5', '#1ae88d', '#8ea89a'] }); } catch (_) {}
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const link = done?.referralCode ? `${window.location.origin}/?ref=${done.referralCode}` : '';
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });

  return (
    <section className="wl" id="waitlist" ref={section}>
      <div className="wl-inner">
        <div className="wl-copy">
          <div className="px-label">WAITLIST</div>
          <h2>Launching on Kickstarter in November.</h2>
          <p>Join the waitlist and you will hear first, before the campaign opens to everyone.</p>
          <ul className="wl-offer">
            <li><span className="px-label">EARLY BIRD</span><strong>$89.99</strong><small>USD</small></li>
            <li><span className="px-label">EARLY-BIRD BACKER REWARD</span><strong>A premium Jeemu bag</strong><small>Made to carry your whole set</small></li>
          </ul>
        </div>

        <div className="wl-card">
          {returned === 'success' && <div className="wl-ok" role="status">Thanks, your deposit was received. We'll email your receipt.</div>}
          {returned === 'cancelled' && <div className="wl-error" role="status">Checkout was cancelled. You have not been charged.</div>}
          {done ? (
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
              <DepositStep subscriber={done} />
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="wl-field">
                <span className="px-label">EMAIL</span>
                <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="wl-field">
                <span className="px-label">NAME <em>(OPTIONAL)</em></span>
                <input type="text" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
              </label>
              <input type="text" className="wl-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              {error && <div className="wl-error" role="alert">{error}</div>}
              <button className="btn-pixel" type="submit" disabled={loading}>{loading ? 'JOINING…' : 'JOIN THE WAITLIST'}</button>
              <p className="wl-fine">No payment needed. We only use your email to tell you about the launch.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
