-- Model Comparisons — evaluation dataset for deciding production model.
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists model_comparisons (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete set null,
  idea            text        not null,
  target_tool     text        not null,
  context         jsonb       default '{}'::jsonb,
  models_compared jsonb       not null,
  results         jsonb       not null,
  winner_model    text,
  winner_reason   text,
  created_at      timestamptz default now()
);

alter table model_comparisons enable row level security;

create policy "model_comparisons_select" on model_comparisons
  for select using (auth.uid() = user_id);

create policy "model_comparisons_insert" on model_comparisons
  for insert with check (auth.uid() = user_id);

create policy "model_comparisons_update" on model_comparisons
  for update using (auth.uid() = user_id);

create policy "model_comparisons_delete" on model_comparisons
  for delete using (auth.uid() = user_id);

create index if not exists model_comparisons_user_id_created_at_idx
  on model_comparisons (user_id, created_at desc);
