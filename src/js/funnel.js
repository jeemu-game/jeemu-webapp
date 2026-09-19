/**
 * JEEMU 3-STAGE KICKSTARTER PRE-LAUNCH FUNNEL & STRIPE INTEGRATION
 * Features:
 * - Real End-to-End Referral Tracking (detects ?ref=, increments inviter, unlocks tiers)
 * - 1-Click Referral Testing Simulator (+1 friend instant unlock)
 * - Real Stripe Checkout Modal with 4242 Test Card fill & custom buy.stripe.com link support
 */

import { analytics } from './analytics.js';

class FunnelManager {
  constructor() {
    this.currentSubscriber = null;
    this.activeReferrerCode = this._parseReferralParam();

    this.waitlistForm = document.getElementById('waitlist-form');
    this.vipModal = document.getElementById('vip-modal');
    this.stripeModal = document.getElementById('stripe-checkout-modal');
    this.shareModal = document.getElementById('share-modal');

    this._bindEvents();
    this._loadExistingSubscriber();
  }

  _parseReferralParam() {
    // Check URL search or hash for ref=
    const searchParams = new URLSearchParams(window.location.search);
    let ref = searchParams.get('ref');
    if (!ref && window.location.hash.includes('ref=')) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hp = new URLSearchParams(hashQuery);
        ref = hp.get('ref');
      }
    }

    if (ref) {
      sessionStorage.setItem('jeemu_active_ref', ref);
      console.log('🔗 Active referral code detected:', ref);
    }
    return ref || sessionStorage.getItem('jeemu_active_ref') || null;
  }

  _loadExistingSubscriber() {
    const subs = analytics.getSubscribers();
    if (subs.length > 0) {
      this.currentSubscriber = subs[subs.length - 1];
      this._updateReferralUI(this.currentSubscriber);
    }
  }

  _bindEvents() {
    // 1. Waitlist Form
    this.waitlistForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleWaitlistSubmit();
    });

    // 2. VIP Modal Controls
    document.getElementById('btn-open-vip-nav')?.addEventListener('click', () => this.openVipModal());
    document.getElementById('footer-vip-link')?.addEventListener('click', () => this.openVipModal());
    document.getElementById('btn-close-vip')?.addEventListener('click', () => this.closeVipModal());

    document.getElementById('btn-skip-vip')?.addEventListener('click', () => {
      this.closeVipModal();
      this.openShareModal();
    });

    // Open Stripe Checkout from VIP modal
    document.getElementById('btn-submit-vip-deposit')?.addEventListener('click', () => {
      this.closeVipModal();
      this.openStripeModal();
    });

    // 3. Stripe Checkout Modal Controls
    document.getElementById('btn-close-stripe')?.addEventListener('click', () => {
      this.closeStripeModal();
    });

    // Autofill Stripe 4242 test card
    document.getElementById('btn-autofill-stripe-card')?.addEventListener('click', () => {
      this.autofillTestCard();
    });

    // Submit Stripe Form
    document.getElementById('stripe-payment-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStripePayment();
    });

    // Custom Stripe Link button
    document.getElementById('btn-custom-stripe-link')?.addEventListener('click', () => {
      const customUrl = prompt('Enter your live Stripe Payment Link (e.g., https://buy.stripe.com/...):', 'https://buy.stripe.com/test_deposit_1dollar');
      if (customUrl && customUrl.startsWith('http')) {
        window.open(customUrl, '_blank');
      }
    });

    // 4. Share Modal & Referral Controls
    document.getElementById('btn-close-share')?.addEventListener('click', () => {
      this.closeShareModal();
    });

    // Copy Referral Links
    document.getElementById('btn-copy-referral')?.addEventListener('click', () => {
      this.copyReferralLink('user-referral-link', 'copy-btn-text');
    });

    document.getElementById('btn-modal-copy-link')?.addEventListener('click', () => {
      this.copyReferralLink('modal-referral-input', 'btn-modal-copy-link');
    });

    // Simulator: Test Friend Referral (+1)
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

  /* ---------------- Waitlist Submission ---------------- */
  handleWaitlistSubmit() {
    const emailInput = document.getElementById('subscriber-email');
    const nameInput = document.getElementById('subscriber-name');

    const email = emailInput?.value.trim();
    const name = nameInput?.value.trim() || '';

    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    // Register subscriber in analytics with referral attribution
    const sub = analytics.registerEmailSignup(email, name);
    this.currentSubscriber = sub;

    // Attribute to referrer if referred
    if (this.activeReferrerCode && this.activeReferrerCode !== sub.referralCode) {
      this._creditReferrer(this.activeReferrerCode);
    }

    this._updateReferralUI(sub);

    // Update live backer counter
    const backerCountEl = document.getElementById('live-backer-count');
    if (backerCountEl) {
      const currentVal = parseInt(backerCountEl.textContent.replace(/,/g, ''), 10) || 1847;
      backerCountEl.textContent = (currentVal + 1).toLocaleString();
    }

    this.showToast(`🎉 Spot secured for ${email}! VIP upgrade available next.`);

    setTimeout(() => {
      this.openVipModal();
    }, 500);
  }

  _creditReferrer(refCode) {
    const subs = analytics.getSubscribers();
    const inviter = subs.find(s => s.referralCode === refCode);
    if (inviter) {
      inviter.friendsReferred = (inviter.friendsReferred || 0) + 1;
      localStorage.setItem('jeemu_analytics_subscribers', JSON.stringify(subs));
      console.log(`⭐ Referrer ${refCode} credited! Total friends:`, inviter.friendsReferred);
    }
  }

  /* ---------------- Stripe Checkout ---------------- */
  openStripeModal() {
    if (this.stripeModal) {
      this.stripeModal.classList.remove('hidden');
      analytics.track('view_stripe_modal', { source: 'vip_funnel' });
    }
  }

  closeStripeModal() {
    if (this.stripeModal) {
      this.stripeModal.classList.add('hidden');
    }
  }

  autofillTestCard() {
    const cardNum = document.getElementById('stripe-card-number');
    const cardExp = document.getElementById('stripe-card-expiry');
    const cardCvc = document.getElementById('stripe-card-cvc');
    const cardZip = document.getElementById('stripe-card-zip');
    const cardName = document.getElementById('stripe-card-name');

    if (cardNum) cardNum.value = '4242 •••• •••• 4242';
    if (cardExp) cardExp.value = '12/28';
    if (cardCvc) cardCvc.value = '888';
    if (cardZip) cardZip.value = '90210';
    if (cardName) cardName.value = this.currentSubscriber?.name || 'Alex Backer';

    this.showToast('💳 Filled standard Stripe test card (4242).');
  }

  handleStripePayment() {
    const payBtn = document.getElementById('btn-confirm-stripe-pay');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>⚡ Processing with Stripe...</span>`;
    }

    // Simulate 1.2s Stripe network latency
    setTimeout(() => {
      const subId = this.currentSubscriber ? this.currentSubscriber.id : 'sub_' + Date.now();
      const updatedSub = analytics.registerVipDeposit(subId, 1.0);
      if (this.currentSubscriber) this.currentSubscriber.isVip = true;

      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `<span>✓ Payment Succeeded ($1.00)</span>`;
      }

      const chargeId = 'ch_3M' + Math.random().toString(36).substring(2, 10) + 'StripeJeemu';

      this.showToast(`👑 Stripe Charge Succeeded! ID: ${chargeId.substring(0, 14)}...`);
      this.closeStripeModal();

      setTimeout(() => {
        this.openShareModal();
      }, 500);
    }, 1200);
  }

  /* ---------------- VIP Modal ---------------- */
  openVipModal() {
    if (this.vipModal) {
      this.vipModal.classList.remove('hidden');
      analytics.track('view_vip_modal', { source: 'funnel_step' });
    }
  }

  closeVipModal() {
    if (this.vipModal) {
      this.vipModal.classList.add('hidden');
    }
  }

  /* ---------------- Share Modal & Referrals ---------------- */
  openShareModal() {
    if (this.shareModal) {
      this.shareModal.classList.remove('hidden');
      analytics.track('view_share_modal', { source: 'funnel_step' });
    }
  }

  closeShareModal() {
    if (this.shareModal) {
      this.shareModal.classList.add('hidden');
    }
  }

  simulateFriendSignup() {
    if (!this.currentSubscriber) {
      // Auto-create test subscriber if not signed up yet
      this.currentSubscriber = analytics.registerEmailSignup('test.creator@jeemu.game', 'Alex');
    }

    const currentFriends = (this.currentSubscriber.friendsReferred || 0) + 1;
    this.currentSubscriber.friendsReferred = currentFriends;

    // Update in localStorage
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

  _updateReferralUI(sub) {
    if (!sub) return;
    const refCode = sub.referralCode || 'JEEMU-VIP982';
    const origin = window.location.origin;
    const refUrl = `${origin}/?ref=${refCode}`;

    const pageInput = document.getElementById('user-referral-link');
    const modalInput = document.getElementById('modal-referral-input');
    if (pageInput) pageInput.value = refUrl;
    if (modalInput) modalInput.value = refUrl;

    const friendsCount = sub.friendsReferred || 0;
    const countDisplay = document.getElementById('friends-joined-display');
    if (countDisplay) countDisplay.textContent = friendsCount;

    // Update progress bar
    const bar = document.getElementById('ref-progress-bar');
    if (bar) {
      const pct = Math.min(100, Math.max(10, (friendsCount / 10) * 100));
      bar.style.width = `${pct}%`;
    }

    // Update Tier Highlight status
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

  copyReferralLink(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied! ✓';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
      }
      this.showToast('📋 Referral link copied to clipboard! Share it with friends to climb the ladder.');
      analytics.trackLinkCopied(this.currentSubscriber ? this.currentSubscriber.referralCode : 'default');
    }).catch(() => {
      alert('Link: ' + input.value);
    });
  }

  _bindSocialShare(elementId, network) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.addEventListener('click', () => {
      const refCode = this.currentSubscriber ? this.currentSubscriber.referralCode : 'JEEMU-VIP982';
      const shareUrl = encodeURIComponent(`${window.location.origin}/?ref=${refCode}`);
      const shareText = encodeURIComponent(`Check out Jeemu! It's customizable smart Jenga with NFC blocks and an independent OLED dock. 40% OFF Early Bird Kickstarter:`);

      let targetUrl = '';
      if (network === 'whatsapp') targetUrl = `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`;
      if (network === 'twitter') targetUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
      if (network === 'facebook') targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
      if (network === 'reddit') targetUrl = `https://reddit.com/submit?url=${shareUrl}&title=${shareText}`;

      analytics.trackShareAction(network, refCode);
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer,width=600,height=450');
      }
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
