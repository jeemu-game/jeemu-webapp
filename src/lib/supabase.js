/**
 * JEEMU UNIFIED DATA ACCESS LAYER — SUPABASE & LOCAL FALLBACK
 * Automatically detects whether Supabase environment variables are available:
 * - If SUPABASE_URL is provided: executes PostgreSQL queries via @supabase/supabase-js
 * - If absent: seamlessly falls back to data/jeemu.db.json (ideal for offline & local development)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'jeemu.db.json');

// Check environment variables (Supports new Publishable & Secret Keys as well as legacy keys)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://quhpizadgfhhrdfompnm.supabase.co';
const SUPABASE_KEY = 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY || 
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
  : null;

if (isSupabaseConfigured) {
  const keyType = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'Secret/Service Role Key' : 'Publishable/Anon Key';
  console.log(`⚡ Connected to Supabase Cloud Database at: ${SUPABASE_URL} (using ${keyType})`);
} else {
  console.log('📂 Running in Local JSON Mode (data/jeemu.db.json). Set SUPABASE_SECRET_KEY or SUPABASE_PUBLISHABLE_KEY to enable Cloud DB.');
}

/* ================= LOCAL DB FALLBACK STATE ================= */

let localDb = {
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
        content: 'The biggest headache with earlier prototypes was the delay between slamming a block on the reader and seeing the IPS display prompt appear. If it takes more than 300ms, the physical party rhythm is interrupted. With our custom dual-antenna coil arrangement inside the dock and SPI bus tuning, we brought tag response time down to 78 milliseconds. It feels instantaneous.',
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
        content: 'Engineering note: Do NOT stack 45 blocks horizontally on the smart dock to test "simultaneous read capability". It threw error code #420: "Too much wood on desk".',
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
        description: 'Gamers hate staring at apps while playing tabletop games. We built the Jeemu Smart Box as a standalone game master with a panoramic IPS display and internal battery. Phone-free during play.',
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

// Try loading local db file if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    localDb = { ...localDb, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not read local DB file, using default in-memory schema.');
}

let saveTimeout = null;
function saveLocalDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFile(DB_FILE, JSON.stringify(localDb, null, 2), (err) => {
        if (err) console.error('Error saving local db:', err);
      });
    } catch (e) {}
  }, 400);
}

/* ================= UNIFIED REPOSITORY METHODS ================= */

/**
 * Realtime broadcast helper (via Supabase Realtime channel or fallback)
 */
export async function broadcastRealtime(eventPayload) {
  if (isSupabaseConfigured && supabase) {
    try {
      const channel = supabase.channel('jeemu-realtime');
      await channel.send({
        type: 'broadcast',
        event: eventPayload.type,
        payload: eventPayload
      });
    } catch (err) {
      console.warn('Supabase realtime broadcast error:', err.message);
    }
  }
}

/**
 * 1. Subscribers
 */
export async function getSubscribers() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data) {
      return data.map(normalizeSubscriberFromDb);
    }
    console.error('Error fetching subscribers from Supabase:', error);
  }
  return localDb.subscribers;
}

export async function findSubscriberByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!error && data) {
      return normalizeSubscriberFromDb(data);
    }
  }

  return localDb.subscribers.find(s => s.email.toLowerCase() === cleanEmail) || null;
}

export async function createSubscriber({ email, name, ref }) {
  const referralCode = 'JEEMU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const sub = {
    id: 'sub_' + Date.now(),
    email: email.toLowerCase().trim(),
    name: name || 'Backer',
    referralCode,
    referredBy: ref || null,
    timestamp: Date.now(),
    isVip: false,
    depositAmount: 0.0,
    friendsReferred: 0
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        id: sub.id,
        email: sub.email,
        name: sub.name,
        referral_code: sub.referralCode,
        referred_by: sub.referredBy,
        timestamp: sub.timestamp,
        is_vip: sub.isVip,
        deposit_amount: sub.depositAmount,
        friends_referred: sub.friendsReferred
      })
      .select()
      .single();

    if (!error && data) {
      // Credit inviter if applicable
      if (ref && ref !== referralCode) {
        await incrementReferralCount(ref);
      }
      return normalizeSubscriberFromDb(data);
    }
    console.error('Error inserting subscriber to Supabase:', error);
  }

  // Fallback to local
  localDb.subscribers.push(sub);
  if (ref && ref !== referralCode) {
    const inviter = localDb.subscribers.find(s => s.referralCode === ref);
    if (inviter) inviter.friendsReferred = (inviter.friendsReferred || 0) + 1;
  }
  saveLocalDb();
  return sub;
}

export async function incrementReferralCount(referralCode) {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('subscribers')
      .select('id, friends_referred')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (data) {
      await supabase
        .from('subscribers')
        .update({ friends_referred: (data.friends_referred || 0) + 1 })
        .eq('id', data.id);
    }
  }
}

export async function registerVipDeposit({ subscriberId, referralCode, amount = 1.0 }) {
  const stripeChargeId = 'ch_3M' + Math.random().toString(36).substring(2, 9) + 'StripeJeemu';
  const now = Date.now();

  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('subscribers').select('*');
    if (subscriberId) query = query.eq('id', subscriberId);
    else if (referralCode) query = query.eq('referral_code', referralCode);
    else query = query.order('timestamp', { ascending: false }).limit(1);

    const { data } = await query.maybeSingle();
    if (data) {
      const { data: updated, error } = await supabase
        .from('subscribers')
        .update({
          is_vip: true,
          deposit_amount: amount,
          vip_timestamp: now,
          stripe_charge_id: stripeChargeId
        })
        .eq('id', data.id)
        .select()
        .single();

      if (!error && updated) {
        return { subscriber: normalizeSubscriberFromDb(updated), stripeChargeId };
      }
    }
  }

  // Fallback to local
  let sub = localDb.subscribers.find(s => s.id === subscriberId || s.referralCode === referralCode);
  if (!sub && localDb.subscribers.length > 0) {
    sub = localDb.subscribers[localDb.subscribers.length - 1];
  }

  if (sub) {
    sub.isVip = true;
    sub.depositAmount = amount;
    sub.vipTimestamp = now;
    sub.stripeChargeId = stripeChargeId;
    saveLocalDb();
  }

  return { subscriber: sub, stripeChargeId };
}

/**
 * 2. Telemetry Events
 */
export async function logTelemetryEvent(eventData) {
  const event = {
    id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    isoTime: new Date().toLocaleTimeString(),
    ...eventData
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('telemetry_events').insert({
        id: event.id,
        type: event.type || 'unknown',
        timestamp: event.timestamp,
        iso_time: event.isoTime,
        visitor_id: event.visitorId || null,
        session_id: event.sessionId || null,
        url: event.url || null,
        utm: event.utm || {},
        dwell_seconds: event.dwellSeconds || 0,
        data: event.data || {}
      });
    } catch (err) {
      console.warn('Failed to insert telemetry to Supabase:', err.message);
    }
  }

  // Always keep local list updated for fast aggregations
  localDb.events.push(event);
  if (localDb.events.length > 1000) localDb.events.shift();
  saveLocalDb();

  return event;
}

export async function getTelemetryMetrics() {
  let events = localDb.events;
  let subscribers = localDb.subscribers;

  if (isSupabaseConfigured && supabase) {
    try {
      const [eventsRes, subsRes] = await Promise.all([
        supabase.from('telemetry_events').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('subscribers').select('*')
      ]);

      if (!eventsRes.error && eventsRes.data) {
        events = eventsRes.data.map(normalizeEventFromDb);
      }
      if (!subsRes.error && subsRes.data) {
        subscribers = subsRes.data.map(normalizeSubscriberFromDb);
      }
    } catch (e) {
      console.warn('Error querying Supabase metrics, using local cache:', e.message);
    }
  }

  const uniqueVisitors = new Set(events.map(e => e.visitorId).filter(Boolean)).size || 1;
  const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size || 1;
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

  return {
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
    recentEvents: events.slice(0, 30)
  };
}

/**
 * 3. Posts (Feed, Chaos, Journey)
 */
export async function getPosts() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const posts = { feed: [], chaos: [], journey: [] };
      data.forEach(p => {
        const item = normalizePostFromDb(p);
        if (posts[p.category]) posts[p.category].push(item);
      });
      // Reverse journey milestones so chronological
      posts.journey.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return posts;
    }
  }
  return localDb.posts;
}

export async function createPost(category, post) {
  const newPost = {
    id: `${category}_` + Date.now(),
    timestamp: Date.now(),
    ...post
  };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('posts').insert({
      id: newPost.id,
      category,
      author: newPost.author || 'Anonymous',
      role: newPost.role || null,
      author_initials: newPost.authorInitials || null,
      date: newPost.date || 'Today',
      title: newPost.title || null,
      content: newPost.content || null,
      image: newPost.image || null,
      likes: newPost.likes || 0,
      comments: newPost.comments || 0,
      tag: newPost.tag || null,
      reactions: newPost.reactions || { rip: 0, chaos: 0, sip: 0 },
      milestone: newPost.milestone || null,
      description: newPost.description || null,
      badge: newPost.badge || null,
      timestamp: newPost.timestamp
    });
  }

  if (category === 'journey') {
    localDb.posts.journey.push(newPost);
  } else {
    localDb.posts[category].unshift(newPost);
  }
  saveLocalDb();

  return newPost;
}

export async function reactToPost(category, postId, reactionType) {
  if (isSupabaseConfigured && supabase) {
    const { data: current } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle();
    if (current) {
      let updatePayload = {};
      if (category === 'feed') {
        updatePayload = { likes: (current.likes || 0) + 1 };
      } else if (category === 'chaos') {
        const reactions = current.reactions || { rip: 0, chaos: 0, sip: 0 };
        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        updatePayload = { reactions };
      }

      const { data: updated } = await supabase
        .from('posts')
        .update(updatePayload)
        .eq('id', postId)
        .select()
        .single();

      if (updated) return normalizePostFromDb(updated);
    }
  }

  // Fallback to local
  const list = localDb.posts[category];
  if (!list) return null;
  const item = list.find(p => p.id === postId);
  if (!item) return null;

  if (category === 'feed') {
    item.likes = (item.likes || 0) + 1;
  } else if (category === 'chaos') {
    item.reactions = item.reactions || { rip: 0, chaos: 0, sip: 0 };
    item.reactions[reactionType] = (item.reactions[reactionType] || 0) + 1;
  }

  saveLocalDb();
  return item;
}

/* ================= HELPER NORMALIZERS ================= */

function normalizeSubscriberFromDb(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    timestamp: Number(row.timestamp),
    isVip: row.is_vip,
    depositAmount: Number(row.deposit_amount || 0),
    friendsReferred: Number(row.friends_referred || 0),
    stripeChargeId: row.stripe_charge_id
  };
}

function normalizeEventFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    timestamp: Number(row.timestamp),
    isoTime: row.iso_time,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    url: row.url,
    utm: row.utm,
    dwellSeconds: row.dwell_seconds,
    data: row.data
  };
}

function normalizePostFromDb(row) {
  return {
    id: row.id,
    category: row.category,
    author: row.author,
    role: row.role,
    authorInitials: row.author_initials,
    date: row.date,
    title: row.title,
    content: row.content,
    image: row.image,
    likes: row.likes,
    comments: row.comments,
    tag: row.tag,
    reactions: row.reactions,
    milestone: row.milestone,
    description: row.description,
    badge: row.badge,
    timestamp: Number(row.timestamp)
  };
}
