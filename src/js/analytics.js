/**
 * JEEMU BUILT-IN USER BEHAVIOUR & CLICK ANALYTICS ENGINE
 * Captures clicks, coordinates, scroll depths, dwell times, and funnel conversions.
 */

const STORAGE_KEY_EVENTS = 'jeemu_analytics_events';
const STORAGE_KEY_SUBSCRIBERS = 'jeemu_analytics_subscribers';
const STORAGE_KEY_VISITOR = 'jeemu_analytics_visitor';

class AnalyticsEngine {
  constructor() {
    this.visitorId = this._getOrCreateVisitorId();
    this.sessionId = this._getOrCreateSessionId();
    this.startTime = Date.now();
    this.scrollMilestones = new Set();
    this.listeners = [];
    this.utmParams = this._parseUtm();
    // Check localStorage for persisted referral (set by funnel.js before analytics init)
    this.refCode = this.utmParams.ref
      || sessionStorage.getItem('jeemu_active_ref')
      || localStorage.getItem('jeemu_active_ref')
      || null;
    this.activeDwellSeconds = 0;
    this._eventWriteQueue = null; // Debounce timer for batch writes
    this._pendingEvents = null;   // Batch buffer

    this._initEvents();
    this._initAutoTracking();
  }

  /* ---------------- Identification & Session ---------------- */
  _getOrCreateVisitorId() {
    let vid = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_VISITOR, vid);
    }
    return vid;
  }

  _getOrCreateSessionId() {
    let sid = sessionStorage.getItem('jeemu_session_id');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('jeemu_session_id', sid);
    }
    return sid;
  }

  _parseUtm() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || 'direct',
      utm_medium: params.get('utm_medium') || 'organic',
      utm_campaign: params.get('utm_campaign') || 'launch',
      ref: params.get('ref') || null
    };
  }

  _initEvents() {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify([]));
    }
  }

  getEvents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
    } catch {
      return [];
    }
  }

  getSubscribers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_SUBSCRIBERS) || '[]');
    } catch {
      return [];
    }
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  _notify(event) {
    this.listeners.forEach(cb => {
      try { cb(event); } catch (err) { console.error('Analytics listener error:', err); }
    });
  }

  /* ---------------- Core Event Dispatcher ---------------- */
  track(type, data = {}) {
    const event = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type,
      timestamp: Date.now(),
      isoTime: new Date().toLocaleTimeString(),
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      url: window.location.pathname + window.location.hash,
      utm: this.utmParams,
      dwellSeconds: this.activeDwellSeconds,
      data
    };

    // Debounced batch write to prevent localStorage race on rapid events
    if (!this._pendingEvents) {
      this._pendingEvents = this.getEvents();
    }
    this._pendingEvents.push(event);
    if (this._pendingEvents.length > 500) this._pendingEvents.shift();

    clearTimeout(this._eventWriteQueue);
    this._eventWriteQueue = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this._pendingEvents));
      } catch (e) { /* quota exceeded — gracefully ignore */ }
      this._pendingEvents = null;
      this._eventWriteQueue = null;
    }, 50);

    this._notify(event);

    // Send to backend API (non-blocking)
    try {
      fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => {});
    } catch (e) {}

    return event;
  }

  /* ---------------- Automated Tracking Listeners ---------------- */
  _initAutoTracking() {
    // 1. Initial Page View
    this.track('page_view', {
      referrer: document.referrer || 'direct',
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      userAgent: navigator.userAgent
    });

    // 2. Global Click Tracker (captures element, label, and exact coordinates)
    document.addEventListener('click', (e) => {
      // Don't track clicks inside analytics drawer itself
      if (e.target.closest('#analytics-drawer') || e.target.closest('#analytics-floating-btn')) {
        return;
      }

      const target = e.target.closest('button, a, input, select, summary, .wooden-block-btn, .cat-pill') || e.target;
      const rect = target.getBoundingClientRect();
      const pageX = e.pageX;
      const pageY = e.pageY;
      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);

      const xPercent = Number(((pageX / docWidth) * 100).toFixed(2));
      const yPercent = Number(((pageY / docHeight) * 100).toFixed(2));

      let targetLabel = (target.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 50);
      if (!targetLabel && target.getAttribute('aria-label')) {
        targetLabel = target.getAttribute('aria-label');
      }
      if (!targetLabel && target.placeholder) {
        targetLabel = 'Input: ' + target.placeholder;
      }

      this.track('click', {
        tag: target.tagName.toLowerCase(),
        id: target.id || null,
        className: (target.className && typeof target.className === 'string') ? target.className.substring(0, 60) : '',
        label: targetLabel || target.tagName.toLowerCase(),
        x: pageX,
        y: pageY,
        xPercent,
        yPercent,
        section: this._findEnclosingSection(target)
      });
    }, { passive: true });

    // 3. Scroll Depth Tracker (25%, 50%, 75%, 100%)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const winHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const scrollPercent = Math.min(100, Math.round(((scrollTop + winHeight) / docHeight) * 100));

        [25, 50, 75, 100].forEach(milestone => {
          if (scrollPercent >= milestone && !this.scrollMilestones.has(milestone)) {
            this.scrollMilestones.add(milestone);
            this.track('scroll_depth', { depth: milestone });
          }
        });
      }, 100);
    }, { passive: true });

    // 4. Dwell Time Heartbeat (Every 5 seconds)
    setInterval(() => {
      if (!document.hidden) {
        this.activeDwellSeconds += 5;
      }
    }, 5000);
  }

  _findEnclosingSection(el) {
    const sec = el.closest('section, header, footer, .modal-card');
    return sec ? (sec.id || sec.className.split(' ')[0] || sec.tagName.toLowerCase()) : 'body';
  }

  /* ---------------- Funnel Methods ---------------- */
  registerEmailSignup(email, name = '') {
    const subscriber = {
      id: 'sub_' + Date.now(),
      email,
      name: name || 'Friend',
      referralCode: 'JEEMU-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      referredBy: this.refCode,
      timestamp: Date.now(),
      isVip: false,
      depositAmount: 0,
      friendsReferred: 0
    };

    const subscribers = this.getSubscribers();
    // Always call backend API to ensure email dispatch & server sync
    try {
      fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, ref: this.refCode })
      }).catch(() => {});
    } catch (e) {}

    // Check if email already exists locally
    const existingIndex = subscribers.findIndex(s => s.email.toLowerCase() === email.toLowerCase());
    if (existingIndex >= 0) {
      return subscribers[existingIndex];
    }

    subscribers.push(subscriber);
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(subscribers));

    this.track('email_signup', {
      email,
      name,
      referralCode: subscriber.referralCode,
      referredBy: this.refCode
    });

    return subscriber;
  }

  registerVipDeposit(subscriberId, amount = 1.0) {
    const subscribers = this.getSubscribers();
    const sub = subscribers.find(s => s.id === subscriberId || s.referralCode === subscriberId);
    if (sub) {
      sub.isVip = true;
      sub.depositAmount = amount;
      sub.vipTimestamp = Date.now();
      localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(subscribers));
    }

    this.track('vip_deposit', {
      subscriberId: sub ? sub.id : 'unknown',
      amount,
      currency: 'USD'
    });

    // Send to backend API
    try {
      fetch('/api/subscribers/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId: sub?.id, referralCode: sub?.referralCode, amount })
      }).catch(() => {});
    } catch (e) {}

    return sub;
  }

  trackSimulatorBlockTap(category, blockId, promptText) {
    this.track('simulator_block_tap', {
      category,
      blockId,
      promptSnippet: promptText.substring(0, 60)
    });
  }

  trackShareAction(network, referralCode) {
    this.track('share_click', {
      network,
      referralCode
    });
  }

  trackLinkCopied(referralCode) {
    this.track('referral_link_copied', {
      referralCode
    });
  }

  /* ---------------- Metrics & Calculations ---------------- */
  getMetrics() {
    const events = this.getEvents();
    const subscribers = this.getSubscribers();

    const uniqueVisitors = new Set(events.map(e => e.visitorId)).size || 1;
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size || 1;
    const clicks = events.filter(e => e.type === 'click');
    const emailSignups = subscribers.length;
    const vipDeposits = subscribers.filter(s => s.isVip).length;

    const convRate = uniqueVisitors > 0 ? ((emailSignups / uniqueVisitors) * 100).toFixed(1) : 0;
    const vipRate = emailSignups > 0 ? ((vipDeposits / emailSignups) * 100).toFixed(1) : 0;

    // Highest scroll depth reached in current session
    const scrollEvents = events.filter(e => e.type === 'scroll_depth');
    const maxScroll = scrollEvents.length > 0 ? Math.max(...scrollEvents.map(s => s.data.depth)) : 25;

    // Top clicked elements
    const clickCounts = {};
    clicks.forEach(c => {
      const key = (c.data.label || c.data.id || c.data.tag).substring(0, 30);
      clickCounts[key] = (clickCounts[key] || 0) + 1;
    });

    const topClicks = Object.entries(clickCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Funnel Steps
    const funnel = {
      landed: uniqueVisitors,
      simulator: events.filter(e => e.type === 'simulator_block_tap').length,
      email: emailSignups,
      vipViewed: events.filter(e => e.type === 'click' && (e.data.id === 'btn-open-vip-nav' || e.data.label.includes('VIP'))).length + (emailSignups > 0 ? 1 : 0),
      vipReserved: vipDeposits,
      shared: events.filter(e => e.type === 'referral_link_copied' || e.type === 'share_click').length
    };

    return {
      uniqueVisitors,
      uniqueSessions,
      totalClicks: clicks.length,
      emailSignups,
      vipDeposits,
      convRate,
      vipRate,
      dwellSeconds: this.activeDwellSeconds,
      maxScroll,
      topClicks,
      funnel,
      subscribers
    };
  }

  /* ---------------- CSV Export Utilities ---------------- */
  exportSubscribersCSV() {
    const subs = this.getSubscribers();
    if (subs.length === 0) {
      alert('No subscribers recorded yet! Submit the waitlist form first.');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Referral Code', 'Referred By', 'Is VIP', 'Deposit USD', 'Signup Time'];
    const rows = subs.map(s => [
      s.id,
      `"${s.name}"`,
      `"${s.email}"`,
      s.referralCode,
      s.referredBy || 'direct',
      s.isVip ? 'YES' : 'NO',
      s.depositAmount || 0,
      new Date(s.timestamp).toISOString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this._downloadFile(csvContent, `jeemu_subscribers_${Date.now()}.csv`, 'text/csv');
  }

  exportEventsCSV() {
    const events = this.getEvents();
    if (events.length === 0) {
      alert('No events logged yet.');
      return;
    }

    const headers = ['Event ID', 'Type', 'Timestamp', 'Visitor ID', 'Session ID', 'Tag', 'Label', 'X%', 'Y%', 'Section'];
    const rows = events.map(e => [
      e.id,
      e.type,
      new Date(e.timestamp).toISOString(),
      e.visitorId,
      e.sessionId,
      (e.data && e.data.tag) || '',
      `"${((e.data && e.data.label) || '').replace(/"/g, '""')}"`,
      (e.data && e.data.xPercent) || '',
      (e.data && e.data.yPercent) || '',
      (e.data && e.data.section) || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this._downloadFile(csvContent, `jeemu_clickstream_${Date.now()}.csv`, 'text/csv');
  }

  _downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------- Seed Mock Data & Reset ---------------- */
  seedMockData() {
    const mockNames = ['Alex Rivera', 'Chloe Bennett', 'Marcus Chen', 'Sophie Vance', 'Liam Patel', 'Emma Dubois'];
    const mockDomains = ['gmail.com', 'outlook.com', 'hey.com', 'icloud.com'];

    mockNames.forEach((name, idx) => {
      const email = `${name.toLowerCase().replace(/\s+/, '.')}${Math.floor(Math.random() * 90 + 10)}@${mockDomains[idx % mockDomains.length]}`;
      const sub = this.registerEmailSignup(email, name);
      if (idx % 2 === 0) {
        this.registerVipDeposit(sub.id, 1.0);
      }
    });

    // Mock some random clicks on primary sections
    for (let i = 0; i < 15; i++) {
      this.track('click', {
        tag: 'button',
        label: i % 2 === 0 ? 'Wooden Block Tap' : 'Claim 40% VIP Discount',
        x: Math.floor(Math.random() * 800 + 200),
        y: Math.floor(Math.random() * 1200 + 100),
        xPercent: Math.floor(Math.random() * 80 + 10),
        yPercent: Math.floor(Math.random() * 80 + 10),
        section: i % 2 === 0 ? 'simulator' : 'hero'
      });
    }

    this.track('scroll_depth', { depth: 50 });
    this.track('scroll_depth', { depth: 75 });
    this.track('scroll_depth', { depth: 100 });
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_SUBSCRIBERS);
    this._initEvents();
    this.scrollMilestones.clear();
    this.activeDwellSeconds = 0;
    this.track('reset_initiated', { note: 'All telemetry and subscribers cleared' });
  }
}

export const analytics = new AnalyticsEngine();
