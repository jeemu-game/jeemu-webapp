// Minimal first-party analytics -> existing POST /api/telemetry/event. No cookies, no third parties.
// Events: page_view, story_step (once per step), waitlist_view, waitlist_submit, waitlist_joined, cta_click.
const rnd = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
function id(store, key, prefix) {
  try { let v = store.getItem(key); if (!v) { v = prefix + rnd(); store.setItem(key, v); } return v; } catch (e) { return prefix + 'anon'; }
}
const visitorId = id(window.localStorage, 'jeemu_vid', 'v_');
const sessionId = id(window.sessionStorage, 'jeemu_sid', 's_');
const utm = Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([k]) => k.startsWith('utm_') || k === 'ref'));
const sent = new Set();

export function track(type, data = {}, { once = false } = {}) {
  if (import.meta.env.VITE_PREVIEW === 'true') return;      // preview builds never send events
  const key = once ? `${type}:${JSON.stringify(data)}` : null;
  if (key) { if (sent.has(key)) return; sent.add(key); }
  const body = JSON.stringify({ type, visitorId, sessionId, url: window.location.pathname, utm, data, dwellSeconds: Math.round(performance.now() / 1000) });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/v1/telemetry/event', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/v1/telemetry/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (e) { /* analytics must never break the page */ }
}
