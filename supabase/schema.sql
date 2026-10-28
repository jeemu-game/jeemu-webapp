-- ==============================================================================
-- JEEMU DATABASE SCHEMA (Supabase / PostgreSQL 15+)
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (everything is "if not exists").
--
-- Columns match backend/app/adapters/supabase_rest.py.
--
-- SECURITY MODEL: these tables are private. Row Level Security is ON and there are NO policies
-- for the public roles (anon / authenticated), so the browser-facing publishable key can read or
-- write nothing. Only the backend, using the server-side secret key (service_role), has access.
-- Never add "public read/update" policies to `subscribers`: it holds every backer's email.
-- ==============================================================================

create table if not exists public.subscribers (
  id text primary key,
  email text unique not null,
  name text default 'Backer',
  referral_code text unique not null,
  referred_by text,
  timestamp bigint not null,
  is_vip boolean default false,
  deposit_amount numeric(10,2) default 0.00,
  friends_referred bigint default 0,
  stripe_charge_id text,
  stripe_session_id text,
  vip_timestamp bigint,
  unsubscribed boolean default false,
  unsubscribed_at bigint,
  created_at timestamptz default now()
);
create index if not exists idx_subscribers_referred_by on public.subscribers(referred_by);

create table if not exists public.telemetry_events (
  id text primary key,
  type text not null,
  timestamp bigint not null,
  iso_time text,
  visitor_id text,
  session_id text,
  url text,
  utm jsonb default '{}'::jsonb,
  dwell_seconds integer default 0,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_telemetry_type on public.telemetry_events(type);
create index if not exists idx_telemetry_timestamp on public.telemetry_events(timestamp desc);
create index if not exists idx_telemetry_visitor_id on public.telemetry_events(visitor_id);

create table if not exists public.posts (
  id text primary key,
  category text not null,
  author text not null,
  role text,
  author_initials text,
  date text,
  title text,
  content text,
  image text,
  likes integer default 0,
  comments integer default 0,
  tag text,
  reactions jsonb default '{"rip": 0, "chaos": 0, "sip": 0}'::jsonb,
  milestone text,
  description text,
  badge text,
  timestamp bigint,
  created_at timestamptz default now()
);
create index if not exists idx_posts_category on public.posts(category);

-- Lock everything: RLS on and no policies = anon/authenticated are denied; service_role bypasses RLS.
alter table public.subscribers enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.posts enable row level security;

revoke all on public.subscribers, public.telemetry_events, public.posts from anon, authenticated;

-- The backend's server role needs explicit table privileges on newer Supabase projects.
grant usage on schema public to service_role;
grant all on public.subscribers, public.telemetry_events, public.posts to service_role;
