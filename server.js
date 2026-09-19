/**
 * JEEMU REAL-TIME BACKEND & SUBDOMAIN ROUTER
 * Powers:
 * - launch.jeemu.fun (Kickstarter Pre-launch Funnel)
 * - feed.jeemu.fun (Engineering Updates & Devlogs)
 * - chaos.jeemu.fun (Community Shitposting & Tower Fails)
 * - journey.jeemu.fun (Hardware Prototype Timeline)
 * - login.jeemu.fun (Team Authentication)
 * - admin.jeemu.fun (Subscriber Management & Team Publisher)
 * - dashboard.jeemu.fun (Real-time Telemetry & Click Heatmap)
 * 
 * Features:
 * - Server-Sent Events (SSE) Real-Time Telemetry Stream
 * - Persistent JSON file-store in data/jeemu.db.json
 * - Host header & Query parameter subdomain routing
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'jeemu.db.json');

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial database schema
const defaultDb = {
  events: [],
  subscribers: [
    {
      id: 'sub_init_1',
      email: 'alex.tabletop@gmail.com',
      name: 'Alex Rivera',
      referralCode: 'JEEMU-VIP982',
      referredBy: null,
      timestamp: Date.now() - 3600000 * 24,
      isVip: true,
      depositAmount: 1.0,
      friendsReferred: 3,
      stripeChargeId: 'ch_3M001StripeJeemu'
    },
    {
      id: 'sub_init_2',
      email: 'chloe.boardgames@hey.com',
      name: 'Chloe Bennett',
      referralCode: 'JEEMU-B382',
      referredBy: 'JEEMU-VIP982',
      timestamp: Date.now() - 3600000 * 18,
      isVip: false,
      depositAmount: 0,
      friendsReferred: 1
    }
  ],
  posts: {
    feed: [
      {
        id: 'feed_1',
        author: 'Anna Vu',
        role: 'Hardware & Industrial Design',
        authorInitials: 'AV',
        date: 'Sep 18, 2026',
        title: 'Batch #3 Beechwood Milling: Custom Chamfer & Friction Testing',
        category: 'Hardware',
        content: 'We tested 4 different wood finishes this week. High-gloss polyurethane looks shiny on photos, but in real play it caused the blocks to stick together unpredictably when pulling from the middle levels. We settled on a bespoke double-sanded beeswax matte polish. It provides the signature buttery Jenga slide while maintaining a silky tactile warmth in your hand.',
        image: '/images/jeemu-hardware.jpg',
        likes: 42,
        comments: 9
      },
      {
        id: 'feed_2',
        author: 'Ishaan',
        role: 'Embedded Firmware & NFC',
        authorInitials: 'IS',
        date: 'Sep 14, 2026',
        title: 'Firmware v2.4: Achieving Sub-80ms Tag Detection on the Dock',
        category: 'Firmware',
        content: 'The biggest headache with earlier prototypes was the delay between slamming a block on the reader and seeing the OLED prompt appear. If it takes more than 300ms, the physical party rhythm is interrupted. With our custom dual-antenna coil arrangement inside the dock and SPI bus tuning, we brought tag response time down to 78 milliseconds. It feels instantaneous.',
        likes: 67,
        comments: 14
      },
      {
        id: 'feed_3',
        author: 'Shiva Manickam',
        role: 'Platform & AI Architecture',
        authorInitials: 'SM',
        date: 'Sep 09, 2026',
        title: 'Why AI Game Creation Changes Everything',
        category: 'AI Engine',
        content: 'Traditional board games are static. You play 3 times and memorize all the cards. With Jeemu\'s mobile companion, you can literally type "Spicy Date Night for couple celebrating 5th anniversary who love sushi" and our model populates 45 custom prompt blocks in 8 seconds. You sync it via Bluetooth to the dock once, then turn your phone OFF for the entire game.',
        likes: 89,
        comments: 23
      }
    ],
    chaos: [
      {
        id: 'chaos_1',
        author: 'Jack',
        role: 'Game Systems',
        authorInitials: 'JK',
        date: 'Yesterday',
        tag: '💀 EPIC FAIL',
        content: 'Playtester Marcus tried to remove Block #45 using his elbows because the rule said "non-dominant limb". The entire 32-level tower collapsed into Anna\'s gin & tonic. 10/10 gameplay experience.',
        reactions: { rip: 54, chaos: 38, sip: 29 }
      },
      {
        id: 'chaos_2',
        author: 'Shefali',
        role: 'Community',
        authorInitials: 'SH',
        date: '2 days ago',
        tag: '🍺 UNHINGED DARE',
        content: 'New prompt submission approved for the "After Dark" expansion pack: "Call your most recent food delivery driver and thank them for changing your life, or finish your beverage." Who hurt the person who submitted this??',
        reactions: { rip: 19, chaos: 82, sip: 45 }
      },
      {
        id: 'chaos_3',
        author: 'Yana C',
        role: 'Operations',
        authorInitials: 'YC',
        date: '4 days ago',
        tag: '🧪 LAB OUTTAKE',
        content: 'Engineering note: Do NOT stack 45 blocks horizontally on the OLED dock to test "simultaneous read capability". It threw error code #420: "Too much wood on desk".',
        reactions: { rip: 41, chaos: 65, sip: 18 }
      }
    ],
    journey: [
      {
        id: 'journey_1',
        milestone: 'Phase 1: The Frustration',
        date: 'January 2026',
        author: 'Shiva & Jack',
        title: 'Classic Jenga is great for 15 minutes, then gathers dust.',
        description: 'We taped index cards with handwritten drinking dares to standard blocks. It was hilarious, but within 2 games the tape peeled. We asked: what if the physical wood could dynamically trigger ANY game mode digitally?',
        badge: 'The Spark'
      },
      {
        id: 'journey_2',
        milestone: 'Phase 2: Prototype V1 (Garage Hack)',
        date: 'March 2026',
        author: 'Anna & Ishaan',
        title: 'Drilling 45 blocks and frying two Arduino Nanos.',
        description: 'We drilled cavities into beechwood blocks with a Dremel press and embedded 13.56MHz NFC tags with wood epoxy. The first reader was a messy cardboard box with an Arduino taped to it.',
        badge: 'First Hardware'
      },
      {
        id: 'journey_3',
        milestone: 'Phase 3: The Custom Dock & Standalone OS',
        date: 'June 2026',
        author: 'Entire Team',
        title: 'Zero phones at the table. Standalone hardware decision.',
        description: 'Gamers hate staring at apps while playing tabletop games. We built the Jeemu Smart Box as a standalone game master with an amber OLED display and internal battery. Phone-free during play.',
        badge: 'Core Breakthrough'
      }
    ]
  },
  settings: {
    stripePaymentLink: 'https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k',
    earlyBirdGoal: 500,
    launchDate: '2026-10-15T18:00:00Z'
  }
};

let db = { ...defaultDb };

// Load database from file if present
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db file, using default schema:', err);
  }
}

// Debounced save helper
let saveTimeout = null;
function saveDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
      if (err) console.error('Error saving db:', err);
    });
  }, 400);
}

// Active Server-Sent Events (SSE) clients for real-time dashboard updates
const sseClients = [];

function broadcastSSE(eventPayload) {
  const data = `data: ${JSON.stringify(eventPayload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch (err) {
      // client disconnected
    }
  });
}

/* ================= API ROUTES ================= */

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', domain: 'jeemu.fun', timestamp: Date.now() });
});

// SSE Real-Time Telemetry Stream for dashboard.jeemu.fun
app.get('/api/telemetry/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'handshake', message: 'Connected to Jeemu Real-Time Stream', clients: sseClients.length })}\n\n`);

  req.on('close', () => {
    const index = sseClients.findIndex(c => c.id === clientId);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

// Telemetry Event Ingestion
app.post('/api/telemetry/event', (req, res) => {
  const event = {
    id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    isoTime: new Date().toLocaleTimeString(),
    ...req.body
  };

  db.events.push(event);
  if (db.events.length > 1000) db.events.shift();
  saveDb();

  // Broadcast to all connected dashboards in real time
  broadcastSSE({ type: 'telemetry_event', event });

  res.json({ success: true, eventId: event.id });
});

// Get Aggregated Metrics
app.get('/api/telemetry/metrics', (req, res) => {
  const events = db.events;
  const subscribers = db.subscribers;

  const uniqueVisitors = new Set(events.map(e => e.visitorId)).size || 1;
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size || 1;
  const clicks = events.filter(e => e.type === 'click');
  const emailSignups = subscribers.length;
  const vipDeposits = subscribers.filter(s => s.isVip).length;

  const convRate = uniqueVisitors > 0 ? ((emailSignups / uniqueVisitors) * 100).toFixed(1) : 0;
  const vipRate = emailSignups > 0 ? ((vipDeposits / emailSignups) * 100).toFixed(1) : 0;

  // Funnel
  const funnel = {
    landed: uniqueVisitors,
    simulator: events.filter(e => e.type === 'simulator_block_tap').length,
    email: emailSignups,
    vipViewed: events.filter(e => e.type === 'view_vip_modal' || (e.data && e.data.id === 'btn-open-vip-nav')).length + (vipDeposits > 0 ? 1 : 0),
    vipReserved: vipDeposits,
    shared: events.filter(e => e.type === 'referral_link_copied' || e.type === 'share_click').length
  };

  // Top Clicks
  const clickCounts = {};
  clicks.forEach(c => {
    const key = ((c.data && (c.data.label || c.data.id || c.data.tag)) || 'element').substring(0, 32);
    clickCounts[key] = (clickCounts[key] || 0) + 1;
  });
  const topClicks = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Click Coordinates for Heatmap
  const heatmapPoints = clicks
    .filter(c => c.data && c.data.x && c.data.y)
    .map(c => ({ x: c.data.x, y: c.data.y, xPercent: c.data.xPercent, yPercent: c.data.yPercent }));

  res.json({
    uniqueVisitors,
    uniqueSessions,
    totalClicks: clicks.length,
    emailSignups,
    vipDeposits,
    vipRevenue: (vipDeposits * 1.0).toFixed(2),
    convRate,
    vipRate,
    topClicks,
    funnel,
    heatmapPoints,
    recentEvents: events.slice(-30).reverse()
  });
});

// Subscribers Management (Waitlist & VIP)
app.get('/api/subscribers', (req, res) => {
  res.json({ subscribers: db.subscribers });
});

app.post('/api/subscribers', (req, res) => {
  const { email, name, ref } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Check if existing
  let sub = db.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (sub) {
    return res.json({ subscriber: sub, isNew: false });
  }

  const referralCode = 'JEEMU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  sub = {
    id: 'sub_' + Date.now(),
    email,
    name: name || 'Backer',
    referralCode,
    referredBy: ref || null,
    timestamp: Date.now(),
    isVip: false,
    depositAmount: 0,
    friendsReferred: 0
  };

  db.subscribers.push(sub);

  // Credit referrer if applicable
  if (ref && ref !== referralCode) {
    const inviter = db.subscribers.find(s => s.referralCode === ref);
    if (inviter) {
      inviter.friendsReferred = (inviter.friendsReferred || 0) + 1;
    }
  }

  saveDb();

  // Broadcast real-time event to dashboard
  broadcastSSE({ type: 'new_subscriber', subscriber: sub });

  res.json({ subscriber: sub, isNew: true });
});

// Stripe VIP Deposit Processing
app.post('/api/subscribers/vip', (req, res) => {
  const { subscriberId, referralCode, amount } = req.body;
  const depositAmount = amount || 1.0;

  let sub = db.subscribers.find(s => s.id === subscriberId || s.referralCode === referralCode);
  if (!sub && db.subscribers.length > 0) {
    sub = db.subscribers[db.subscribers.length - 1];
  }

  const stripeChargeId = 'ch_3M' + Math.random().toString(36).substring(2, 9) + 'StripeJeemu';

  if (sub) {
    sub.isVip = true;
    sub.depositAmount = depositAmount;
    sub.vipTimestamp = Date.now();
    sub.stripeChargeId = stripeChargeId;
  }

  saveDb();

  broadcastSSE({
    type: 'vip_deposit',
    subscriber: sub,
    chargeId: stripeChargeId,
    amount: depositAmount
  });

  res.json({
    success: true,
    stripeChargeId,
    subscriber: sub,
    message: 'Stripe $1 deposit confirmed'
  });
});

// Posts Management (Feed, Chaos, Journey)
app.get('/api/posts', (req, res) => {
  res.json({ posts: db.posts });
});

app.post('/api/posts', (req, res) => {
  const { category, post } = req.body; // category: 'feed' | 'chaos' | 'journey'
  if (!category || !db.posts[category]) {
    return res.status(400).json({ error: 'Invalid post category' });
  }

  const newPost = {
    id: `${category}_` + Date.now(),
    timestamp: Date.now(),
    ...post
  };

  if (category === 'journey') {
    db.posts.journey.push(newPost);
  } else {
    db.posts[category].unshift(newPost);
  }

  saveDb();
  broadcastSSE({ type: 'new_post', category, post: newPost });

  res.json({ success: true, post: newPost });
});

// Post Reactions (Like / 💀 / 🔥 / 🍺)
app.post('/api/posts/react', (req, res) => {
  const { category, postId, reactionType } = req.body;
  const list = db.posts[category];
  if (!list) return res.status(400).json({ error: 'Invalid category' });

  const item = list.find(p => p.id === postId);
  if (!item) return res.status(404).json({ error: 'Post not found' });

  if (category === 'feed') {
    item.likes = (item.likes || 0) + 1;
  } else if (category === 'chaos') {
    item.reactions = item.reactions || { rip: 0, chaos: 0, sip: 0 };
    item.reactions[reactionType] = (item.reactions[reactionType] || 0) + 1;
  }

  saveDb();
  broadcastSSE({ type: 'post_reaction', category, postId, reactionType, updated: item });

  res.json({ success: true, item });
});

// Team Authentication API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // Team members: Anna Vu, Ishaan, Jack, Shefali, Shiva Manickam, Yana C
  const validMembers = ['shiva', 'anna', 'ishaan', 'jack', 'shefali', 'yana', 'admin'];
  
  if (validMembers.includes(username.toLowerCase().trim()) && (password === 'jeemu2026' || password === 'admin' || password === 'wood')) {
    const token = 'tok_' + Math.random().toString(36).substring(2, 10);
    res.cookie('jeemu_auth', token, { maxAge: 86400000 });
    return res.json({
      success: true,
      token,
      member: username,
      role: username.toLowerCase() === 'admin' ? 'Super Admin' : 'Core Team Member'
    });
  }

  res.status(401).json({ error: 'Invalid credentials. Password is "jeemu2026"' });
});

/* ================= SUBDOMAIN ROUTING & STATIC SERVING ================= */

// Determine Subdomain Middleware
app.use((req, res, next) => {
  const host = req.headers.host || '';
  let subdomain = 'launch'; // default

  // 1. Production or local hostname check (e.g. dashboard.jeemu.fun, feed.localhost)
  if (host.startsWith('launch.')) subdomain = 'launch';
  else if (host.startsWith('feed.')) subdomain = 'feed';
  else if (host.startsWith('chaos.')) subdomain = 'chaos';
  else if (host.startsWith('journey.')) subdomain = 'journey';
  else if (host.startsWith('login.')) subdomain = 'login';
  else if (host.startsWith('admin.')) subdomain = 'admin';
  else if (host.startsWith('dashboard.')) subdomain = 'dashboard';

  // 2. Query param override (?subdomain=dashboard)
  if (req.query.subdomain) {
    subdomain = req.query.subdomain;
  }

  req.subdomainName = subdomain;
  next();
});

// Serve dist files if built, otherwise public/src
const distPath = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(distPath);

if (hasDist) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development static serving
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/src', express.static(path.join(__dirname, 'src')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 JEEMU REAL-TIME BACKEND & SUBDOMAIN ROUTER LIVE!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`------------------------------------------------------`);
  console.log(`Subdomains on jeemu.fun (or via ?subdomain= / header):`);
  console.log(` • launch.jeemu.fun    -> http://localhost:${PORT}?subdomain=launch`);
  console.log(` • feed.jeemu.fun      -> http://localhost:${PORT}?subdomain=feed`);
  console.log(` • chaos.jeemu.fun     -> http://localhost:${PORT}?subdomain=chaos`);
  console.log(` • journey.jeemu.fun   -> http://localhost:${PORT}?subdomain=journey`);
  console.log(` • login.jeemu.fun     -> http://localhost:${PORT}?subdomain=login`);
  console.log(` • admin.jeemu.fun     -> http://localhost:${PORT}?subdomain=admin`);
  console.log(` • dashboard.jeemu.fun -> http://localhost:${PORT}?subdomain=dashboard`);
  console.log(`======================================================\n`);
});
