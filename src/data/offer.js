// One place for the offer details shown on the page.
export const EARLY_BIRD_PRICE = '$99';
export const LAUNCH_DATE = '24 November';
export const KICKSTARTER_URL = 'https://www.kickstarter.com/projects/jeemu/jeemu';
// Stripe Payment Link for the $1 VIP spot. Stripe supports prefilled_email and client_reference_id on payment links.
export const VIP_LINK = 'https://buy.stripe.com/5kQbJ2ead5qyeGcgZ3ds401';
export const vipUrl = (email, code) => {
  const u = new URL(VIP_LINK);
  if (email) u.searchParams.set('prefilled_email', email);
  const ref = (code || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (ref) u.searchParams.set('client_reference_id', ref);
  return u.toString();
};
// The campaign opens 24 November, 9:00 am US Eastern (EST, UTC-5) = 14:00 UTC.
export const LAUNCH_AT = Date.parse('2026-11-24T14:00:00Z');
// Live: the campaign is open. The page switches itself over at LAUNCH_AT (buttons and Jeemu's end screen go to
// Kickstarter). Add ?live to the address to see the launch-day page early.
const PREVIEW_LIVE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('live');
export const isLive = () => PREVIEW_LIVE || Date.now() >= LAUNCH_AT;
// The campaign: 30 days from launch, ends 24 December, 9:00 am EST (14:00 UTC). Fully funded in the first five minutes.
export const CAMPAIGN_END = Date.parse('2026-12-24T14:00:00Z');
export const END_DATE = '24 December';
export const FUNDED = 'Funded in 5 minutes';
export const daysLeft = () => Math.max(0, Math.floor((CAMPAIGN_END - Date.now()) / 86400000));
export const leftText = () => { const d = daysLeft(); return Date.now() >= CAMPAIGN_END ? "Campaign ended" : d >= 2 ? `${d} days left` : d === 1 ? "1 day left" : "Last day"; };
