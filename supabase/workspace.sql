-- Private context profiles and reusable playbooks. Safe to run again.
-- Apply after schema.sql. No existing prompts or billing rows are changed.
create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('profile', 'playbook')),
  name text not null check (char_length(name) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_items_owner_idx on public.workspace_items(user_id, updated_at desc);
alter table public.workspace_items enable row level security;
revoke all on public.workspace_items from anon;
grant select, insert, update, delete on public.workspace_items to authenticated;
drop policy if exists "workspace owner" on public.workspace_items;
create policy "workspace owner" on public.workspace_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop trigger if exists workspace_items_updated_at on public.workspace_items;
create trigger workspace_items_updated_at before update on public.workspace_items
  for each row execute function public.set_updated_at();
