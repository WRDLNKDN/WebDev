-- supabase/migrations/20260121180000_profiles_baseline.sql
-- Baseline schema for profiles + admin allowlist + helpers
-- Safe for fresh db reset (no references to missing tables).

-- -----------------------------
-- Drop functions first (no table refs)
-- -----------------------------
drop function if exists public.set_updated_at() cascade;
drop function if exists public.profiles_block_status_change() cascade;
drop function if exists public.is_admin() cascade;

-- -----------------------------
-- Drop tables (this will drop triggers on them too)
-- -----------------------------
drop table if exists public.profiles cascade;
drop table if exists public.admin_allowlist cascade;

-- -----------------------------
-- Admin allowlist (NO RLS)
-- -----------------------------
create table public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Lock it down (service_role bypasses anyway)
revoke all on table public.admin_allowlist from anon, authenticated;

-- -----------------------------
-- is_admin() helper
-- SECURITY DEFINER so it can read admin_allowlist even though users cannot.
-- -----------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

comment on function public.is_admin() is
  'True if current JWT email is in public.admin_allowlist.';

-- -----------------------------
-- profiles table
-- -----------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null,

  handle text not null,
  display_name text,
  avatar text,
  tagline text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'disabled')),

  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),

  geek_creds text[],
  nerd_creds jsonb,
  pronouns text,

  join_reason text[],
  participation_style text[],
  additional_context text,

  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb,

  is_admin boolean not null default false
);

-- Indexes
create unique index idx_profiles_handle_lower_unique
  on public.profiles (lower(handle));

create index idx_profiles_created_at on public.profiles (created_at);
create index idx_profiles_status on public.profiles (status);
create index idx_profiles_handle on public.profiles (handle);
create index idx_profiles_email on public.profiles (email);

-- -----------------------------
-- updated_at trigger
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- -----------------------------
-- Block status changes unless admin or service_role
-- -----------------------------
create or replace function public.profiles_block_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  claims jsonb;
  jwt_role text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  jwt_role := coalesce(claims->>'role', '');

  if jwt_role in ('service_role', 'supabase_admin') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'Users cannot change status';
end;
$$;

create trigger trg_profiles_block_status_change
before update of status on public.profiles
for each row
execute function public.profiles_block_status_change();