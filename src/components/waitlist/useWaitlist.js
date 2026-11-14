import { useEffect, useState } from 'react';
import { track } from '../../analytics';
import { vipUrl } from '../../data/offer';

// Everything the waitlist does, without any look: signup (POST /api/v1/subscribers), the $1 VIP payment link,
// the Stripe return check (/?vip=thanks), referral links. The Jeemu screen draws it (WaitlistScreen.jsx).
// onArrive: called when the visitor comes back from Stripe, so the page can bring the screen into view.
export default function useWaitlist({ onArrive } = {}) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState('');   // '', 'free' or 'vip'
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [returned, setReturned] = useState('');
  const [vipThanks, setVipThanks] = useState(null);   // set when Stripe sends the buyer back to /?vip=thanks

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
      onArrive?.();
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
      track('waitlist_joined');
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

  const refCode2 = done?.referralCode || (vipThanks?.state === 'verified' ? vipThanks.code : '') || '';
  const link = refCode2 ? `${window.location.origin}/?ref=${refCode2}` : '';
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
  const vipHref = vipUrl((done?.email || email).trim(), done?.referralCode);
  return { email, setEmail, honeypot, setHoneypot, loading, error, setError, done, returned, vipThanks, link, copied, copy, submit, goVip, vipHref };
}
