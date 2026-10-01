/**
 * JEEMU UNIFIED APPLICATION ENTRY POINT
 * Initializes:
 * - 3D Canvas Scrubber & Guided Tour Engine
 * - Interactive NFC & Panoramic Smart Display Dock Simulator
 * - High-Converting Kickstarter Waitlist & VIP Reservation Funnel
 * - Real-Time Telemetry & Event Analytics
 */

import { canvasScrubber } from './js/canvas-scrubber.js';
import { simulator } from './js/simulator.js';
import { funnel } from './js/funnel.js';
import { analytics } from './js/analytics.js';
import { analyticsUI } from './js/analytics-ui.js';
import { router } from './js/router.js';
import { subdomainManager } from './js/subdomains.js';
import { uiEnhancements } from './js/spotlight.js';

export { canvasScrubber, simulator, funnel, analytics, analyticsUI, router, subdomainManager, uiEnhancements };

// Smooth Anchor Link Handler
function initAnchorNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();

        // If target is in the 3D hero stage (e.g. #experience or #signup)
        if (targetId === '#experience') {
          canvasScrubber.go(0, false, true);
        } else if (targetId === '#signup') {
          canvasScrubber.go(1, true, true);
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// Fixed Header Glass Effect on Scroll
function initHeaderScroll() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
      header.style.padding = '14px 5%';
      header.style.backgroundColor = 'rgba(16, 16, 17, 0.95)';
      header.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.6)';
    } else {
      header?.classList.remove('scrolled');
      header.style.padding = '20px 5%';
      header.style.backgroundColor = 'transparent';
      header.style.boxShadow = 'none';
    }
  }, { passive: true });
}

// Telemetry Interaction Listeners
function initTelemetryTracking() {
  document.addEventListener('click', (e) => {
    const interactive = e.target.closest('button, a, input, select, [data-track]');
    if (!interactive) return;

    const label = interactive.innerText?.trim() || interactive.getAttribute('aria-label') || interactive.id || interactive.className;
    try {
      analytics?.track('click', {
        label: label.substring(0, 50),
        id: interactive.id,
        tag: interactive.tagName
      });
    } catch (_) {}
  }, { passive: true });
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  initAnchorNavigation();
  initHeaderScroll();
  initTelemetryTracking();
  uiEnhancements.init();
  console.log('🎮 Jeemu Unified Tabletop Platform loaded successfully.');
});
