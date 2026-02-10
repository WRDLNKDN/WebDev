-- supabase/migrations/20260121180000_tables.sql
-- All tables, functions, and triggers. Safe for fresh db reset.

-- -----------------------------
-- Drop functions first (no table refs)
-- -----------------------------
drop function if exists public.set_updated_at() cascade;
drop function if exists public.profiles_block_status_change() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_generation_jobs_updated_at() cascade;

-- -----------------------------
-- Drop tables (reverse dependency order)
-- -----------------------------
drop table if exists public.weirdlings cascade;
drop table if exists public.generation_jobs cascade;
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

revoke all on table public.admin_allowlist from anon, authenticated;

-- -----------------------------
-- is_admin() helper
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

  policy_version text,
  resume_url text,

  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb,

  is_admin boolean not null default false
);

comment on column public.profiles.policy_version is
  'Version of Terms and Community Guidelines accepted at registration (e.g. v2026.02)';
comment on column public.profiles.resume_url is
  'Public URL of the user resume (e.g. from storage bucket resumes)';

create unique index idx_profiles_handle_lower_unique
  on public.profiles (lower(handle));
create index idx_profiles_created_at on public.profiles (created_at);
create index idx_profiles_status on public.profiles (status);
create index idx_profiles_handle on public.profiles (handle);
create index idx_profiles_email on public.profiles (email);

-- -----------------------------
-- updated_at trigger (profiles)
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

-- -----------------------------
-- generation_jobs (Weirdling audit + idempotency)
-- -----------------------------
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'failed')),
  idempotency_key text unique,
  raw_response jsonb,
  error_message text,
  prompt_version text not null default 'v1',
  model_version text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index idx_generation_jobs_status on public.generation_jobs(status);
create index idx_generation_jobs_idempotency on public.generation_jobs(idempotency_key)
  where idempotency_key is not null;

comment on table public.generation_jobs is
  'Generation audit trail and idempotency for Weirdling creation.';

-- -----------------------------
-- weirdlings (one active per user)
-- -----------------------------
create table public.weirdlings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  handle text not null,
  role_vibe text not null,
  industry_tags text[] not null default '{}',
  tone numeric not null default 0.5,
  tagline text not null,
  boundaries text not null default '',
  bio text,
  avatar_url text,
  raw_ai_response jsonb,
  prompt_version text not null default 'v1',
  model_version text not null default 'mock',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.weirdlings is
  'One Weirdling persona per user (replace on save); MVP-aligned.';

-- -----------------------------
-- updated_at triggers (generation_jobs, weirdlings)
-- -----------------------------
create or replace function public.set_generation_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_generation_jobs_updated_at();

create trigger trg_weirdlings_updated_at
  before update on public.weirdlings
  for each row execute function public.set_updated_at();
