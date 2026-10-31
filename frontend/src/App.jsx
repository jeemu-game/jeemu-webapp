import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import StoryPlayer from './components/story/StoryPlayer';
import HowItWorks from './components/HowItWorks';
import Waitlist from './components/Waitlist';
import JourneyTimeline from './components/JourneyTimeline';
import TeamSection from './components/TeamSection';
import FaqFooter from './components/FaqFooter';
import AdminPanel from './components/AdminPanel';
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

  const toWaitlist = (where = 'unknown') => { track('cta_click', { where }); document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' }); };

  if (isAdminView) {
    return (
      <AdminPanel
        onBackToSite={() => {
          window.history.pushState({}, '', '/');
          setIsAdminView(false);
        }}
      />
    );
  }

  return (
    <div className="jeemu-app">
      <a className="skip-link" href="#how">Skip to content</a>
      <Navbar onCtaClick={() => toWaitlist('nav')} />
      <main>
        <StoryPlayer onCta={() => toWaitlist('story')} />
        <HowItWorks />
        <Waitlist />
        <JourneyTimeline />
        <TeamSection />
        <FaqFooter />
      </main>
    </div>
  );
}
