/**
 * JEEMU ANALYTICS UI & VISUAL HEATMAP MODULE
 * Manages the floating drawer, real-time KPI metrics, live event stream, and canvas heatmap overlay.
 */

import { analytics } from './analytics.js';

class AnalyticsUI {
  constructor() {
    this.drawer = document.getElementById('analytics-drawer');
    this.floatingBtn = document.getElementById('analytics-floating-btn');
    this.closeBtn = document.getElementById('btn-close-drawer');
    this.heatmapCanvas = document.getElementById('heatmap-canvas');
    this.heatmapToggleBtn = document.getElementById('btn-toggle-heatmap');
    this.heatmapActive = false;

    this._bindEvents();
    this.render();

    // Listen to real-time telemetry events
    analytics.onEvent((event) => {
      this.updateBadge();
      if (!this.drawer.classList.contains('hidden')) {
        this.render();
      }
      if (this.heatmapActive && event.type === 'click') {
        this.drawHeatmap();
      }
    });

    // Update dwell time on dashboard every 5s
    setInterval(() => {
      if (!this.drawer.classList.contains('hidden')) {
        this.updateDwellDisplay();
      }
    }, 5000);
  }

  _bindEvents() {
    // Open drawer
    this.floatingBtn?.addEventListener('click', () => this.toggleDrawer());
    this.closeBtn?.addEventListener('click', () => this.closeDrawer());

    // Footer link trigger
    document.getElementById('footer-analytics-link')?.addEventListener('click', () => this.openDrawer());

    // Keyboard shortcut (Shift + A)
    window.addEventListener('keydown', (e) => {
      if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        this.toggleDrawer();
      }
    });

    // Heatmap Toggle
    this.heatmapToggleBtn?.addEventListener('click', () => this.toggleHeatmap());

    // CSV Exports
    document.getElementById('btn-export-subscribers-csv')?.addEventListener('click', () => {
      analytics.exportSubscribersCSV();
    });

    document.getElementById('btn-export-clicks-csv')?.addEventListener('click', () => {
      analytics.exportEventsCSV();
    });

    // Seed mock data
    document.getElementById('btn-seed-data')?.addEventListener('click', () => {
      analytics.seedMockData();
      this.render();
      if (this.heatmapActive) this.drawHeatmap();
      this.showToast('Seeded 6 sample subscribers & click events!');
    });

    // Reset data
    document.getElementById('btn-reset-analytics')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all telemetry data and subscribers?')) {
        analytics.resetAllData();
        this.render();
        if (this.heatmapActive) this.clearHeatmap();
        this.showToast('All analytics data cleared.');
      }
    });

    // Auto-resize heatmap on window resize
    window.addEventListener('resize', () => {
      if (this.heatmapActive) {
        this.drawHeatmap();
      }
    });
  }

  toggleDrawer() {
    if (this.drawer.classList.contains('hidden')) {
      this.openDrawer();
    } else {
      this.closeDrawer();
    }
  }

  openDrawer() {
    this.drawer.classList.remove('hidden');
    this.render();
  }

  closeDrawer() {
    this.drawer.classList.add('hidden');
  }

  updateBadge() {
    const badge = document.getElementById('badge-events-count');
    const events = analytics.getEvents();
    if (badge) badge.textContent = events.length;
  }

  updateDwellDisplay() {
    const dwellEl = document.getElementById('kpi-dwell-time');
    if (dwellEl) {
      const sec = analytics.activeDwellSeconds;
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      dwellEl.textContent = `${mins}m ${remSec < 10 ? '0' : ''}${remSec}s`;
    }
  }

  render() {
    const metrics = analytics.getMetrics();
    const events = analytics.getEvents();

    // 1. Update KPIs
    const elVisitors = document.getElementById('kpi-visitors');
    const elSessions = document.getElementById('kpi-sessions-sub');
    const elSignups = document.getElementById('kpi-signups');
    const elConvRate = document.getElementById('kpi-conv-rate');
    const elVipCount = document.getElementById('kpi-vip-count');
    const elVipRev = document.getElementById('kpi-vip-revenue');
    const elClicks = document.getElementById('kpi-clicks');
    const elScrollDepth = document.getElementById('kpi-scroll-depth');
    const elScrollStatus = document.getElementById('kpi-scroll-status');

    if (elVisitors) elVisitors.textContent = metrics.uniqueVisitors;
    if (elSessions) elSessions.textContent = `${metrics.uniqueSessions} Session${metrics.uniqueSessions > 1 ? 's' : ''}`;
    if (elSignups) elSignups.textContent = metrics.emailSignups;
    if (elConvRate) elConvRate.textContent = `${metrics.convRate}% Conv`;
    if (elVipCount) elVipCount.textContent = metrics.vipDeposits;
    if (elVipRev) elVipRev.textContent = `$${(metrics.vipDeposits * 1.0).toFixed(2)} Locked`;
    if (elClicks) elClicks.textContent = metrics.totalClicks;
    if (elScrollDepth) elScrollDepth.textContent = `${metrics.maxScroll}%`;
    if (elScrollStatus) {
      elScrollStatus.textContent = metrics.maxScroll >= 100 ? 'Full page completed' : metrics.maxScroll >= 50 ? 'Engaged scroll' : 'Hero viewed';
    }

    this.updateDwellDisplay();
    this.updateBadge();

    // 2. Update Funnel Bars
    const funnel = metrics.funnel;
    const maxVal = Math.max(funnel.landed, 1);

    this._setFunnelStep('funnel-bar-1', 'funnel-val-1', funnel.landed, maxVal);
    this._setFunnelStep('funnel-bar-2', 'funnel-val-2', funnel.simulator, maxVal);
    this._setFunnelStep('funnel-bar-3', 'funnel-val-3', funnel.email, maxVal);
    this._setFunnelStep('funnel-bar-4', 'funnel-val-4', funnel.vipViewed, maxVal);
    this._setFunnelStep('funnel-bar-5', 'funnel-val-5', funnel.vipReserved, maxVal);
    this._setFunnelStep('funnel-bar-6', 'funnel-val-6', funnel.shared, maxVal);

    // 3. Real-Time Event Stream
    const streamContainer = document.getElementById('event-stream-list');
    const streamCounter = document.getElementById('stream-count');
    if (streamCounter) streamCounter.textContent = events.length;

    if (streamContainer) {
      if (events.length === 0) {
        streamContainer.innerHTML = `<div class="event-stream-empty">Tracking initiated. Clicks, scrolls, and actions will appear here in real time...</div>`;
      } else {
        const recentEvents = [...events].reverse().slice(0, 40);
        streamContainer.innerHTML = recentEvents.map(e => {
          let typeClass = 'event-other';
          if (e.type === 'click') typeClass = 'event-click';
          if (e.type === 'scroll_depth') typeClass = 'event-scroll';
          if (e.type === 'email_signup') typeClass = 'event-submit';
          if (e.type === 'vip_deposit') typeClass = 'event-vip';

          let detailText = '';
          if (e.type === 'click') {
            detailText = `Clicked: ${e.data.label || e.data.tag} (${e.data.section || 'page'})`;
          } else if (e.type === 'scroll_depth') {
            detailText = `Reached ${e.data.depth}% scroll`;
          } else if (e.type === 'email_signup') {
            detailText = `Joined: ${e.data.email} (${e.data.name})`;
          } else if (e.type === 'vip_deposit') {
            detailText = `Paid $${e.data.amount} VIP Reservation`;
          } else if (e.type === 'simulator_block_tap') {
            detailText = `Tapped Block #${e.data.blockId} [${e.data.category}]`;
          } else {
            detailText = e.type.replace(/_/g, ' ');
          }

          return `
            <div class="stream-item ${typeClass}">
              <span class="stream-type">${e.type.replace(/_/g, ' ')}</span>
              <span class="stream-detail" title="${detailText}">${detailText}</span>
              <span class="stream-time">${e.isoTime}</span>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Top Clicks Breakdown
    const topClicksContainer = document.getElementById('top-clicks-list');
    if (topClicksContainer) {
      if (metrics.topClicks.length === 0) {
        topClicksContainer.innerHTML = `<div class="top-clicks-empty">No element clicks logged yet. Click anywhere on the page to register clicks.</div>`;
      } else {
        topClicksContainer.innerHTML = metrics.topClicks.map(([target, count]) => `
          <div class="top-click-row">
            <span class="tc-target">${target}</span>
            <span class="tc-count">${count} click${count > 1 ? 's' : ''}</span>
          </div>
        `).join('');
      }
    }
  }

  _setFunnelStep(barId, valId, count, maxVal) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    if (bar && val) {
      const pct = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0;
      bar.style.width = `${pct}%`;
      val.textContent = `${count} (${pct}%)`;
    }
  }

  /* ---------------- Heatmap Visual Overlay ---------------- */
  toggleHeatmap() {
    this.heatmapActive = !this.heatmapActive;
    const label = document.getElementById('heatmap-toggle-label');

    if (this.heatmapActive) {
      this.heatmapCanvas.classList.remove('hidden');
      this.heatmapToggleBtn.classList.add('active');
      if (label) label.textContent = 'Hide Click Heatmap';
      this.drawHeatmap();
      this.showToast('Heatmap overlay activated. Showing all clicked points.');
    } else {
      this.clearHeatmap();
      this.heatmapCanvas.classList.add('hidden');
      this.heatmapToggleBtn.classList.remove('active');
      if (label) label.textContent = 'Show Click Heatmap';
      this.showToast('Heatmap overlay turned off.');
    }
  }

  drawHeatmap() {
    const canvas = this.heatmapCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

    canvas.width = docWidth;
    canvas.height = docHeight;

    ctx.clearRect(0, 0, docWidth, docHeight);

    const clicks = analytics.getEvents().filter(e => e.type === 'click' && e.data.x && e.data.y);

    if (clicks.length === 0) {
      // Draw subtle notification on canvas
      ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.font = '16px monospace';
      ctx.fillText('No click data available yet. Click anywhere on the page to register heat points.', 40, 120);
      return;
    }

    // Render radial glowing heat points
    clicks.forEach(c => {
      const x = c.data.x;
      const y = c.data.y;
      const radius = 35;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 60, 0, 0.85)');    // Red-hot core
      gradient.addColorStop(0.3, 'rgba(255, 170, 0, 0.55)'); // Amber mid
      gradient.addColorStop(0.7, 'rgba(255, 220, 0, 0.25)'); // Yellow halo
      gradient.addColorStop(1, 'rgba(255, 220, 0, 0)');     // Transparent edge

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Small center focal dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  clearHeatmap() {
    const canvas = this.heatmapCanvas;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<span>📊</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

export const analyticsUI = new AnalyticsUI();
