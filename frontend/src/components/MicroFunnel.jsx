import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2, Copy, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
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

      // Celebratory confetti in brand colors
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00d97e', '#1ae88d', '#e2ede5', '#8ea89a']
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
    <div className="hero-reservation-card spotlight-card" id="reserve-funnel">
      {step === 1 ? (
        <>
          <div className="hero-card-status-bar">
            <span className="status-os">
              <span className="pulse-indicator-dot" />
              <span>Kickstarter Launching Soon</span>
            </span>
            <span className="status-crypto">VIP EARLY ACCESS</span>
          </div>

          <div className="funnel-headline-group">
            <h3 className="funnel-title">Reserve Your Spot in Batch 01</h3>
            <p className="funnel-subtitle">
              Join the founding waitlist to unlock our lowest launch price, secret backer updates, and guaranteed priority delivery when our Kickstarter drops.
            </p>
          </div>

          {/* Clean email capture form */}
          <form onSubmit={handleSubmit} className="hero-capture-form">
            <input 
              type="text" 
              name="hp_jeemu_check" 
              value={honeypot} 
              onChange={(e) => setHoneypot(e.target.value)} 
              className="hp-bot-field" 
              tabIndex={-1} 
              autoComplete="off" 
            />

            <div className="field">
              <input 
                id="subscriber-email"
                type="email" 
                required
                placeholder="Enter your email for early access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
              <button type="submit" className="funnel-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Securing...</span>
                  </>
                ) : (
                  <>
                    <span>Get Early Access</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="form-error-text">
                {errorMsg}
              </div>
            )}
          </form>

          {/* Reassurance points */}
          <div className="hero-reservation-meta">
            <span>• 100% Refundable $1 VIP Deposit Option</span>
            <span>• Priority Batch 01 Delivery</span>
            <span>• No pledge required today</span>
          </div>
        </>
      ) : (
        <div className="step2-card">
          <div className="step2-success-banner">
            <CheckCircle2 size={20} color="#00d97e" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div><strong>Spot Confirmed!</strong> Welcome to the Jeemu Founding Waitlist.</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                We've sent your confirmation and secret access pass to <strong style={{ color: '#fff' }}>{subscriberData?.email}</strong>.
              </div>
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

            <div className="social-share-row">
              <span className="social-share-label">Share:</span>
              <div className="social-share-btns">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out Jeemu — smart wooden tumbling tower with embedded NFC & standalone dock! Reserve Batch 01: ${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn share-wa"
                  id="share-wa-btn"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just backed @JeemuGame — the world's first smart wooden tumbling tower with embedded NFC! Join early:`)}&url=${encodeURIComponent(`${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn share-x"
                  id="share-x-btn"
                  title="Share on X (Twitter)"
                >
                  X / Twitter
                </a>
              </div>
            </div>
          </div>

          {/* Optional VIP Deposit Upgrade */}
          <div className="vip-upgrade-prompt">
            <div className="vip-upgrade-badge">
              <Sparkles size={14} />
              <span>OPTIONAL VIP GUARANTEE</span>
            </div>
            <div className="vip-upgrade-title">
              Lock in the lowest launch price for a $1 refundable deposit.
            </div>
            <p className="vip-upgrade-desc">
              VIP Backers get guaranteed lowest Kickstarter launch pricing, exclusive Gold-Stamped Founder Block #01, and priority factory allocation.
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
