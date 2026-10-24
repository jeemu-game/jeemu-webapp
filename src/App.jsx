import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import StoryPlayer from './components/story/StoryPlayer';
import HowItWorks from './components/HowItWorks';
import Waitlist from './components/Waitlist';
import JourneyTimeline from './components/JourneyTimeline';
import TeamSection from './components/TeamSection';
import FaqFooter from './components/FaqFooter';
import { track } from './analytics';

export default function App() {
  useEffect(() => {
    const host = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    if (host.startsWith('connect.') || params.get('subdomain') === 'connect' || window.location.pathname === '/connect') {
      window.location.replace('/connect.html');
    }
  }, []);

  useEffect(() => { track('page_view', { w: window.innerWidth, h: window.innerHeight }, { once: true }); }, []);

  const toWaitlist = (where = 'unknown') => { track('cta_click', { where }); document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div className="jeemu-app">
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
