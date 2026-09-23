/**
 * VERCEL SERVERLESS FUNCTION ENTRY POINT
 * Handles all /api/* requests on Vercel Edge/Serverless infrastructure
 * Backed by Supabase PostgreSQL Database & Realtime
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {
  getSubscribers,
  findSubscriberByEmail,
  createSubscriber,
  registerVipDeposit,
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

// SSE Clients pool for local/fallback SSE streams
const sseClients = [];

export function broadcastLocalSSE(eventPayload) {
  const data = `data: ${JSON.stringify(eventPayload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch (_) {}
  });
}

// Unified broadcast helper
async function notifyEvent(eventPayload) {
  broadcastLocalSSE(eventPayload);
  await broadcastRealtime(eventPayload);
}

// Router for API endpoints
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

// 2. Telemetry Stream (SSE)
router.get('/telemetry/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(`data: ${JSON.stringify({ type: 'handshake', message: 'Connected to Jeemu Stream', clients: sseClients.length })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 3. Telemetry Event Ingestion
router.post('/telemetry/event', async (req, res) => {
  try {
    const event = await logTelemetryEvent(req.body);
    await notifyEvent({ type: 'telemetry_event', event });
    res.json({ success: true, eventId: event.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Telemetry Metrics Aggregation
router.get('/telemetry/metrics', async (req, res) => {
  try {
    const metrics = await getTelemetryMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Subscribers Management
router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await getSubscribers();
    res.json({ subscribers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscribers', async (req, res) => {
  const { email, name, ref } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

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

// 6. Stripe VIP Deposit Processing
router.post('/subscribers/vip', async (req, res) => {
  const { subscriberId, referralCode, amount } = req.body;
  try {
    const { subscriber, stripeChargeId } = await registerVipDeposit({
      subscriberId,
      referralCode,
      amount: amount || 1.0
    });

    await notifyEvent({
      type: 'vip_deposit',
      subscriber,
      chargeId: stripeChargeId,
      amount: amount || 1.0
    });

    res.json({
      success: true,
      stripeChargeId,
      subscriber,
      message: 'Stripe $1 early-bird deposit confirmed'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Posts Management (Feed, Chaos, Journey)
router.get('/posts', async (req, res) => {
  try {
    const posts = await getPosts();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts', async (req, res) => {
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

// 8. Post Reactions (Like / 💀 / 🔥 / 🍺)
router.post('/posts/react', async (req, res) => {
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

// 9. Team Authentication API
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const validMembers = ['shiva', 'anna', 'ishaan', 'jack', 'shefali', 'yana', 'admin'];

  if (
    username &&
    validMembers.includes(username.toLowerCase().trim()) &&
    (password === 'jeemu2026' || password === 'admin' || password === 'wood')
  ) {
    const token = 'tok_' + Math.random().toString(36).substring(2, 10);
    res.cookie('jeemu_auth', token, { maxAge: 86400000, httpOnly: false, sameSite: 'lax' });
    return res.json({
      success: true,
      token,
      member: username,
      role: username.toLowerCase() === 'admin' ? 'Super Admin' : 'Core Team Member'
    });
  }

  res.status(401).json({ error: 'Invalid credentials. Password is "jeemu2026"' });
});

// Mount router on both /api and root / so both Vercel rewrites and direct calls resolve seamlessly
app.use('/api', router);
app.use('/', router);

export default app;
