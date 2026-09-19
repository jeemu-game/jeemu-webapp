/**
 * JEEMU APPLICATION ENTRY POINT
 * Initializes telemetry, interactive simulator, pre-launch funnel, and launch countdown timer.
 */

import './css/style.css';
import { analytics } from './js/analytics.js';
import { analyticsUI } from './js/analytics-ui.js';
import { simulator } from './js/simulator.js';
import { funnel } from './js/funnel.js';
import { router } from './js/router.js';
import { subdomainManager } from './js/subdomains.js';

// Countdown Timer towards Kickstarter Launch (5 days from now)
function initCountdown() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 4);
  targetDate.setHours(targetDate.getHours() + 12);
  targetDate.setMinutes(targetDate.getMinutes() + 48);

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-minutes');
  const secsEl = document.getElementById('cd-seconds');

  function update() {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = days < 10 ? '0' + days : days;
    if (hoursEl) hoursEl.textContent = hours < 10 ? '0' + hours : hours;
    if (minsEl) minsEl.textContent = minutes < 10 ? '0' + minutes : minutes;
    if (secsEl) secsEl.textContent = seconds < 10 ? '0' + seconds : seconds;
  }

  update();
  setInterval(update, 1000);
}

// Site Header Scroll Effect
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
      header.style.backgroundColor = 'rgba(6, 7, 9, 0.94)';
      header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    } else {
      header?.classList.remove('scrolled');
      header.style.backgroundColor = 'rgba(10, 12, 16, 0.75)';
      header.style.boxShadow = 'none';
    }
  }, { passive: true });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initHeaderScroll();
  console.log('🎮 Jeemu WebApp & Analytics Engine successfully initialized.');
});
