-- generation_runs table
-- Stores a record for every prompt/pack/optimize request.
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.generation_runs (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete set null,
  request_id       text        unique not null,
  mode             text        not null,
  target_tool      text,
  pack_type        text,
  input_language   text,
  output_language  text,
  model            text,
  user_idea        text,
  context          jsonb,
  generated_output text,
  generated_json   jsonb,
  score            jsonb,
  status           text        not null check (status in ('started', 'success', 'failed')),
  error_code       text,
  error_message    text,
  latency_ms       integer,
  input_chars      integer,
  output_chars     integer,
  saved_prompt_id  uuid,
  saved_pack_id    uuid,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Index for per-user history
create index if not exists generation_runs_user_id_created_idx
  on public.generation_runs (user_id, created_at desc);

-- Index for admin overview (all runs, newest first)
create index if not exists generation_runs_created_idx
  on public.generation_runs (created_at desc);

-- Index for looking up by request_id (used when linking to saved prompts/packs)
create index if not exists generation_runs_request_id_idx
  on public.generation_runs (request_id);

-- updated_at trigger reuses the existing set_updated_at function from schema.sql
drop trigger if exists generation_runs_set_updated_at on public.generation_runs;
create trigger generation_runs_set_updated_at
  before update on public.generation_runs
  for each row execute function public.set_updated_at();

-- RLS: users can read their own runs; insert/update via service role only
alter table public.generation_runs enable row level security;

drop policy if exists "generation_runs: owner select" on public.generation_runs;
create policy "generation_runs: owner select"
  on public.generation_runs for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE policy for users — all writes go through the service role key
-- (called from server-side route handlers only, never from the browser).
