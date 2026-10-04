/**
 * JEEMU SUBDOMAIN ROUTER & REAL-TIME DASHBOARD CONTROLLER
 * Ultra-clean routing across:
 * - launch.jeemu.fun
 * - feed.jeemu.fun
 * - chaos.jeemu.fun
 * - journey.jeemu.fun
 * - login.jeemu.fun
 * - admin.jeemu.fun
 * - dashboard.jeemu.fun
 * 
 * Supports native DNS hostnames, hash navigation, and clean navbar routing.
 */

import { router } from './router.js';

class SubdomainManager {
  constructor() {
    this.subdomains = ['launch', 'feed', 'chaos', 'journey', 'login', 'admin', 'dashboard', 'connect'];
    this.currentSubdomain = this._detectSubdomain();
    this.sseSource = null;
    window.subdomainManager = this;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._init());
    } else {
      this._init();
    }
  }

  _init() {
    this._initNavLinks();
    this._initAuthForm();
    this._initAdminView();
    this._routeToSubdomain(this.currentSubdomain);

    window.addEventListener('popstate', () => {
      this._routeToSubdomain(this._detectSubdomain());
    });
  }

  _detectSubdomain() {
    // 1. Hostname detection (e.g. dashboard.jeemu.fun or dashboard.localhost)
    const host = window.location.hostname;
    for (const sub of this.subdomains) {
      if (host.startsWith(`${sub}.`)) return sub;
    }

    // 2. Query parameter (?subdomain=dashboard)
    const params = new URLSearchParams(window.location.search);
    const subParam = params.get('subdomain');
    if (subParam && this.subdomains.includes(subParam)) {
      return subParam;
    }

    // 3. Hash fallback (#dashboard)
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash && this.subdomains.includes(hash)) {
      return hash;
    }

    return 'launch';
  }

  _initNavLinks() {
    document.querySelectorAll('[data-subdomain]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.subdomain;
        if (target) {
          this.switchSubdomain(target);
        }
      });
    });

    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = link.dataset.route;
        if (target && this.subdomains.includes(target)) {
          e.preventDefault();
          this.switchSubdomain(target);
        }
      });
    });
  }

  switchSubdomain(targetSubdomain) {
    if (!this.subdomains.includes(targetSubdomain)) return;
    this.currentSubdomain = targetSubdomain;

    // Update URL query cleanly without reload
    const url = new URL(window.location.href);
    url.searchParams.set('subdomain', targetSubdomain);
    window.history.pushState({}, '', url.toString());

    this._routeToSubdomain(targetSubdomain);
  }

  _routeToSubdomain(subdomain) {
    this.currentSubdomain = subdomain;

    // Auth gate: admin and dashboard require team login
    const protectedSubdomains = ['admin', 'dashboard'];
    const isLoggedIn = !!sessionStorage.getItem('jeemu_logged_in_member');

    if (protectedSubdomains.includes(subdomain) && !isLoggedIn) {
      subdomain = 'login';
      this.currentSubdomain = 'login';
      // Show a message on the login page
      setTimeout(() => {
        const loginMsg = document.getElementById('login-required-msg');
        if (loginMsg) {
          loginMsg.textContent = 'Authentication required to access this section.';
          loginMsg.style.display = 'block';
        }
      }, 100);
    }

    // Update active nav links
    document.querySelectorAll('[data-subdomain]').forEach(link => {
      if (link.dataset.subdomain === subdomain) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle view visibility
    this.subdomains.forEach(sub => {
      const el = document.getElementById(`view-${sub}`);
      if (el) {
        if (sub === subdomain) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update page title
    const titles = {
      launch: 'Jeemu — Customizable Smart Jenga | launch.jeemu.fun',
      feed: 'Engineering Updates & Devlogs | feed.jeemu.fun',
      chaos: 'The Chaos Lab & Tower Fails | chaos.jeemu.fun',
      journey: 'Hardware Evolution Timeline | journey.jeemu.fun',
      login: 'Team Authentication Gateway | login.jeemu.fun',
      admin: 'Backer & Content Management Console | admin.jeemu.fun',
      dashboard: 'Real-Time Telemetry & Click Heatmap | dashboard.jeemu.fun',
      connect: 'JEEMU Tower // Mobile Companion & Remote Tap | connect.jeemu.fun'
    };
    document.title = titles[subdomain] || 'Jeemu — Smart Jenga';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle specific subdomain logic
    if (subdomain === 'connect') {
      if (window.location.pathname !== '/connect.html' && window.location.pathname !== '/connect') {
        window.location.href = '/connect.html';
        return;
      }
    } else if (subdomain === 'feed') {
      router?.renderFeed();
    } else if (subdomain === 'chaos') {
      router?.renderChaos();
    } else if (subdomain === 'journey') {
      router?.renderJourney();
    } else if (subdomain === 'dashboard') {
      this._initRealTimeDashboard();
    } else {
      this._disconnectSSE();
    }

    if (subdomain === 'admin') {
      this.loadAdminSubscribers();
    }
  }

  /* ---------------- Real-Time Dashboard & Telemetry Stream ---------------- */
  async _initRealTimeDashboard() {
    this._fetchMetrics();

    // Periodic KPI polling backup (every 15s) while dashboard is active
    if (!this.metricsInterval) {
      this.metricsInterval = setInterval(() => this._fetchMetrics(), 15000);
    }

    // 1. Prefer Supabase Realtime WebSockets if cloud credentials configured
    const supabaseUrl = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_URL || 'https://quhpizadgfhhrdfompnm.supabase.co');
    const supabasePublishableKey = typeof import.meta !== 'undefined' && (
      import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 
      import.meta.env?.VITE_SUPABASE_ANON_KEY
    );

    if (supabaseUrl && supabasePublishableKey && !this.realtimeChannel) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const client = createClient(supabaseUrl, supabasePublishableKey);
        this.realtimeChannel = client.channel('jeemu-realtime')
          .on('broadcast', { event: '*' }, (payload) => {
            this._handleLiveSSEEvent(payload.payload || payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry_events' }, (payload) => {
            this._handleLiveSSEEvent({ type: 'telemetry_event', event: payload.new });
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscribers' }, (payload) => {
            this._handleLiveSSEEvent({ type: 'new_subscriber', subscriber: payload.new });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('⚡ Connected to Supabase Realtime Channel');
            }
          });
        return;
      } catch (err) {
        console.warn('Could not initialize Supabase Realtime, using fallback:', err);
      }
    }

    // 2. Fallback to SSE Stream for local development
    if (!this.sseSource) {
      try {
        this.sseSource = new EventSource('/api/telemetry/stream');

        this.sseSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            this._handleLiveSSEEvent(data);
          } catch (err) {
            console.error('Error parsing SSE payload:', err);
          }
        };

        this.sseSource.onerror = () => {
          console.warn('SSE stream reconnecting...');
        };
      } catch (err) {
        console.warn('SSE not supported, relying on periodic polling');
      }
    }
  }

  _disconnectSSE() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  _fetchMetrics() {
    const token = this._getAuthToken();
    fetch('/api/telemetry/metrics', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.status === 401) { this.showToast('Session expired. Please login again.'); return null; }
        return res.json();
      })
      .then(data => {
        if (data) this._updateDashboardKPIs(data);
      })
      .catch(err => console.error('Error fetching metrics:', err));
  }

  _getAuthToken() {
    // Read from cookie or fallback to sessionStorage
    const match = document.cookie.match(/jeemu_auth=([^;]+)/);
    if (match) return match[1];
    return sessionStorage.getItem('jeemu_auth_token') || null;
  }

  _updateDashboardKPIs(metrics) {
    const elVisitors = document.getElementById('dash-kpi-visitors');
    const elClicks = document.getElementById('dash-kpi-clicks');
    const elSignups = document.getElementById('dash-kpi-signups');
    const elConv = document.getElementById('dash-kpi-conv');
    const elVip = document.getElementById('dash-kpi-vip');
    const elRev = document.getElementById('dash-kpi-revenue');

    if (elVisitors) elVisitors.textContent = metrics.uniqueVisitors || 1;
    if (elClicks) elClicks.textContent = metrics.totalClicks || 0;
    if (elSignups) elSignups.textContent = metrics.emailSignups || 0;
    if (elConv) elConv.textContent = `${metrics.convRate || 0}%`;
    if (elVip) elVip.textContent = metrics.vipDeposits || 0;
    if (elRev) elRev.textContent = `$${metrics.vipRevenue || '0.00'}`;

    // Render Funnel
    if (metrics.funnel) {
      const f = metrics.funnel;
      const max = Math.max(f.landed, 1);
      this._setFunnelBar('dash-funnel-1', f.landed, max);
      this._setFunnelBar('dash-funnel-2', f.simulator, max);
      this._setFunnelBar('dash-funnel-3', f.email, max);
      this._setFunnelBar('dash-funnel-4', f.vipViewed, max);
      this._setFunnelBar('dash-funnel-5', f.vipReserved, max);
      this._setFunnelBar('dash-funnel-6', f.shared, max);
    }

    // Render Event Stream
    if (metrics.recentEvents) {
      const listEl = document.getElementById('dash-live-event-stream');
      if (listEl) {
        listEl.innerHTML = metrics.recentEvents.map(ev => this._renderEventItem(ev)).join('');
      }
    }

    // Draw Real-time Click Heatmap
    if (metrics.heatmapPoints) {
      this._drawDashboardHeatmap(metrics.heatmapPoints);
    }
  }

  _setFunnelBar(id, val, max) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.round((val / max) * 100);
    const bar = el.querySelector('.funnel-fill');
    const count = el.querySelector('.funnel-count');
    if (bar) bar.style.width = `${pct}%`;
    if (count) count.textContent = `${val} (${pct}%)`;
  }

  _handleLiveSSEEvent(payload) {
    const pulseBadge = document.getElementById('dash-live-pulse-badge');
    if (pulseBadge) {
      pulseBadge.classList.add('pulse-active');
      setTimeout(() => pulseBadge.classList.remove('pulse-active'), 800);
    }

    const listEl = document.getElementById('dash-live-event-stream');
    if (listEl && (payload.event || payload.subscriber)) {
      const ev = payload.event || {
        type: payload.type,
        isoTime: new Date().toLocaleTimeString(),
        data: payload.subscriber || {}
      };
      const itemHtml = this._renderEventItem(ev);
      listEl.insertAdjacentHTML('afterbegin', itemHtml);
    }

    if (payload.type === 'telemetry_event') {
      const elClicks = document.getElementById('dash-kpi-clicks');
      if (elClicks && payload.event && payload.event.type === 'click') {
        elClicks.textContent = parseInt(elClicks.textContent || 0, 10) + 1;
      }
    } else if (payload.type === 'new_subscriber') {
      const elSignups = document.getElementById('dash-kpi-signups');
      if (elSignups) elSignups.textContent = parseInt(elSignups.textContent || 0, 10) + 1;
      this.showToast(`New backer waitlist entry: ${payload.subscriber.email}`);
    } else if (payload.type === 'vip_deposit') {
      const elVip = document.getElementById('dash-kpi-vip');
      const elRev = document.getElementById('dash-kpi-revenue');
      if (elVip) elVip.textContent = parseInt(elVip.textContent || 0, 10) + 1;
      if (elRev) {
        const cur = parseFloat(elRev.textContent.replace('$', '') || 0);
        elRev.textContent = `$${(cur + 1.0).toFixed(2)}`;
      }
      this.showToast(`Stripe deposit confirmed: ${payload.chargeId}`);
    }

    this._fetchMetrics();
  }

  _renderEventItem(ev) {
    let typeClass = 'dash-ev-other';
    let detail = '';

    if (ev.type === 'click') {
      typeClass = 'dash-ev-click';
      detail = `Clicked "${ev.data?.label || ev.data?.tag || 'element'}" at (${ev.data?.xPercent}%, ${ev.data?.yPercent}%)`;
    } else if (ev.type === 'email_signup' || ev.type === 'new_subscriber') {
      typeClass = 'dash-ev-signup';
      detail = `Waitlist Signup: ${ev.data?.email || ev.subscriber?.email}`;
    } else if (ev.type === 'vip_deposit') {
      typeClass = 'dash-ev-vip';
      detail = `Stripe $1 Deposit (${ev.data?.chargeId || ev.chargeId || 'Confirmed'})`;
    } else if (ev.type === 'scroll_depth') {
      typeClass = 'dash-ev-scroll';
      detail = `Scrolled to ${ev.data?.depth}% depth`;
    } else if (ev.type === 'simulator_block_tap') {
      typeClass = 'dash-ev-sim';
      detail = `Tapped Block #${ev.data?.blockId} [${ev.data?.category}]`;
    } else {
      detail = ev.type?.replace(/_/g, ' ') || 'Action logged';
    }

    return `
      <div class="dash-stream-row ${typeClass}">
        <span class="dash-stream-tag">${(ev.type || '').toUpperCase()}</span>
        <span class="dash-stream-detail" title="${detail}">${detail}</span>
        <span class="dash-stream-time">${ev.isoTime || new Date().toLocaleTimeString()}</span>
      </div>
    `;
  }

  _drawDashboardHeatmap(points) {
    const canvas = document.getElementById('dash-heatmap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 350;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(20, 20, width - 40, 70);
    ctx.strokeRect(20, 100, width - 40, 90);
    ctx.strokeRect(20, 200, width - 40, 70);
    ctx.strokeRect(20, 280, width - 40, 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '10px monospace';
    ctx.fillText('HERO SECTION', 30, 40);
    ctx.fillText('SIMULATOR & DOCK', 30, 120);
    ctx.fillText('BENTO GRID', 30, 220);
    ctx.fillText('REFERRAL REWARDS', 30, 300);

    points.forEach(pt => {
      const cx = (pt.xPercent / 100) * (width - 40) + 20;
      const cy = (pt.yPercent / 100) * (height - 40) + 20;
      const radius = 18;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.85)');
      grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ---------------- Team Authentication (login.jeemu.fun) ---------------- */
  _initAuthForm() {
    const form = document.getElementById('login-portal-form');
    const memberSelect = document.getElementById('login-member-select');
    const passwordInput = document.getElementById('login-password-input');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = memberSelect?.value || 'admin';
      const password = passwordInput?.value || '';

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          sessionStorage.setItem('jeemu_logged_in_member', username);
          if (data.token) {
            sessionStorage.setItem('jeemu_auth_token', data.token);
            document.cookie = `jeemu_auth=${data.token}; path=/; max-age=86400; SameSite=Lax`;
          }
          this.showToast(`Authenticated as ${username.toUpperCase()}`);
          const msgEl = document.getElementById('login-required-msg');
          if (msgEl) msgEl.style.display = 'none';
          setTimeout(() => {
            this.switchSubdomain('admin');
          }, 500);
        } else {
          const errMsg = data.error || 'Invalid credentials. Password is "jeemu2026"';
          const msgEl = document.getElementById('login-required-msg');
          if (msgEl) {
            msgEl.textContent = `⚠️ ${errMsg}`;
            msgEl.style.display = 'block';
          }
          this.showToast(errMsg);
          const card = document.querySelector('.portal-auth-card');
          if (card) {
            card.classList.add('shake-error');
            setTimeout(() => card.classList.remove('shake-error'), 600);
          }
        }
      })
      .catch(err => {
        const errMsg = 'Authentication error: ' + (err.message || 'Please try again.');
        const msgEl = document.getElementById('login-required-msg');
        if (msgEl) {
          msgEl.textContent = `⚠️ ${errMsg}`;
          msgEl.style.display = 'block';
        }
        this.showToast(errMsg);
      });
    });
  }

  /* ---------------- Admin Portal (admin.jeemu.fun) ---------------- */
  _initAdminView() {
    document.getElementById('btn-admin-export-csv')?.addEventListener('click', () => {
      this.exportAdminCSV();
    });

    document.getElementById('btn-save-stripe-settings')?.addEventListener('click', () => {
      const link = document.getElementById('admin-stripe-link-input')?.value.trim();
      if (link) {
        this.showToast('Saved Stripe Payment Link: ' + link);
      }
    });
  }

  loadAdminSubscribers() {
    const token = this._getAuthToken();
    fetch('/api/subscribers', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.status === 401) {
          const tbody = document.getElementById('admin-subscribers-tbody');
          if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center">Session expired. Please <a href="#" onclick="subdomainManager.switchSubdomain('login')">login</a> again.</td></tr>`;
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const tbody = document.getElementById('admin-subscribers-tbody');
        if (!tbody) return;

        if (!data.subscribers || data.subscribers.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center">No subscribers recorded yet.</td></tr>`;
          return;
        }

        tbody.innerHTML = data.subscribers.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${s.name || 'Friend'}</strong></td>
            <td><code>${s.email}</code></td>
            <td><span class="ref-code-tag">${s.referralCode}</span></td>
            <td>${s.referredBy ? `<code>${s.referredBy}</code>` : 'Direct'}</td>
            <td><strong>${s.friendsReferred || 0}</strong></td>
            <td>
              ${s.isVip ? `<span class="badge-vip-confirmed">VIP ($1.00)</span>` : `<span class="badge-waitlist">Waitlist</span>`}
            </td>
          </tr>
        `).join('');

        const totalEl = document.getElementById('admin-total-subs');
        if (totalEl) totalEl.textContent = data.subscribers.length;
      })
      .catch(err => console.error('Error loading subscribers:', err));
  }

  exportAdminCSV() {
    const token = this._getAuthToken();
    fetch('/api/subscribers', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (!data.subscribers || data.subscribers.length === 0) {
          alert('No subscribers to export.');
          return;
        }
        const headers = ['ID', 'Name', 'Email', 'Referral Code', 'Referred By', 'Friends Referred', 'Is VIP', 'Stripe Charge ID', 'Timestamp'];
        const rows = data.subscribers.map(s => [
          s.id,
          `"${s.name}"`,
          `"${s.email}"`,
          s.referralCode,
          s.referredBy || 'direct',
          s.friendsReferred || 0,
          s.isVip ? 'YES' : 'NO',
          s.stripeChargeId || 'N/A',
          new Date(s.timestamp).toISOString()
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jeemu_admin_backers_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<span>●</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
}

export const subdomainManager = new SubdomainManager();
