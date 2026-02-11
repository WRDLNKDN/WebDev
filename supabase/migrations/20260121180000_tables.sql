-- supabase/migrations/20260121180000_tables.sql
-- All tables, functions, and triggers. Safe for fresh db reset.

-- -----------------------------
-- Drop functions first (no table refs)
-- -----------------------------
drop function if exists public.get_feed_page(uuid, timestamptz, uuid, int) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.profiles_block_status_change() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_generation_jobs_updated_at() cascade;

-- -----------------------------
-- Drop tables (reverse dependency order)
-- -----------------------------
drop table if exists public.feed_items cascade;
drop table if exists public.feed_connections cascade;
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

  is_admin boolean not null default false,
  use_weirdling_avatar boolean not null default false
);

comment on column public.profiles.use_weirdling_avatar is
  'When true, show saved Weirdling avatar as profile picture instead of uploaded avatar.';

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

-- -----------------------------
-- Feed: connections (who follows whom) and activity stream
-- -----------------------------
create table public.feed_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, connected_user_id),
  check (user_id != connected_user_id)
);

create index idx_feed_connections_user_id on public.feed_connections(user_id);
create index idx_feed_connections_connected_user_id on public.feed_connections(connected_user_id);

comment on table public.feed_connections is
  'Who follows whom; used to scope feed to self + connected users.';

create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'post',
    'profile_update',
    'external_link',
    'repost',
    'reaction'
  )),
  payload jsonb not null default '{}',
  parent_id uuid references public.feed_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_feed_items_user_id on public.feed_items(user_id);
create index idx_feed_items_created_at on public.feed_items(created_at desc);
create index idx_feed_items_kind on public.feed_items(kind);
create index idx_feed_items_parent_id on public.feed_items(parent_id) where parent_id is not null;

comment on table public.feed_items is
  'Unified activity stream: WRDLNKDN-native posts, profile updates, user-submitted external links (opaque), reposts, reactions.';
comment on column public.feed_items.payload is
  'Opaque per kind. External URLs stored as metadata only; no third-party fetch.';

-- -----------------------------
-- get_feed_page (cursor-based pagination; used by backend API)
-- -----------------------------
create or replace function public.get_feed_page(
  p_viewer_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 21
)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  payload jsonb,
  parent_id uuid,
  created_at timestamptz,
  actor_handle text,
  actor_display_name text,
  actor_avatar text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  actor_ids uuid[];
begin
  select array_agg(fc.connected_user_id)
  into actor_ids
  from public.feed_connections fc
  where fc.user_id = p_viewer_id;

  actor_ids := coalesce(actor_ids, '{}') || p_viewer_id;

  return query
  select
    fi.id,
    fi.user_id,
    fi.kind,
    fi.payload,
    fi.parent_id,
    fi.created_at,
    p.handle::text as actor_handle,
    p.display_name as actor_display_name,
    (case
      when p.use_weirdling_avatar = true and w.avatar_url is not null then w.avatar_url
      else p.avatar
    end)::text as actor_avatar
  from public.feed_items fi
  left join public.profiles p on p.id = fi.user_id
  left join public.weirdlings w on w.user_id = fi.user_id and w.is_active = true
  where fi.user_id = any(actor_ids)
    and (
      p_cursor_created_at is null
      or (fi.created_at, fi.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by fi.created_at desc, fi.id desc
  limit least(p_limit, 51);
end;
$$;

comment on function public.get_feed_page(uuid, timestamptz, uuid, int) is
  'Returns feed items for viewer (self + followees) with cursor; used by GET /api/feeds.';

revoke all on function public.get_feed_page(uuid, timestamptz, uuid, int) from public;
grant execute on function public.get_feed_page(uuid, timestamptz, uuid, int) to authenticated, service_role;

-- -----------------------------
-- Storage: avatars bucket (public so profile images load via URL)
-- -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


