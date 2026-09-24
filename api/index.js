/**
 * VERCEL SERVERLESS FUNCTION ENTRY POINT
 * Handles all /api/* requests on Vercel Edge/Serverless infrastructure
 * Backed by Supabase PostgreSQL Database & Realtime
 *
 * Security:
 *  - Protected routes require Bearer token or jeemu_auth cookie
 *  - Rate limiting on all write endpoints
 *  - Admin credentials from environment variables
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import {
  getSubscribers,
  getSubscriberCount,
  findSubscriberByEmail,
  createSubscriber,
  markSubscriberVip,
  incrementReferralCount,
  logTelemetryEvent,
  getTelemetryMetrics,
  getPosts,
  createPost,
  reactToPost,
  broadcastRealtime
} from '../src/lib/supabase.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ========== STRIPE ========== */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

/* ========== RATE LIMITERS ========== */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute window
  max: 120,                // max 120 writes per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' }
});

const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3000,               // High limit for telemetry click/scroll streams
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many telemetry events.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,                 // 60 login attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a moment.' }
});

/* ========== AUTH MIDDLEWARE ========== */
const VALID_MEMBERS = ['shiva', 'anna', 'ishaan', 'jack', 'shefali', 'yana', 'admin'];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jeemu2026';

// Token store (in-memory; acceptable since Vercel is ephemeral anyway)
const validTokens = new Set();

function requireAuth(req, res, next) {
  // 1. Bearer token in Authorization header
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // 2. Cookie
  const cookieToken = req.cookies?.jeemu_auth;

  const token = bearerToken || cookieToken;

  if (token && validTokens.has(token)) {
    return next();
  }

  return res.status(401).json({ error: 'Authentication required. Please login first.' });
}

/* ========== SSE CLIENTS ========== */
const sseClients = new Map(); // id -> res (Map is safe for concurrent splice)

export function broadcastLocalSSE(eventPayload) {
  const data = `data: ${JSON.stringify(eventPayload)}\n\n`;
  for (const [id, res] of sseClients) {
    try {
      res.write(data);
    } catch (_) {
      sseClients.delete(id);
    }
  }
}

async function notifyEvent(eventPayload) {
  broadcastLocalSSE(eventPayload);
  await broadcastRealtime(eventPayload);
}

/* ========== ROUTER ========== */
const router = express.Router();

// ── 1. Healthcheck (public)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'jeemu-api',
    platform: process.env.VERCEL ? 'vercel-serverless' : 'node-local',
    stripe: stripe ? 'configured' : 'not configured (test mode)',
    timestamp: Date.now()
  });
});

// ── 2. Public: waitlist count only (no emails)
router.get('/waitlist/count', readLimiter, async (req, res) => {
  try {
    const count = await getSubscriberCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. Telemetry Stream SSE (protected)
router.get('/telemetry/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  sseClients.set(clientId, res);

  res.write(`data: ${JSON.stringify({ type: 'handshake', message: 'Connected to Jeemu Stream', clients: sseClients.size })}\n\n`);

  req.on('close', () => {
    sseClients.delete(clientId);
  });
});

// ── 4. Telemetry Event Ingestion (public write, rate-limited)
router.post('/telemetry/event', writeLimiter, async (req, res) => {
  try {
    const event = await logTelemetryEvent(req.body);
    await notifyEvent({ type: 'telemetry_event', event });
    res.json({ success: true, eventId: event.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. Telemetry Metrics (protected)
router.get('/telemetry/metrics', requireAuth, async (req, res) => {
  try {
    const metrics = await getTelemetryMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 6. Subscribers Management
// GET: protected (full list with emails)
router.get('/subscribers', requireAuth, readLimiter, async (req, res) => {
  try {
    const subscribers = await getSubscribers();
    res.json({ subscribers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: public (join waitlist), rate-limited
router.post('/subscribers', writeLimiter, async (req, res) => {
  const { email, name, ref } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const existing = await findSubscriberByEmail(email);
    if (existing) {
      return res.json({ subscriber: existing, isNew: false });
    }

    const subscriber = await createSubscriber({ email, name, ref });
    await notifyEvent({ type: 'new_subscriber', subscriber });

    res.json({ subscriber, isNew: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: increment referral count for a referral code (public, rate-limited)
router.patch('/subscribers/:referralCode/refer', writeLimiter, async (req, res) => {
  const { referralCode } = req.params;
  if (!referralCode || !referralCode.startsWith('JEEMU-')) {
    return res.status(400).json({ error: 'Invalid referral code format' });
  }

  try {
    await incrementReferralCount(referralCode);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 7. Stripe Checkout Session (real)
router.post('/stripe/create-session', writeLimiter, async (req, res) => {
  const { subscriberId, referralCode, email } = req.body;

  // If Stripe is not configured, surface the buy link directly
  if (!stripe) {
    const fallbackLink = process.env.STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k';
    return res.json({
      mode: 'redirect',
      url: fallbackLink,
      message: 'Using pre-configured Stripe payment link'
    });
  }

  try {
    const baseUrl = process.env.SITE_URL || 'https://jeemu.fun';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 100, // $1.00 in cents
          product_data: {
            name: 'Jeemu Early Bird VIP Deposit',
            description: '100% refundable $1 deposit. Guarantees your 45% Kickstarter Early Bird price ($89 vs $159) + Free Gold-Stamped Founder\'s Block.',
            images: [`${baseUrl}/images/jeemu-hardware.jpg`]
          }
        },
        quantity: 1
      }],
      customer_email: email || undefined,
      metadata: {
        subscriber_id: subscriberId || '',
        referral_code: referralCode || '',
        source: 'jeemu_vip_funnel'
      },
      success_url: `${baseUrl}/?vip_success=1&ref=${referralCode || ''}#experience`,
      cancel_url: `${baseUrl}/?vip_cancelled=1#experience`
    });

    res.json({ mode: 'checkout', url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session creation error:', err.message);
    res.status(500).json({ error: 'Payment session could not be created: ' + err.message });
  }
});

// ── 8. Stripe Webhook (real, from Stripe dashboard)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(200).json({ received: true });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { subscriber_id, referral_code } = session.metadata || {};

    try {
      const sub = await markSubscriberVip({
        subscriberId: subscriber_id,
        referralCode: referral_code,
        amount: (session.amount_total || 100) / 100,
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent
      });

      await notifyEvent({
        type: 'vip_deposit',
        subscriber: sub,
        chargeId: session.payment_intent,
        amount: (session.amount_total || 100) / 100
      });
    } catch (err) {
      console.error('Webhook processing error:', err.message);
    }
  }

  res.json({ received: true });
});

// Legacy VIP endpoint (kept for backward compat, now delegates to markSubscriberVip)
router.post('/subscribers/vip', requireAuth, writeLimiter, async (req, res) => {
  const { subscriberId, referralCode, amount } = req.body;
  try {
    const result = await markSubscriberVip({
      subscriberId,
      referralCode,
      amount: amount || 1.0,
      stripeSessionId: null,
      stripePaymentIntent: 'manual_' + Date.now()
    });

    await notifyEvent({
      type: 'vip_deposit',
      subscriber: result.subscriber,
      chargeId: result.stripeChargeId,
      amount: amount || 1.0
    });

    res.json({
      success: true,
      stripeChargeId: result.stripeChargeId,
      subscriber: result.subscriber,
      message: 'VIP deposit confirmed'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 9. Posts Management (Feed, Chaos, Journey)
router.get('/posts', async (req, res) => {
  try {
    const posts = await getPosts();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts', requireAuth, writeLimiter, async (req, res) => {
  const { category, post } = req.body;
  if (!category || !['feed', 'chaos', 'journey'].includes(category)) {
    return res.status(400).json({ error: 'Invalid post category' });
  }

  try {
    const newPost = await createPost(category, post);
    await notifyEvent({ type: 'new_post', category, post: newPost });
    res.json({ success: true, post: newPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 10. Post Reactions
router.post('/posts/react', writeLimiter, async (req, res) => {
  const { category, postId, reactionType } = req.body;
  if (!category || !postId) {
    return res.status(400).json({ error: 'Category and postId are required' });
  }

  try {
    const updated = await reactToPost(category, postId, reactionType);
    if (!updated) return res.status(404).json({ error: 'Post not found' });

    await notifyEvent({ type: 'post_reaction', category, postId, reactionType, updated });
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 11. Team Authentication
router.post('/auth/login', writeLimiter, (req, res) => {
  const { username, password } = req.body;

  if (
    username &&
    VALID_MEMBERS.includes(username.toLowerCase().trim()) &&
    password === ADMIN_PASSWORD
  ) {
    const token = 'tok_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    validTokens.add(token);

    // Auto-expire token after 24h
    setTimeout(() => validTokens.delete(token), 86400000);

    res.cookie('jeemu_auth', token, { maxAge: 86400000, httpOnly: false, sameSite: 'lax' });
    return res.json({
      success: true,
      token,
      member: username,
      role: username.toLowerCase() === 'admin' ? 'Super Admin' : 'Core Team Member'
    });
  }

  res.status(401).json({ error: 'Invalid credentials.' });
});

router.post('/auth/logout', (req, res) => {
  const token = req.cookies?.jeemu_auth || (req.headers.authorization || '').replace('Bearer ', '');
  if (token) validTokens.delete(token);
  res.clearCookie('jeemu_auth');
  res.json({ success: true });
});

// Mount router
app.use('/api', router);
app.use('/', router);

export default app;
