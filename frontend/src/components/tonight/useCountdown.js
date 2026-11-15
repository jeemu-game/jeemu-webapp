import { useEffect, useState } from 'react';
import { LAUNCH_AT } from '../../data/offer';

// Time left until the Kickstarter opens, ticking every second. live: it has opened.
export default function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = Math.max(0, LAUNCH_AT - now);
  const s = Math.floor(left / 1000);
  return { live: left === 0, d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}
const two = (n) => String(n).padStart(2, '0');
// "9d 14h 22m 05s", or shorter forms
export const fmtLong = (c) => `${c.d}d ${two(c.h)}h ${two(c.m)}m ${two(c.s)}s`;
// compact, for phones: "9d 14:22:05"
export const fmtClock = (c) => `${c.d}d ${two(c.h)}:${two(c.m)}:${two(c.s)}`;
