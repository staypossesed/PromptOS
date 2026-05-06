-- ============================================================
-- PromptOS — Day 3 Database Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere
-- ============================================================


-- ── 1. profiles ──────────────────────────────────────────────────────────
-- Mirrors auth.users for app-level profile data.
-- Created automatically on first sign-in via the trigger below.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ── 2. prompts ────────────────────────────────────────────────────────────

create table if not exists public.prompts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  idea             text not null,
  context          jsonb not null default '{}'::jsonb,
  target_tool      text not null,                  -- 'claude' | 'cursor' | 'chatgpt'
  generated_prompt text not null,
  score            jsonb,                           -- PromptScore | null
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Constraint: only allowed tool values
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'prompts_target_tool_check'
      and table_name = 'prompts'
  ) then
    alter table public.prompts
      add constraint prompts_target_tool_check
      check (target_tool in ('claude', 'cursor', 'chatgpt'));
  end if;
end$$;

-- ── 3. prompt_generations ─────────────────────────────────────────────────
-- Lightweight usage log. One row per generation event.

create table if not exists public.prompt_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  prompt_id   uuid references public.prompts(id) on delete set null,
  tokens_used int,
  model       text,
  latency_ms  int,
  created_at  timestamptz not null default now()
);


-- ── Indexes ───────────────────────────────────────────────────────────────

create index if not exists prompts_user_id_updated_at_idx
  on public.prompts(user_id, updated_at desc);

create index if not exists prompt_generations_user_id_idx
  on public.prompt_generations(user_id, created_at desc);

create index if not exists prompt_generations_prompt_id_idx
  on public.prompt_generations(prompt_id);


-- ── updated_at auto-trigger ───────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();


-- ── Auto-create profile on sign-up ────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── Row Level Security ────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.prompts            enable row level security;
alter table public.prompt_generations enable row level security;


-- profiles: users read and update only their own row
drop policy if exists "profiles: owner select" on public.profiles;
create policy "profiles: owner select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: owner update" on public.profiles;
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- prompts: full CRUD on own rows only
drop policy if exists "prompts: owner select" on public.prompts;
create policy "prompts: owner select"
  on public.prompts for select
  using (auth.uid() = user_id);

drop policy if exists "prompts: owner insert" on public.prompts;
create policy "prompts: owner insert"
  on public.prompts for insert
  with check (auth.uid() = user_id);

drop policy if exists "prompts: owner update" on public.prompts;
create policy "prompts: owner update"
  on public.prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prompts: owner delete" on public.prompts;
create policy "prompts: owner delete"
  on public.prompts for delete
  using (auth.uid() = user_id);


-- prompt_generations: users read their own rows; insert via authenticated client
drop policy if exists "generations: owner select" on public.prompt_generations;
create policy "generations: owner select"
  on public.prompt_generations for select
  using (auth.uid() = user_id);

drop policy if exists "generations: owner insert" on public.prompt_generations;
create policy "generations: owner insert"
  on public.prompt_generations for insert
  with check (auth.uid() = user_id);


-- ── Done ──────────────────────────────────────────────────────────────────
-- Tables:   profiles, prompts, prompt_generations
-- Indexes:  prompts(user_id, updated_at), generations(user_id), generations(prompt_id)
-- Triggers: updated_at auto-set, auto-create profile on auth.users insert
-- RLS:      all tables locked to authenticated owner
