-- ==============================================================================
-- JEEMU TABLETOP CONSOLE — SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 15+ & Supabase Realtime
-- ==============================================================================

-- 1. Enable UUID Extension (Optional utility)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE: subscribers (Waitlist & VIP Early Bird Backers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT 'Backer',
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    is_vip BOOLEAN DEFAULT FALSE,
    deposit_amount NUMERIC(10, 2) DEFAULT 0.00,
    friends_referred INT DEFAULT 0,
    stripe_charge_id TEXT,
    vip_timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast referral lookup & email uniqueness
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_code ON public.subscribers(referral_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_referred_by ON public.subscribers(referred_by);

-- ==============================================================================
-- TABLE: telemetry_events (Click Heatmaps, Scrolls, & Funnel Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    iso_time TEXT,
    visitor_id TEXT,
    session_id TEXT,
    url TEXT,
    utm JSONB DEFAULT '{}'::JSONB,
    dwell_seconds INT DEFAULT 0,
    data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON public.telemetry_events(type);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON public.telemetry_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_visitor_id ON public.telemetry_events(visitor_id);

-- ==============================================================================
-- TABLE: posts (Community Feed, Chaos Lab Fails, & Hardware Journey)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('feed', 'chaos', 'journey')),
    author TEXT NOT NULL,
    role TEXT,
    author_initials TEXT,
    date TEXT,
    title TEXT,
    content TEXT,
    image TEXT,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    tag TEXT,
    reactions JSONB DEFAULT '{"rip": 0, "chaos": 0, "sip": 0}'::JSONB,
    milestone TEXT,
    description TEXT,
    badge TEXT,
    timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category, created_at DESC);

-- ==============================================================================
-- TABLE: settings (Platform & Kickstarter Configuration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Subscribers Policies:
-- Anyone can register their email / join waitlist
CREATE POLICY "Allow public insert to subscribers" 
ON public.subscribers FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Anyone can read their own or referral info
CREATE POLICY "Allow public select of subscribers" 
ON public.subscribers FOR SELECT 
TO anon, authenticated 
USING (true);

-- Allow updates (e.g. VIP deposit upgrade or referral counter increment)
CREATE POLICY "Allow public update of subscribers" 
ON public.subscribers FOR UPDATE 
TO anon, authenticated 
USING (true);

-- Telemetry Policies:
CREATE POLICY "Allow public insert to telemetry_events" 
ON public.telemetry_events FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public select of telemetry_events" 
ON public.telemetry_events FOR SELECT 
TO anon, authenticated 
USING (true);

-- Posts Policies:
CREATE POLICY "Allow public select of posts" 
ON public.posts FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public insert of posts" 
ON public.posts FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public update of posts (reactions and likes)" 
ON public.posts FOR UPDATE 
TO anon, authenticated 
USING (true);

-- Settings Policies:
CREATE POLICY "Allow public read of settings" 
ON public.settings FOR SELECT 
TO anon, authenticated 
USING (true);

-- Full access for service_role
CREATE POLICY "Allow service_role full access to subscribers" 
ON public.subscribers FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access to telemetry_events" 
ON public.telemetry_events FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access to posts" 
ON public.posts FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access to settings" 
ON public.settings FOR ALL TO service_role USING (true);

-- ==============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
-- Enable Realtime broadcasting on subscribers, telemetry_events, and posts tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscribers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'telemetry_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;

-- Set replica identity to FULL for granular realtime updates
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;
ALTER TABLE public.telemetry_events REPLICA IDENTITY FULL;
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- ==============================================================================
-- SEED INITIAL DATA
-- ==============================================================================

-- Initial Subscribers
INSERT INTO public.subscribers (id, email, name, referral_code, referred_by, timestamp, is_vip, deposit_amount, friends_referred, stripe_charge_id)
VALUES 
    ('sub_init_1', 'alex.tabletop@gmail.com', 'Alex Rivera', 'JEEMU-VIP982', NULL, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 86400000, TRUE, 1.00, 3, 'ch_3M001StripeJeemu'),
    ('sub_init_2', 'chloe.boardgames@hey.com', 'Chloe Bennett', 'JEEMU-B382', 'JEEMU-VIP982', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 64800000, FALSE, 0.00, 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Initial Posts
INSERT INTO public.posts (id, category, author, role, author_initials, date, title, content, image, likes, comments, timestamp)
VALUES 
    ('feed_1', 'feed', 'Anna Vu', 'Hardware & Industrial Design', 'AV', 'Sep 18, 2026', 
     'Batch #3 Beechwood Milling: Custom Chamfer & Friction Testing', 
     'We tested 4 different wood finishes this week. High-gloss polyurethane looks shiny on photos, but in real play it caused the blocks to stick together unpredictably when pulling from the middle levels. We settled on a bespoke double-sanded beeswax matte polish. It provides the signature buttery Jenga slide while maintaining a silky tactile warmth in your hand.', 
     '/images/jeemu-hardware.jpg', 42, 9, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 172800000),
    ('feed_2', 'feed', 'Ishaan', 'Embedded Firmware & NFC', 'IS', 'Sep 14, 2026', 
     'Firmware v2.4: Achieving Sub-80ms Tag Detection on the Dock', 
     'The biggest headache with earlier prototypes was the delay between slamming a block on the reader and seeing the IPS display prompt appear. If it takes more than 300ms, the physical party rhythm is interrupted. With our custom dual-antenna coil arrangement inside the dock and SPI bus tuning, we brought tag response time down to 78 milliseconds. It feels instantaneous.', 
     NULL, 67, 14, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 345600000),
    ('feed_3', 'feed', 'Shiva Manickam', 'Platform & AI Architecture', 'SM', 'Sep 09, 2026', 
     'Why AI Game Creation Changes Everything', 
     'Traditional board games are static. You play 3 times and memorize all the cards. With Jeemu''s mobile companion, you can literally type "Spicy Date Night for couple celebrating 5th anniversary who love sushi" and our model populates 45 custom prompt blocks in 8 seconds. You sync it via Bluetooth to the dock once, then turn your phone OFF for the entire game.', 
     NULL, 89, 23, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 518400000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.posts (id, category, author, role, author_initials, date, tag, content, reactions, timestamp)
VALUES 
    ('chaos_1', 'chaos', 'Jack', 'Game Systems', 'JK', 'Yesterday', 
     '💀 EPIC FAIL', 
     'Playtester Marcus tried to remove Block #45 using his elbows because the rule said "non-dominant limb". The entire 32-level tower collapsed into Anna''s gin & tonic. 10/10 gameplay experience.', 
     '{"rip": 54, "chaos": 38, "sip": 29}'::JSONB, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 86400000),
    ('chaos_2', 'chaos', 'Shefali', 'Community', 'SH', '2 days ago', 
     '🍺 UNHINGED DARE', 
     'New prompt submission approved for the "After Dark" expansion pack: "Call your most recent food delivery driver and thank them for changing your life, or finish your beverage." Who hurt the person who submitted this??', 
     '{"rip": 19, "chaos": 82, "sip": 45}'::JSONB, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 172800000),
    ('chaos_3', 'chaos', 'Yana C', 'Operations', 'YC', '4 days ago', 
     '🧪 LAB OUTTAKE', 
     'Engineering note: Do NOT stack 45 blocks horizontally on the smart dock to test "simultaneous read capability". It threw error code #420: "Too much wood on desk".', 
     '{"rip": 41, "chaos": 65, "sip": 18}'::JSONB, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 345600000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.posts (id, category, author, milestone, date, title, description, badge, timestamp)
VALUES 
    ('journey_1', 'journey', 'Shiva & Jack', 'Phase 1: The Frustration', 'January 2026', 
     'Classic Jenga is great for 15 minutes, then gathers dust.', 
     'We taped index cards with handwritten drinking dares to standard blocks. It was hilarious, but within 2 games the tape peeled. We asked: what if the physical wood could dynamically trigger ANY game mode digitally?', 
     'The Spark', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 20000000000),
    ('journey_2', 'journey', 'Anna & Ishaan', 'Phase 2: Prototype V1 (Garage Hack)', 'March 2026', 
     'Drilling 45 blocks and frying two Arduino Nanos.', 
     'We drilled cavities into beechwood blocks with a Dremel press and embedded 13.56MHz NFC tags with wood epoxy. The first reader was a messy cardboard box with an Arduino taped to it.', 
     'First Hardware', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 15000000000),
    ('journey_3', 'journey', 'Entire Team', 'Phase 3: The Custom Dock & Standalone OS', 'June 2026', 
     'Zero phones at the table. Standalone hardware decision.', 
     'Gamers hate staring at apps while playing tabletop games. We built the Jeemu Smart Box as a standalone game master with a panoramic IPS display and internal battery. Phone-free during play.', 
     'Core Breakthrough', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 8000000000)
ON CONFLICT (id) DO NOTHING;

-- Initial Settings
INSERT INTO public.settings (key, value)
VALUES 
    ('general', '{
        "stripePaymentLink": "https://buy.stripe.com/00wbJ0ahV5htgzrgxLbAs0k",
        "earlyBirdGoal": 500,
        "launchDate": "2026-10-15T18:00:00Z"
    }'::JSONB)
ON CONFLICT (key) DO NOTHING;
