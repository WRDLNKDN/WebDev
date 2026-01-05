-- 001_profiles_table.sql
-- Profiles table with moderation / approval workflow
-- Safe, idempotent, and concurrency-proof

-- -------------------------------------------------------------------
-- 1) Base table
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  -- Link to auth.users
  id uuid references auth.users on delete cascade primary key,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Public handle / gamertag
  handle text not null,

  -- Moderation / approval
  status text not null default 'pending',

  reviewed_at timestamptz,
  reviewed_by uuid references auth.users,

  -- Profile metadata
  geek_creds text[],
  nerd_creds jsonb,
  pronouns text,

  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb
);

-- -------------------------------------------------------------------
-- 2) Constraints (added safely if missing)
-- -------------------------------------------------------------------
do $$
begin
  -- Handle length
  if not exists (
    select 1
    from pg_constraint
    where conname = 'handle_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint handle_length
      check (char_length(handle) >= 3);
  end if;

  -- Status enum
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('pending', 'approved', 'rejected', 'disabled'));
  end if;
end $$;

-- -------------------------------------------------------------------
-- 3) updated_at trigger
-- -------------------------------------------------------------------
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

-- -------------------------------------------------------------------
-- 4) Indexes
-- -------------------------------------------------------------------
create index if not exists idx_profiles_created_at
  on public.profiles (created_at);

create index if not exists idx_profiles_status
  on public.profiles (status);

-- Case-insensitive UNIQUE handle
-- Prevents Nick / nick / NICK collisions even under concurrency
create unique index if not exists idx_profiles_handle_lower_unique
  on public.profiles (lower(handle));