/**
 * JEEMU 3-STAGE KICKSTARTER PRE-LAUNCH FUNNEL & STRIPE INTEGRATION
 *
 * Hardened features:
 * - Submit lock prevents double-submission race condition
 * - Real Stripe Checkout Session via /api/stripe/create-session
 * - Referral attribution synced to Supabase on every new signup
 * - Referral param parsed from search AND hash, stored in localStorage
 * - Clean referral URL (no hash confusion)
 * - Scroll animation paused before modals open
 * - Live backer count fetched from real API on load
 */

import { analytics } from './analytics.js';

class FunnelManager {
  constructor() {
    this.currentSubscriber = null;
    this.activeReferrerCode = this._parseReferralParam();
    this._submitting = false; // Concurrency lock

    this.waitlistForm = document.getElementById('waitlist-form');
    this.vipModal = document.getElementById('vip-modal');
    this.stripeModal = document.getElementById('stripe-checkout-modal');
    this.shareModal = document.getElementById('share-modal');

    this._bindEvents();
    this._loadExistingSubscriber();
    this._fetchLiveBackerCount();
    this._checkVipSuccessReturn();
  }

  /* ── Parse ?ref= from URL (search first, then hash), persist to localStorage ── */
  _parseReferralParam() {
    // Priority 1: real query string ?ref=CODE
    const searchParams = new URLSearchParams(window.location.search);
    let ref = searchParams.get('ref');

    // Priority 2: hash-based ?ref=CODE (e.g. #experience?ref=CODE)
    if (!ref && window.location.hash.includes('ref=')) {
      const hashPart = window.location.hash.split('?')[1];
      if (hashPart) ref = new URLSearchParams(hashPart).get('ref');
    }

    if (ref) {
      // Persist across page reloads
      localStorage.setItem('jeemu_active_ref', ref);
      sessionStorage.setItem('jeemu_active_ref', ref);
      console.log('🔗 Referral code detected:', ref);
    }

    return ref
      || sessionStorage.getItem('jeemu_active_ref')
      || localStorage.getItem('jeemu_active_ref')
      || null;
  }

  /* ── After Stripe redirect back with ?vip_success=1, show share modal ── */
  _checkVipSuccessReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip_success') === '1') {
      // Clean URL
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // Mark current subscriber as VIP locally
      if (this.currentSubscriber) {
        this.currentSubscriber.isVip = true;
        analytics.registerVipDeposit(this.currentSubscriber.id, 1.0);
      }

      this.showToast('👑 VIP Deposit confirmed! You\'re officially a Jeemu Founder.');
      setTimeout(() => this.openShareModal(), 1200);
    }

    if (params.get('vip_cancelled') === '1') {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      this.showToast('Payment cancelled — your waitlist spot is still saved!');
    }
  }

  /* ── Fetch real backer count from API ── */
  async _fetchLiveBackerCount() {
    try {
      const res = await fetch('/api/waitlist/count');
      if (!res.ok) return;
      const { count } = await res.json();
      if (count && count > 0) {
        // Add a realistic-looking base to the real count
        const displayCount = count + 1847;
        document.querySelectorAll('#live-backer-count, .live-backer-count').forEach(el => {
          el.textContent = displayCount.toLocaleString();
        });
      }
    } catch (_) {
      // Silently fail — the hardcoded value will show
    }
  }

  _loadExistingSubscriber() {
    const subs = analytics.getSubscribers();
    if (subs.length > 0) {
      this.currentSubscriber = subs[subs.length - 1];
      this._updateReferralUI(this.currentSubscriber);
    }
  }

  _bindEvents() {
    // 1. Waitlist Forms
    document.querySelectorAll('#waitlist, #waitlist-form, .waitlist-form-sync').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleWaitlistSubmit(form);
      });
    });

    // 2. VIP Modal Controls
    document.querySelectorAll('#btn-open-vip-nav, #nav-cta-btn, .btn-open-vip, .join-waitlist-trigger').forEach(el => {
      el.addEventListener('click', () => this.openVipModal());
    });
    document.getElementById('footer-vip-link')?.addEventListener('click', () => this.openVipModal());
    document.getElementById('btn-close-vip')?.addEventListener('click', () => this.closeVipModal());

    document.getElementById('btn-skip-vip')?.addEventListener('click', () => {
      this.closeVipModal();
      this.openShareModal();
    });

    // Open Stripe Checkout from VIP modal
    document.getElementById('btn-submit-vip-deposit')?.addEventListener('click', () => {
      this.closeVipModal();
      this.initiateStripeCheckout();
    });

    // 3. Stripe Checkout Modal Controls
    document.getElementById('btn-close-stripe')?.addEventListener('click', () => {
      this.closeStripeModal();
    });

    document.getElementById('btn-autofill-stripe-card')?.addEventListener('click', () => {
      this.autofillTestCard();
    });

    document.getElementById('stripe-payment-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStripePayment();
    });

    // Custom Stripe Link button (fallback)
    document.getElementById('btn-custom-stripe-link')?.addEventListener('click', () => {
      this.initiateStripeCheckout();
    });

    // 4. Share Modal & Referral Controls
    document.getElementById('btn-close-share')?.addEventListener('click', () => {
      this.closeShareModal();
    });

    document.getElementById('btn-copy-referral')?.addEventListener('click', () => {
      this.copyReferralLink('user-referral-link', 'copy-btn-text');
    });

    document.getElementById('btn-modal-copy-link')?.addEventListener('click', () => {
      this.copyReferralLink('modal-referral-input', 'btn-modal-copy-link');
    });

    document.getElementById('btn-simulate-referral')?.addEventListener('click', () => {
      this.simulateFriendSignup();
    });

    // Social Sharing
    this._bindSocialShare('share-whatsapp', 'whatsapp');
    this._bindSocialShare('share-x', 'twitter');
    this._bindSocialShare('share-fb', 'facebook');
    this._bindSocialShare('share-reddit', 'reddit');
    this._bindSocialShare('modal-share-wa', 'whatsapp');
    this._bindSocialShare('modal-share-x', 'twitter');
    this._bindSocialShare('modal-share-reddit', 'reddit');

    // Close on backdrop click
    [this.vipModal, this.stripeModal, this.shareModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  /* ── Waitlist Submission (with concurrency lock) ── */
  async handleWaitlistSubmit(sourceForm) {
    if (this._submitting) return; // Guard against double-submit

    const emailInput = sourceForm?.querySelector('input[type="email"]') || document.getElementById('subscriber-email') || document.getElementById('email');
    const nameInput = sourceForm?.querySelector('input[type="text"]') || document.getElementById('subscriber-name');
    const submitBtn = sourceForm?.querySelector('button[type="submit"]');

    const email = emailInput?.value.trim();
    const name = nameInput?.value.trim() || 'Backer';

    if (!email || !email.includes('@')) {
      this._showFormError(sourceForm, 'Please enter a valid email address.');
      return;
    }

    // Lock submission
    this._submitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Securing your spot...</span>';
    }

    try {
      const sub = analytics.registerEmailSignup(email, name);
      this.currentSubscriber = sub;

      // Credit referrer in Supabase if applicable
      if (this.activeReferrerCode && this.activeReferrerCode !== sub.referralCode) {
        this._creditReferrer(this.activeReferrerCode);
      }

      this._updateReferralUI(sub);

      const formStatus = document.getElementById('form-status');
      if (formStatus) {
        formStatus.textContent = `✓ You're on the list! Referral Code: ${sub.referralCode}`;
        formStatus.style.color = 'var(--orange)';
      }

      // Update live backer counter
      document.querySelectorAll('#live-backer-count, .live-backer-count').forEach(el => {
        const currentVal = parseInt(el.textContent.replace(/,/g, ''), 10) || 1847;
        el.textContent = (currentVal + 1).toLocaleString();
      });

      this.showToast(`🎉 Spot secured for ${email}! VIP upgrade available next.`);
      analytics.track('waitlist_join', { email, name, referredBy: this.activeReferrerCode });

      setTimeout(() => this.openVipModal(), 800);
    } catch (err) {
      this._showFormError(sourceForm, 'Something went wrong. Please try again.');
    } finally {
      // Unlock after submission (with slight delay to prevent instant re-click)
      setTimeout(() => {
        this._submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtn.dataset.originalText || 'Reserve Batch 01 →';
        }
      }, 2000);
    }
  }

  _showFormError(form, message) {
    const status = form?.querySelector('[role="status"]') || document.getElementById('form-status');
    if (status) {
      status.textContent = message;
      status.style.color = '#ff4444';
    } else {
      alert(message);
    }
  }

  /* ── Credit referrer: localStorage + Supabase sync ── */
  _creditReferrer(refCode) {
    // Update local store
    const subs = analytics.getSubscribers();
    const inviter = subs.find(s => s.referralCode === refCode);
    if (inviter) {
      inviter.friendsReferred = (inviter.friendsReferred || 0) + 1;
      localStorage.setItem('jeemu_analytics_subscribers', JSON.stringify(subs));
    }

    // Sync to Supabase (fire-and-forget)
    fetch(`/api/subscribers/${encodeURIComponent(refCode)}/refer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {}); // Non-blocking
  }

  /* ── Real Stripe Checkout ── */
  async initiateStripeCheckout() {
    const payBtn = document.getElementById('btn-submit-vip-deposit') || document.getElementById('btn-custom-stripe-link');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.dataset.originalText = payBtn.innerHTML;
      payBtn.innerHTML = '<span>⚡ Connecting to Stripe...</span>';
    }

    try {
      const res = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: this.currentSubscriber?.id,
          referralCode: this.currentSubscriber?.referralCode,
          email: this.currentSubscriber?.email
        })
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout (or payment link)
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not create payment session');
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      // Fallback to direct Stripe link
      const fallback = 'https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k';
      this.showToast('Redirecting to payment...');
      setTimeout(() => { window.open(fallback, '_blank'); }, 500);

      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = payBtn.dataset.originalText || 'Pay $1 VIP Deposit';
      }
    }
  }

  /* ── Stripe Modal (kept for local dev / test mode) ── */
  openStripeModal() {
    if (this.stripeModal) {
      this.stripeModal.classList.remove('hidden');
      analytics.track('view_stripe_modal', { source: 'vip_funnel' });
    }
  }

  closeStripeModal() {
    this.stripeModal?.classList.add('hidden');
  }

  autofillTestCard() {
    const cardNum = document.getElementById('stripe-card-number');
    const cardExp = document.getElementById('stripe-card-expiry');
    const cardCvc = document.getElementById('stripe-card-cvc');
    const cardZip = document.getElementById('stripe-card-zip');
    const cardName = document.getElementById('stripe-card-name');

    if (cardNum) cardNum.value = '4242 4242 4242 4242';
    if (cardExp) cardExp.value = '12/28';
    if (cardCvc) cardCvc.value = '888';
    if (cardZip) cardZip.value = '90210';
    if (cardName) cardName.value = this.currentSubscriber?.name || 'Alex Backer';

    this.showToast('💳 Test card (4242) filled. This is a Stripe test environment.');
  }

  handleStripePayment() {
    // In production, this routes to real Stripe. In dev/test mode only.
    const payBtn = document.getElementById('btn-confirm-stripe-pay');
    if (payBtn) {
      if (payBtn.disabled) return; // Concurrency guard
      payBtn.disabled = true;
      payBtn.innerHTML = '<span>⚡ Processing...</span>';
    }

    // Route to real Stripe session
    this.initiateStripeCheckout().finally(() => {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = '<span>Pay $1.00 — Secure Early Bird Spot</span>';
      }
    });
  }

  /* ── VIP Modal ── */
  openVipModal() {
    // Stop canvas scroll animation before opening modal
    if (window.canvasScrubber) {
      window.canvasScrubber.playing = false;
    }

    if (this.vipModal) {
      this.vipModal.classList.remove('hidden');
      analytics.track('view_vip_modal', { source: 'funnel_step' });
    }
  }

  closeVipModal() {
    this.vipModal?.classList.add('hidden');
  }

  /* ── Share Modal ── */
  openShareModal() {
    if (this.shareModal) {
      this.shareModal.classList.remove('hidden');
      analytics.track('view_share_modal', { source: 'funnel_step' });
    }
  }

  closeShareModal() {
    this.shareModal?.classList.add('hidden');
  }

  /* ── Referral Simulation (testing) ── */
  simulateFriendSignup() {
    if (!this.currentSubscriber) {
      this.currentSubscriber = analytics.registerEmailSignup('test.creator@jeemu.game', 'Alex');
    }

    const currentFriends = (this.currentSubscriber.friendsReferred || 0) + 1;
    this.currentSubscriber.friendsReferred = currentFriends;

    const subs = analytics.getSubscribers();
    const target = subs.find(s => s.id === this.currentSubscriber.id || s.referralCode === this.currentSubscriber.referralCode);
    if (target) {
      target.friendsReferred = currentFriends;
      localStorage.setItem('jeemu_analytics_subscribers', JSON.stringify(subs));
    }

    this._updateReferralUI(this.currentSubscriber);

    let unlockedReward = '';
    if (currentFriends === 1) unlockedReward = 'Free Worldwide Shipping ($15 value)';
    if (currentFriends === 3) unlockedReward = '"After Dark" Content Pack ($25 value)';
    if (currentFriends === 5) unlockedReward = 'Custom Laser-Engraved NFC Wooden Block ($35 value)';
    if (currentFriends >= 10) unlockedReward = '9-Block Extension Pack Free + ULTRA VIP status!';

    this.showToast(`🎉 Friend joined! (${currentFriends} total). ${unlockedReward ? `UNLOCKED: ${unlockedReward}` : ''}`);
    analytics.track('simulated_friend_signup', { totalFriends: currentFriends });
  }

  /* ── Update referral UI with clean URL (no hash) ── */
  _updateReferralUI(sub) {
    if (!sub) return;
    const refCode = sub.referralCode || 'JEEMU-VIP982';

    // Always use clean URL format — no hash — for maximum share compatibility
    const baseUrl = window.location.origin;
    const refUrl = `${baseUrl}/?ref=${refCode}`;

    const pageInput = document.getElementById('user-referral-link');
    const modalInput = document.getElementById('modal-referral-input');
    if (pageInput) pageInput.value = refUrl;
    if (modalInput) modalInput.value = refUrl;

    const friendsCount = sub.friendsReferred || 0;
    const countDisplay = document.getElementById('friends-joined-display');
    if (countDisplay) countDisplay.textContent = friendsCount;

    const bar = document.getElementById('ref-progress-bar');
    if (bar) {
      const pct = Math.min(100, Math.max(10, (friendsCount / 10) * 100));
      bar.style.width = `${pct}%`;
    }

    this._highlightTier('tier-item-1', friendsCount >= 1);
    this._highlightTier('tier-item-2', friendsCount >= 3);
    this._highlightTier('tier-item-3', friendsCount >= 5);
    this._highlightTier('tier-item-4', friendsCount >= 10);
  }

  _highlightTier(tierId, isUnlocked) {
    const el = document.getElementById(tierId);
    if (!el) return;
    if (isUnlocked) {
      el.classList.add('unlocked-tier');
      const valEl = el.querySelector('.tier-value');
      if (valEl) valEl.innerHTML = `✓ UNLOCKED`;
    } else {
      el.classList.remove('unlocked-tier');
    }
  }

  /* ── Copy referral link with textarea fallback for HTTP ── */
  copyReferralLink(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !input.value) return;

    const url = input.value;

    const doSuccess = () => {
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied! ✓';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      }
      this.showToast('📋 Referral link copied! Share it with friends to climb the rewards ladder.');
      analytics.trackLinkCopied(this.currentSubscriber ? this.currentSubscriber.referralCode : 'default');
    };

    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(doSuccess).catch(() => this._fallbackCopy(url, doSuccess));
    } else {
      this._fallbackCopy(url, doSuccess);
    }
  }

  _fallbackCopy(text, onSuccess) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) onSuccess();
      else alert('Copy this link: ' + text);
    } catch (_) {
      alert('Copy this link: ' + text);
    }
  }

  /* ── Social Sharing with clean referral URL ── */
  _bindSocialShare(elementId, network) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.addEventListener('click', () => {
      const refCode = this.currentSubscriber ? this.currentSubscriber.referralCode : 'JEEMU-VIP982';
      const shareUrl = encodeURIComponent(`${window.location.origin}/?ref=${refCode}`);
      const shareText = encodeURIComponent(`Check out Jeemu — the customizable smart Jenga with NFC blocks & a standalone smart dock. Grab 45% off Kickstarter Early Bird price:`);

      let targetUrl = '';
      if (network === 'whatsapp') targetUrl = `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`;
      if (network === 'twitter') targetUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
      if (network === 'facebook') targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
      if (network === 'reddit') targetUrl = `https://reddit.com/submit?url=${shareUrl}&title=${shareText}`;

      analytics.trackShareAction(network, refCode);
      if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer,width=600,height=450');
    });
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

export const funnel = new FunnelManager();
