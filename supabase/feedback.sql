-- Run this in Supabase SQL Editor to add the feedback table.
-- It is safe to re-run (uses IF NOT EXISTS / DO blocks).

create table if not exists feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete set null,
  email      text,
  message    text        not null,
  page       text,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

-- Authenticated users can insert their own feedback only.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'feedback'
      and policyname = 'Authenticated users can insert feedback'
  ) then
    execute $policy$
      create policy "Authenticated users can insert feedback"
        on feedback for insert
        to authenticated
        with check (auth.uid() = user_id)
    $policy$;
  end if;
end $$;
