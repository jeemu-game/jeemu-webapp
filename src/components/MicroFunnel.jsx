import React, { useState, useEffect } from 'react';
import { Mail, User, ShieldCheck, ArrowRight, CheckCircle2, Copy, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MicroFunnel() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [subscriberData, setSubscriberData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Extract referral code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          ref: refCode || undefined,
          hp_jeemu_check: honeypot || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reserve spot. Please try again.');
      }

      setSubscriberData(data.subscriber);
      setStep(2);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#ff6b35', '#10b981', '#38bdf8']
        });
      } catch (_) {}

    } catch (err) {
      setErrorMsg(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!subscriberData) return;
    const referralUrl = `${window.location.origin}/?ref=${subscriberData.referralCode}`;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: subscriberData?.id,
          referralCode: subscriberData?.referralCode,
          email: subscriberData?.email
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Stripe redirect fallback:', err);
      window.location.href = 'https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k';
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="micro-funnel-card" id="reserve-funnel">
      {step === 1 ? (
        <>
          <div className="funnel-header">
            <span className="funnel-step-badge">STEP 1 OF 2</span>
            <div className="funnel-guarantee-note">
              <ShieldCheck size={14} color="#10b981" />
              <span>100% Refundable $1 Deposit</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="funnel-form">
            {/* Invisible bot honeypot shield */}
            <input 
              type="text" 
              name="hp_jeemu_check" 
              value={honeypot} 
              onChange={(e) => setHoneypot(e.target.value)}
              className="hp-bot-field"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="form-inputs-row">
              <div className="input-wrap">
                <Mail size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="funnel-input"
                  disabled={loading}
                />
              </div>

              <div className="input-wrap">
                <User size={18} />
                <input 
                  type="text" 
                  placeholder="First name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="funnel-input"
                  disabled={loading}
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn-primary funnel-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Securing Batch 01 Spot...</span>
                </>
              ) : (
                <>
                  <span>Join Kickstarter VIP Waitlist</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="funnel-perks-row">
            <span>✓ 45% Early Bird Discount</span>
            <span>✓ Batch 01 Priority</span>
            <span>✓ Free Founder Block</span>
          </div>
        </>
      ) : (
        <div className="step2-card">
          <div className="step2-success-banner">
            <CheckCircle2 size={20} color="#10b981" />
            <div>
              <strong>Spot Confirmed!</strong> Welcome to the Jeemu Founding Waitlist.
            </div>
          </div>

          {/* Shareable Referral Code */}
          <div className="referral-box">
            <div className="referral-box-header">
              <span>YOUR UNIQUE REFERRAL LINK</span>
              <span>Earn Free Expansion Packs</span>
            </div>
            <div className="referral-input-row">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU-VIP'}`} 
              />
              <button onClick={handleCopyLink} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Copy size={14} />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* VIP Upgrade Box */}
          <div className="vip-upgrade-prompt">
            <div className="vip-upgrade-badge">
              <Sparkles size={14} />
              <span>STEP 2: OPTIONAL VIP UPGRADE</span>
            </div>
            <div className="vip-upgrade-title">
              Lock in your 45% discount for a $1 refundable deposit.
            </div>
            <p className="vip-upgrade-desc">
              VIP Backers get guaranteed $89 Kickstarter pricing (Retail: $159), exclusive Gold-Stamped Founder Block #01, and priority air-shipping.
            </p>
            <button 
              onClick={handleStripeCheckout} 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px' }}
              disabled={stripeLoading}
            >
              {stripeLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Lock in $1 VIP Reservation</span>
                  <ExternalLink size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
