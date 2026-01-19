-- Admin allowlist + is_admin() RPC
-- Keeps admin authorization inside the database, without exposing the allowlist.

create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users
);

alter table public.admin_allowlist enable row level security;

-- Remove default access
revoke all on table public.admin_allowlist from anon, authenticated;

-- RPC: is_admin() - checks allowlist by JWT email claim
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;