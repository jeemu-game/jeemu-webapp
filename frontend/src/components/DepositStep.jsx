import React, { useState } from 'react';

// Optional second step after joining the waitlist. Hidden unless VITE_DEPOSIT_ENABLED=true (build-time),
// and the backend also refuses unless DEPOSIT_ENABLED=true, so nothing can charge by accident.
// Wording comes from env so the exact terms are set in one place:
//   VITE_DEPOSIT_AMOUNT  e.g. "$1"        VITE_DEPOSIT_COPY  one or two sentences on what it secures
//   VITE_DEPOSIT_TERMS   e.g. "Fully refundable until the campaign opens."  (shown under the button)
export const DEPOSIT_ENABLED = import.meta.env.VITE_DEPOSIT_ENABLED === 'true';

export default function DepositStep({ subscriber }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!DEPOSIT_ENABLED) return null;

  const amount = import.meta.env.VITE_DEPOSIT_AMOUNT || '$1';
  const copy = import.meta.env.VITE_DEPOSIT_COPY || 'Optional: put down a small deposit to reserve your place for the early bird.';
  const terms = import.meta.env.VITE_DEPOSIT_TERMS || '';

  const start = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/v1/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId: subscriber?.id, referralCode: subscriber?.referralCode, email: subscriber?.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout. Please try again.');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="dep">
      <div className="px-label">STEP 2 · OPTIONAL</div>
      <p>{copy}</p>
      {error && <div className="wl-error" role="alert">{error}</div>}
      <button type="button" className="btn-pixel" onClick={start} disabled={loading}>{loading ? 'OPENING CHECKOUT…' : `PAY ${amount} DEPOSIT`}</button>
      {terms && <p className="wl-fine">{terms}</p>}
    </div>
  );
}
