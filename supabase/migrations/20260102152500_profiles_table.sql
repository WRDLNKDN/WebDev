-- 001_profiles_table.sql
-- Profiles table with moderation/approval fields

create table if not exists public.profiles (
  -- Link to auth.users
  id uuid references auth.users on delete cascade primary key,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Handle/Gamertag
  handle text unique not null,

  -- Approval / moderation workflow
  status text not null default 'pending',

  -- Optional review audit fields
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users,

  -- Geek/Nerd Creds
  geek_creds text[],
  nerd_creds jsonb,

  -- Pronouns
  pronouns text,

  -- Social handles
  socials jsonb not null default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb,

  constraint handle_length check (char_length(handle) >= 3),
  constraint profiles_status_check check (status in ('pending', 'approved', 'rejected', 'disabled'))
);

-- Auto-update updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Helpful indexes
create index if not exists idx_profiles_status on public.profiles (status);
create index if not exists idx_profiles_created_at on public.profiles (created_at);
create index if not exists idx_profiles_handle on public.profiles (handle);