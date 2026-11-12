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
