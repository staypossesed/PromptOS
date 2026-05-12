-- prompt_packs table
-- MVP: packs are not persisted (generated and used client-side only).
-- This schema is reserved for a future "Save pack" feature.

create table if not exists prompt_packs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  pack_type   text not null check (pack_type in (
    'build_an_app',
    'launch_a_saas',
    'sales_outreach_campaign',
    'automation_workflow',
    'research_report'
  )),
  idea        text not null,
  prompts     jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- Index for the user's pack history list
create index if not exists prompt_packs_user_id_created_at_idx
  on prompt_packs (user_id, created_at desc);

-- RLS
alter table prompt_packs enable row level security;

create policy "Users can read own packs"
  on prompt_packs for select
  using (auth.uid() = user_id);

create policy "Users can insert own packs"
  on prompt_packs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own packs"
  on prompt_packs for delete
  using (auth.uid() = user_id);
