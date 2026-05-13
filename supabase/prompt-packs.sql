-- prompt_packs table
-- Run this in Supabase SQL editor.
-- Safe to run on a fresh DB or one where the table was already created by the old schema.

create table if not exists prompt_packs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  pack_type  text not null check (pack_type in (
    'build_an_app',
    'launch_a_saas',
    'sales_outreach_campaign',
    'automation_workflow',
    'research_report'
  )),
  idea       text not null,
  context    jsonb not null default '{}'::jsonb,
  prompts    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns if table was created without them (idempotent)
alter table prompt_packs add column if not exists context    jsonb not null default '{}'::jsonb;
alter table prompt_packs add column if not exists updated_at timestamptz not null default now();

-- Index for user's pack history (newest first)
drop index if exists prompt_packs_user_id_created_at_idx;
create index if not exists prompt_packs_user_id_updated_at_idx
  on prompt_packs (user_id, updated_at desc);

-- RLS
alter table prompt_packs enable row level security;

drop policy if exists "Users can read own packs"   on prompt_packs;
drop policy if exists "Users can insert own packs"  on prompt_packs;
drop policy if exists "Users can update own packs"  on prompt_packs;
drop policy if exists "Users can delete own packs"  on prompt_packs;

create policy "Users can read own packs"
  on prompt_packs for select
  using (auth.uid() = user_id);

create policy "Users can insert own packs"
  on prompt_packs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own packs"
  on prompt_packs for update
  using (auth.uid() = user_id);

create policy "Users can delete own packs"
  on prompt_packs for delete
  using (auth.uid() = user_id);

-- updated_at auto-trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_prompt_packs_updated_at on prompt_packs;
create trigger set_prompt_packs_updated_at
  before update on prompt_packs
  for each row
  execute function update_updated_at_column();
