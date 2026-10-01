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
    <div className="hero-reservation-card spotlight-card border-beam-container" id="reserve-funnel">
      {/* Magic UI Border Beam - Shiny rotating overlay light */}
      <div className="border-beam" aria-hidden="true" />

      {/* Decorative neon corner slash matching Jeemu.fun */}
      <div className="corner-neon-line" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none">
          <line x1="0" y1="80" x2="80" y2="0" stroke="#00d97e" strokeWidth="2.5" />
        </svg>
      </div>

      {step === 1 ? (
        <>
          {/* Top Status Bar matching Screenshot 2 */}
          <div className="hero-card-status-bar">
            <span className="status-os">
              <span className="pulse-indicator-dot" />
              <span>JEEMU OS v2.4</span>
            </span>
            <span className="status-crypto">NFC // 13.56MHz CRYPTO</span>
          </div>

          {/* Offer Banner matching Screenshot 2 */}
          <div className="hero-offer-banner">
            <span className="offer-highlight">🔥 Guaranteed 45% Off ($89 vs $159)</span>
            <span className="offer-perk">+ Free Gold-Stamped Founder’s Block</span>
          </div>

          {/* Form matching Screenshot 2 */}
          <form onSubmit={handleSubmit} className="hero-capture-form">
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

            <div className="field">
              <input 
                id="subscriber-email"
                type="email" 
                required
                placeholder="Enter your email to reserve early access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
              <button type="submit" className="btn-shimmer-primary funnel-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Securing...</span>
                  </>
                ) : (
                  <>
                    <span>Reserve Batch 01</span>
                    <span aria-hidden="true" style={{ fontSize: '1.1em', marginLeft: '4px' }}>→</span>
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginTop: '8px' }}>
                {errorMsg}
              </div>
            )}
          </form>

          {/* Subtext Perks matching Screenshot 2 */}
          <div className="hero-reservation-meta">
            <span>✓ 100% Refundable $1 VIP Deposit Option</span>
            <span>✓ Priority Batch 01 Delivery</span>
            <span>✓ No pledge required today</span>
          </div>
        </>
      ) : (
        <div className="step2-card">
          <div className="step2-success-banner">
            <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div><strong>Spot Confirmed!</strong> Welcome to the Jeemu Founding Waitlist.</div>
              <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px', fontWeight: 400 }}>
                We've sent your reservation confirmation & personal referral link to <strong style={{ color: '#f59e0b' }}>{subscriberData?.email}</strong>.
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

            {/* 1-Click Social Share Links (WhatsApp, X, Facebook) */}
            <div className="social-share-row">
              <span className="social-share-label">1-Click Share:</span>
              <div className="social-share-btns">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out Jeemu — smart beechwood tumbling tower with embedded NFC tags & standalone IPS display! Reserve Batch 01: ${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn share-wa"
                  id="share-wa-btn"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just backed @JeemuGame — the world's first smart beechwood tumbling tower with embedded NFC! Join early:`)}&url=${encodeURIComponent(`${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn share-x"
                  id="share-x-btn"
                  title="Share on X (Twitter)"
                >
                  X / Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/?ref=${subscriberData?.referralCode || 'JEEMU'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn share-fb"
                  id="share-fb-btn"
                  title="Share on Facebook"
                >
                  Facebook
                </a>
              </div>
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
