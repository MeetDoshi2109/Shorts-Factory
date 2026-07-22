-- ════════════════════════════════════════════════════════════════
-- Shorts Factory — Multi-Tenant Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables
-- WARNING: This will drop existing single-tenant tables.
-- ════════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Drop existing tables to start fresh for multi-tenant (or migrate manually)
drop table if exists public.analytics_snapshots cascade;
drop table if exists public.settings cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.runs cascade;
drop table if exists public.topics cascade;
drop table if exists public.videos cascade;

-- ─── Videos ─────────────────────────────────────────────────────────────────
create table public.videos (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users not null,
  video_id      text not null,        -- YouTube video ID
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
  created_at    timestamptz default now(),
  unique(user_id, video_id)
);

-- ─── Topics ──────────────────────────────────────────────────────────────────
create table public.topics (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users not null,
  text       text not null,
  used       boolean default false,
  used_at    timestamptz,
  score      int,
  added_at   timestamptz default now(),
  unique(user_id, text)
);

-- ─── Pipeline Runs ───────────────────────────────────────────────────────────
create table public.runs (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users not null,
  run_id           text not null,
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
  gate_verdict     text,
  unique(user_id, run_id)
);

-- ─── User Settings ───────────────────────────────────────────────────────────
create table public.user_settings (
  user_id        uuid references auth.users primary key,
  
  -- API Keys (Note: In a production app, these should be encrypted)
  gemini_api_key         text,
  youtube_client_id      text,
  youtube_client_secret  text,
  
  -- Preferences
  channel_niche          text default 'personal finance',
  channel_target_audience text default 'young adults 18-35',
  upload_privacy         text default 'public',
  daily_upload_count     text default '3',
  video_duration_max     text default '58',
  
  -- Goals
  target_subs            text default '1000',
  target_views           text default '100000',
  target_uploads         text default '30',
  
  updated_at             timestamptz default now()
);

-- ─── Analytics Snapshots ─────────────────────────────────────────────────────
create table public.analytics_snapshots (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users not null,
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

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
alter table public.videos enable row level security;
alter table public.topics enable row level security;
alter table public.runs enable row level security;
alter table public.user_settings enable row level security;
alter table public.analytics_snapshots enable row level security;

-- Policies: Users can only select, insert, update, delete their own data
create policy "Users can view own videos" on public.videos for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "Users can update own videos" on public.videos for update using (auth.uid() = user_id);
create policy "Users can delete own videos" on public.videos for delete using (auth.uid() = user_id);

create policy "Users can view own topics" on public.topics for select using (auth.uid() = user_id);
create policy "Users can insert own topics" on public.topics for insert with check (auth.uid() = user_id);
create policy "Users can update own topics" on public.topics for update using (auth.uid() = user_id);
create policy "Users can delete own topics" on public.topics for delete using (auth.uid() = user_id);

create policy "Users can view own runs" on public.runs for select using (auth.uid() = user_id);
create policy "Users can insert own runs" on public.runs for insert with check (auth.uid() = user_id);
create policy "Users can update own runs" on public.runs for update using (auth.uid() = user_id);
create policy "Users can delete own runs" on public.runs for delete using (auth.uid() = user_id);

create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);
create policy "Users can delete own settings" on public.user_settings for delete using (auth.uid() = user_id);

create policy "Users can view own analytics" on public.analytics_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own analytics" on public.analytics_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update own analytics" on public.analytics_snapshots for update using (auth.uid() = user_id);
create policy "Users can delete own analytics" on public.analytics_snapshots for delete using (auth.uid() = user_id);

-- Trigger to create user_settings row on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Realtime (enable for live updates) ──────────────────────────────────────
-- In Supabase Dashboard: Database → Replication → enable runs, videos tables
