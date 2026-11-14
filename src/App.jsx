import React, { Suspense, lazy, useEffect, useState } from 'react';
import TopBar from './components/tonight/TopBar';
import Tonight from './components/tonight/Tonight';
import JourneyTimeline from './components/JourneyTimeline';
import TeamSection from './components/TeamSection';
import FaqFooter from './components/FaqFooter';
// the team admin page is split out of the public bundle, and brings its own fonts
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ADMIN_FONTS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';
import { track } from './analytics';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(() => {
    return (
      window.location.pathname === '/admin' ||
      window.location.hash === '#admin' ||
      new URLSearchParams(window.location.search).get('admin') === 'true'
    );
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(
        window.location.pathname === '/admin' ||
        window.location.hash === '#admin' ||
        new URLSearchParams(window.location.search).get('admin') === 'true'
      );
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);
  useEffect(() => {
    const host = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    if (host.startsWith('connect.') || params.get('subdomain') === 'connect' || window.location.pathname === '/connect') {
      window.location.replace('/connect.html');
    }
  }, []);

  useEffect(() => { track('page_view', { w: window.innerWidth, h: window.innerHeight }, { once: true }); }, []);

  const toWaitlist = (where = 'unknown') => {
    track('cta_click', { where });
    document.getElementById('waitlist')?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', '#waitlist');   // like the footer link: the address shows where you are
  };

  // the team page is not for search engines
  useEffect(() => {
    if (!isAdminView) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [isAdminView]);

  // the "Tonight" skin applies to the public page only; the team admin page keeps its own look
  useEffect(() => {
    document.documentElement.classList.toggle('theme-tonight', !isAdminView);
    if (isAdminView && !document.querySelector('link[data-admin-fonts]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ADMIN_FONTS; l.dataset.adminFonts = '';
      document.head.appendChild(l);
    }
  }, [isAdminView]);

  if (isAdminView) {
    return (
      <Suspense fallback={null}>
        <AdminPanel
          onBackToSite={() => {
            window.history.pushState({}, '', '/');
            setIsAdminView(false);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="jeemu-app">
      <a className="skip-link" href="#waitlist">Skip to the waitlist</a>
      <TopBar onCtaClick={() => toWaitlist('nav')} />
      <main>
        <Tonight onCta={() => toWaitlist('story')} />
        <JourneyTimeline />
        <TeamSection />
        <FaqFooter />
      </main>
    </div>
  );
}
