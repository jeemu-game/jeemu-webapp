/**
 * JEEMU HARDENED BACKEND API
 * Backed by Supabase PostgreSQL Database
 * 
 * Security & Anti-Abuse:
 * - IP-based rate limiting (express-rate-limit)
 * - Anti-bot honeypot filter
 * - Strict RFC email sanitization & injection protection
 * - Server-shielded Supabase credentials (never leaked to client)
 * - Safe deduplication
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
  incrementReferralCount
} from '../src/lib/supabase.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ========== STRIPE ========== */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

/* ========== HARDENED RATE LIMITERS (DDoS & Spam Defense) ========== */
const isTestEnv = process.env.NODE_ENV === 'test';

// Max 5 waitlist submissions per IP per 5 minutes
const waitlistWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isTestEnv ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Don't penalize user for simple validation/syntax mistakes
  message: { error: 'Too many signup attempts from this network. Please wait a few minutes.' }
});

// Max 15 stripe sessions per IP per 5 minutes
const stripeSessionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isTestEnv ? 100 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts. Please wait a few minutes.' }
});

// Max 60 read requests per IP per minute
const generalReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestEnv ? 300 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

/* ========== SANITIZATION HELPERS ========== */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function sanitizeString(str, maxLen = 100) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

/* ========== API ROUTER ========== */
const router = express.Router();

// 1. Healthcheck
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'jeemu-api',
    platform: process.env.VERCEL ? 'vercel-serverless' : 'node-local',
    timestamp: Date.now()
  });
});

// 2. Real-time Waitlist Count (from Supabase)
router.get('/waitlist/count', generalReadLimiter, async (req, res) => {
  try {
    const count = await getSubscriberCount();
    // Provide a baseline social proof offset if starting fresh
    const displayCount = Math.max(count || 0, 1848);
    res.json({ count: displayCount, rawCount: count });
  } catch (err) {
    console.error('Waitlist count query error:', err.message);
    res.json({ count: 1848 });
  }
});

// 3. Waitlist Join / Subscriber Creation (Rate-limited, Honeypot-shielded)
router.post('/subscribers', waitlistWriteLimiter, async (req, res) => {
  const { email, name, ref, hp_jeemu_check } = req.body;

  // Honeypot bot defense: automated bots fill invisible fields
  if (hp_jeemu_check) {
    console.warn('🤖 Bot trapped by honeypot field, silently dropping.');
    return res.status(200).json({
      success: true,
      subscriber: {
        id: 'bot_trapped',
        email: 'filtered@jeemu.test',
        name: 'Friend',
        referralCode: 'JEEMU-BOT0'
      },
      isNew: false
    });
  }

  // Email format & length validation
  const cleanEmail = sanitizeString(email, 120).toLowerCase();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const cleanName = sanitizeString(name, 60) || 'Backer';
  const cleanRef = sanitizeString(ref, 20);

  try {
    // Deduplication check: return existing backer if already registered
    const existing = await findSubscriberByEmail(cleanEmail);
    if (existing) {
      return res.json({
        success: true,
        subscriber: existing,
        isNew: false,
        message: 'Welcome back! You are already on the VIP list.'
      });
    }

    // Persist new subscriber to Supabase
    const newSubscriber = await createSubscriber({
      email: cleanEmail,
      name: cleanName,
      ref: cleanRef || null
    });

    res.status(201).json({
      success: true,
      subscriber: newSubscriber,
      isNew: true
    });
  } catch (err) {
    console.error('Error inserting subscriber to Supabase:', err);
    res.status(500).json({ error: 'Could not complete reservation. Please try again.' });
  }
});

// 4. Referral credit increment
router.patch('/subscribers/:referralCode/refer', waitlistWriteLimiter, async (req, res) => {
  const cleanCode = sanitizeString(req.params.referralCode, 20).toUpperCase();
  if (!cleanCode || !cleanCode.startsWith('JEEMU-')) {
    return res.status(400).json({ error: 'Invalid referral code.' });
  }

  try {
    await incrementReferralCount(cleanCode);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Stripe Checkout Session
router.post('/stripe/create-session', stripeSessionLimiter, async (req, res) => {
  const { subscriberId, referralCode, email } = req.body;
  const paymentLink = process.env.STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k';

  if (!stripe) {
    return res.json({
      mode: 'redirect',
      url: paymentLink,
      message: 'Using configured Stripe Early Bird payment link'
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
          unit_amount: 100, // $1.00 deposit
          product_data: {
            name: 'Jeemu Early Bird VIP Deposit',
            description: '100% refundable $1 deposit. Guarantees 45% Kickstarter discount ($89 vs $159) + Free Gold-Stamped Founder Block.',
            images: [`${baseUrl}/images/jeemu-hero.jpg`]
          }
        },
        quantity: 1
      }],
      customer_email: email ? sanitizeString(email, 120) : undefined,
      metadata: {
        subscriber_id: subscriberId ? sanitizeString(subscriberId, 50) : '',
        referral_code: referralCode ? sanitizeString(referralCode, 20) : '',
        source: 'jeemu_redesign_funnel'
      },
      success_url: `${baseUrl}/?vip_success=1&ref=${referralCode || ''}#pricing`,
      cancel_url: `${baseUrl}/?vip_cancelled=1#pricing`
    });

    res.json({ mode: 'checkout', url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session creation fallback to payment link:', err.message);
    res.json({ mode: 'redirect', url: paymentLink });
  }
});

// Mount router
app.use('/api', router);
app.use('/', router);

export default app;
