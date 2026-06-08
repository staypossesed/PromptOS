-- admin_audit_logs table
-- Records sensitive admin actions (viewing user data, generation detail, etc.)
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.admin_audit_logs (
  id               uuid        primary key default gen_random_uuid(),
  admin_user_id    uuid        references auth.users(id) on delete set null,
  admin_email      text,
  action           text        not null,
  target_user_id   uuid,
  target_record_id text,
  metadata         jsonb,
  created_at       timestamptz default now()
);

-- Index for admin queries (newest first)
create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

-- Index for per-admin queries
create index if not exists admin_audit_logs_admin_user_idx
  on public.admin_audit_logs (admin_user_id, created_at desc);

-- RLS: only service role may read or write (no user-facing policies)
alter table public.admin_audit_logs enable row level security;
-- No policies → only service role bypasses RLS and can access this table
