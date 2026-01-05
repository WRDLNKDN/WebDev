-- supabase/migrations/20260102152500_profiles_rls.sql
-- Idempotent migration for public.profiles + RLS + "no self-approval"

-- 0) Create table if missing (minimal baseline)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  handle text unique not null,
  geek_creds text[],
  nerd_creds jsonb,
  pronouns text,
  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb
);

-- 1) Ensure moderation + audit columns exist (and timestamps) BEFORE indexes/policies
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at'
  ) then
    alter table public.profiles add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles add column status text not null default 'pending';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'reviewed_at'
  ) then
    alter table public.profiles add column reviewed_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'reviewed_by'
  ) then
    alter table public.profiles add column reviewed_by uuid references auth.users;
  end if;
end $$;

-- 2) Optional: status check constraint (safe add-if-missing)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('pending', 'approved', 'rejected', 'disabled'));
  end if;
end $$;

-- 3) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 4) Block self-approval / status tampering unless service_role
create or replace function public.profiles_block_status_change()
returns trigger
language plpgsql
as $$
declare
  jwt_role text;
begin
  -- Supabase sets request.jwt.claim.role for API requests
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- If status didn't change, allow
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Only service_role can change status (admin operations)
  if jwt_role = 'service_role' then
    return new;
  end if;

  raise exception 'Users cannot change status';
end;
$$;

drop trigger if exists trg_profiles_block_status_change on public.profiles;

create trigger trg_profiles_block_status_change
before update of status on public.profiles
for each row
execute function public.profiles_block_status_change();

-- 5) Indexes (now safe because columns exist)
create index if not exists idx_profiles_created_at on public.profiles (created_at);
create index if not exists idx_profiles_status on public.profiles (status);
create index if not exists idx_profiles_handle on public.profiles (handle);

-- 6) RLS policies
alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read_approved" on public.profiles;
drop policy if exists "profiles_user_read_own" on public.profiles;
drop policy if exists "profiles_user_insert_own" on public.profiles;
drop policy if exists "profiles_user_update_own" on public.profiles;

-- Public can ONLY read approved profiles
create policy "profiles_public_read_approved"
on public.profiles
for select
using (status = 'approved');

-- Signed-in users can read their OWN profile even if pending/rejected
create policy "profiles_user_read_own"
on public.profiles
for select
using (auth.uid() = id);

-- Users can insert ONLY their own profile
create policy "profiles_user_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

-- Users can update ONLY their own profile (status changes blocked by trigger + privileges)
create policy "profiles_user_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 7) Privileges: prevent authenticated from updating status/review fields at the SQL layer too
-- (service_role bypasses RLS and also isn't restricted by these grants in practice)
revoke all on table public.profiles from anon, authenticated;

-- Everyone can SELECT (RLS filters rows)
grant select on table public.profiles to anon, authenticated;

-- Only authenticated can INSERT
grant insert on table public.profiles to authenticated;

-- Only allow authenticated to UPDATE safe columns (NO status, reviewed_at, reviewed_by, created_at, updated_at)
grant update (handle, geek_creds, nerd_creds, pronouns, socials) on table public.profiles to authenticated;