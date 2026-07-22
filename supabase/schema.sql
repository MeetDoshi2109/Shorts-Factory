-- ════════════════════════════════════════════════════════════════
-- Shorts Factory — Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables
-- ════════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Videos ─────────────────────────────────────────────────────────────────
create table if not exists public.videos (
  id            uuid default uuid_generate_v4() primary key,
  video_id      text unique not null,        -- YouTube video ID
  title         text not null,
  topic         text,
  description   text,
  url           text,
  thumbnail     text,
  views         bigint default 0,
  likes         bigint default 0,
  comments      bigint default 0,
  published_at  timestamptz,
  privacy       text default 'public',
  run_id        text,
  created_at    timestamptz default now()
);

-- ─── Topics ──────────────────────────────────────────────────────────────────
create table if not exists public.topics (
  id         uuid default uuid_generate_v4() primary key,
  text       text unique not null,
  used       boolean default false,
  used_at    timestamptz,
  score      int,                            -- virality gate score
  added_at   timestamptz default now()
);

-- Insert default topics
insert into public.topics (text) values
  ('The hidden fees that drain your bank account every month'),
  ('Why your savings account is losing you money (inflation math)'),
  ('The 50-30-20 budget rule — does it actually work?'),
  ('Credit score myths that cost people thousands'),
  ('The one financial mistake millennials keep making'),
  ('How compound interest really works (with real numbers)'),
  ('Why you should never carry a credit card balance'),
  ('Emergency fund: how much is actually enough?'),
  ('Side hustles that actually make money vs. hype'),
  ('The true cost of buying vs. renting right now'),
  ('Dollar-cost averaging explained in 60 seconds'),
  ('The 3 accounts everyone should have before 30'),
  ('Why your car payment is destroying your wealth'),
  ('Index funds vs. picking stocks — what the data shows'),
  ('How to negotiate your salary (scripts that work)'),
  ('The subscription audit that could save you $200/month'),
  ('Why most people never get a raise (and how to fix it)'),
  ('401k mistakes that cost you a fortune at retirement'),
  ('The snowball vs. avalanche debt payoff method'),
  ('Roth IRA vs. Traditional IRA — which is right for you?')
on conflict (text) do nothing;

-- ─── Pipeline Runs ───────────────────────────────────────────────────────────
create table if not exists public.runs (
  id               uuid default uuid_generate_v4() primary key,
  run_id           text unique not null,
  topic            text,
  title            text,
  status           text default 'pending',  -- pending | running | success | failed
  started_at       timestamptz default now(),
  finished_at      timestamptz,
  elapsed_seconds  int,
  video_id         text,
  url              text,
  error            text,
  dry_run          boolean default false,
  gate_score       int,
  gate_verdict     text
);

-- ─── Settings ────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- Insert defaults
insert into public.settings (key, value) values
  ('CHANNEL_NICHE', 'personal finance'),
  ('CHANNEL_TARGET_AUDIENCE', 'young adults 18-35'),
  ('UPLOAD_PRIVACY', 'public'),
  ('DAILY_UPLOAD_COUNT', '3'),
  ('VIDEO_DURATION_MAX', '58')
on conflict (key) do update set value = excluded.value;

-- ─── Analytics Snapshots ─────────────────────────────────────────────────────
create table if not exists public.analytics_snapshots (
  id            uuid default uuid_generate_v4() primary key,
  period_days   int default 28,
  total_views   bigint default 0,
  total_subs    bigint default 0,
  watch_minutes float default 0,
  subs_gained   int default 0,
  likes         bigint default 0,
  daily_views   jsonb default '[]',
  top_videos    jsonb default '[]',
  channel_info  jsonb default '{}',
  fetched_at    timestamptz default now()
);

-- ─── Row Level Security (optional, enable if using Supabase Auth) ────────────
-- alter table public.videos enable row level security;
-- alter table public.topics enable row level security;
-- alter table public.runs enable row level security;
-- alter table public.settings enable row level security;

-- ─── Realtime (enable for live updates) ──────────────────────────────────────
-- In Supabase Dashboard: Database → Replication → enable runs, videos tables
