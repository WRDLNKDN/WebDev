-- supabase/migrations/20260121180000_profiles_baseline.sql
-- Baseline schema for profiles + admin allowlist (DEV squash)
-- This migration is intended to be the single source of truth for the initial schema.

-- -----------------------------
-- profiles table
-- -----------------------------
create table public.profiles (
  -- Link to auth.users
  id uuid primary key references auth.users(id) on delete cascade,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Public handle / gamertag
  handle text not null,

  -- Moderation / approval
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'disabled')),

  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),

  -- Profile metadata
  geek_creds text[],
  nerd_creds jsonb,
  pronouns text,

  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb,

  -- Admin flag (optional; allowlist is still the source of truth for admin UI access)
  is_admin boolean not null default false
);

-- Case-insensitive UNIQUE handle (prevents Nick/nick collisions)
create unique index idx_profiles_handle_lower_unique
  on public.profiles (lower(handle));

create index idx_profiles_created_at on public.profiles (created_at);
create index idx_profiles_status on public.profiles (status);
create index idx_profiles_handle on public.profiles (handle);

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
-- Block self-approval / status tampering unless service_role
-- -----------------------------
create or replace function public.profiles_block_status_change()
returns trigger
language plpgsql
as $$
declare
  claims jsonb;
  jwt_role text;
begin
  -- If status didn't change, allow
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- PostgREST provides JWT claims JSON here (when present)
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  jwt_role := coalesce(claims->>'role', '');

  -- Allow service_role (and optionally supabase_admin if present)
  if jwt_role in ('service_role', 'supabase_admin') then
    return new;
  end if;

  raise exception 'Users cannot change status';
end;
$$;

create trigger trg_profiles_block_status_change
before update of status on public.profiles
for each row
execute function public.profiles_block_status_change();

-- -----------------------------
-- Admin allowlist + RPC
-- -----------------------------
create table public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.admin_allowlist enable row level security;

-- Remove default access; service_role bypasses RLS anyway
revoke all on table public.admin_allowlist from anon, authenticated;

-- is_admin() checks allowlist using the JWT email claim
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
