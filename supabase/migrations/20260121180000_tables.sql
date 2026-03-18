-- supabase/migrations/20260121180000_tables.sql
-- All tables, functions, and triggers. Idempotent: does NOT drop tables or data.
-- - Tables: CREATE TABLE IF NOT EXISTS only (never DROP TABLE). No TRUNCATE, no DELETE without WHERE.
-- - Triggers: DROP TRIGGER IF EXISTS before CREATE TRIGGER (removes only the trigger, not the table).
-- - Functions: CREATE OR REPLACE or DROP FUNCTION IF EXISTS for replacement; table data unchanged.

-- Extensions used by schema/indexes and functions
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

-- project-sources: uploaded portfolio artifacts (file-backed project source URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-sources',
  'project-sources',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------
-- Admin allowlist (NO RLS; grants in rls.sql)
-- -----------------------------
create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- -----------------------------
-- Profanity overrides (admin-configurable; RLS in rls.sql)
-- Used with OSS profanity filter to block additional terms in freeform text.
-- -----------------------------
create table if not exists public.profanity_overrides (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_profanity_overrides_word_lower
  on public.profanity_overrides (lower(trim(word)));

comment on table public.profanity_overrides is
  'Admin-managed list of additional terms to block in freeform text (bio, interests Other, industries Other, etc.).';

-- -----------------------------
-- Profanity allowlist (admin-configurable; RLS in rls.sql)
-- Terms allowed even if they match the OSS profanity dictionary (e.g. false positives).
-- -----------------------------
create table if not exists public.profanity_allowlist (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_profanity_allowlist_word_lower
  on public.profanity_allowlist (lower(trim(word)));

comment on table public.profanity_allowlist is
  'Admin-managed list of terms to allow even when matched by OSS profanity filter (allowlist).';

-- -----------------------------
-- is_admin() helper (grants in rls.sql)
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
-- profiles table (RLS and grants in rls.sql)
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null,

  handle text not null,
  display_name text,
  avatar text,
  tagline text,

  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected', 'disabled')),

  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),

  geek_creds text[],
  nerd_creds jsonb,
  pronouns text,
  industry text,
  secondary_industry text,
  niche_field text,
  location text,
  profile_visibility text not null default 'members_only'
    check (profile_visibility in ('members_only', 'connections_only')),
  feed_view_preference text not null default 'anyone'
    check (feed_view_preference in ('anyone', 'connections')),
  marketing_email_enabled boolean not null default false,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_timestamp timestamptz,
  marketing_opt_in_ip text,
  marketing_source text,
  marketing_product_updates boolean not null default false,
  marketing_events boolean not null default false,
  last_active_at timestamptz default now(),

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

-- Ensure profile share columns exist before share/directory function definitions below.
alter table if exists public.profiles
  add column if not exists profile_share_token text,
  add column if not exists profile_share_token_created_at timestamptz;

-- MVP Avatar System: single active avatar source (photo | preset | ai).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_type'
  ) then
    alter table public.profiles
      add column avatar_type text not null default 'photo'
      check (avatar_type in ('photo', 'preset', 'ai'));
  end if;
end $$;
comment on column public.profiles.avatar_type is
  'How the active avatar was set: photo (upload), preset (Weirdling preset), ai (generated Weirdling).';

comment on column public.profiles.use_weirdling_avatar is
  'When true, show saved Weirdling avatar as profile picture instead of uploaded avatar.';

comment on column public.profiles.policy_version is
  'Version of Terms and Community Guidelines accepted at registration (e.g. v2026.02)';
comment on column public.profiles.resume_url is
  'Public URL of the user resume (e.g. from storage bucket resumes)';
comment on column public.profiles.feed_view_preference is
  'Feed visibility: anyone = all approved members; connections = self + followees only.';
comment on column public.profiles.marketing_email_enabled is
  'Primary marketing email consent; must be explicit opt-in.';
comment on column public.profiles.marketing_opt_in is
  'Legacy mirror for email marketing consent (kept for compatibility).';
comment on column public.profiles.marketing_opt_in_timestamp is
  'When user opted in (audit trail).';
comment on column public.profiles.marketing_opt_in_ip is
  'IP at opt-in (audit; optional).';
comment on column public.profiles.marketing_source is
  'Where user opted in (e.g. signup, settings).';
comment on column public.profiles.marketing_product_updates is
  'Receive product/feature updates.';
comment on column public.profiles.marketing_events is
  'Receive event/community notifications.';

create unique index if not exists idx_profiles_handle_lower_unique
  on public.profiles (lower(handle));
create index if not exists idx_profiles_created_at on public.profiles (created_at);
create index if not exists idx_profiles_status on public.profiles (status);
create index if not exists idx_profiles_handle on public.profiles (handle);
create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_industry on public.profiles(industry) where industry is not null;
create index if not exists idx_profiles_location on public.profiles(location) where location is not null;
create index if not exists idx_profiles_last_active_at on public.profiles(last_active_at desc nulls last);
create unique index if not exists idx_profiles_profile_share_token
  on public.profiles(profile_share_token)
  where profile_share_token is not null;
create index if not exists idx_profiles_display_name_trgm
  on public.profiles using gin (lower(display_name) extensions.gin_trgm_ops)
  where display_name is not null;
create index if not exists idx_profiles_handle_trgm
  on public.profiles using gin (lower(handle) extensions.gin_trgm_ops)
  where handle is not null;
create index if not exists idx_profiles_tagline_trgm
  on public.profiles using gin (lower(tagline) extensions.gin_trgm_ops)
  where tagline is not null;
create index if not exists idx_profiles_industry_trgm
  on public.profiles using gin (lower(industry) extensions.gin_trgm_ops)
  where industry is not null;
create index if not exists idx_profiles_location_trgm
  on public.profiles using gin (lower(location) extensions.gin_trgm_ops)
  where location is not null;
create index if not exists idx_profiles_bio_trgm
  on public.profiles using gin (lower(coalesce(nerd_creds->>'bio', '')) extensions.gin_trgm_ops);

-- -----------------------------
-- updated_at trigger (profiles)
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
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

-- -----------------------------
-- feature_flags: admin-toggled site features (RLS in rls.sql)
-- -----------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_feature_flags_updated_at on public.feature_flags;
create trigger trg_feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

comment on table public.feature_flags is
  'Site feature toggles. Admin can enable/disable in Admin panel. App reads for nav and routing.';

-- Seed known feature keys (idempotent: only if missing)
insert into public.feature_flags (key, enabled)
values
  ('feed', true),
  ('dashboard', true),
  ('events', true),
  ('store', true),
  ('directory', true),
  ('groups', true),
  ('chat', true),
  ('advertise', true),
  ('games', true),
  ('community_partners', true),
  ('saved', true),
  ('help', true),
  ('settings_privacy_marketing_consent', true),
  ('directory_connections_csv_export', true)
on conflict (key) do nothing;

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

drop trigger if exists trg_profiles_block_status_change on public.profiles;
create trigger trg_profiles_block_status_change
before update of status on public.profiles
for each row
execute function public.profiles_block_status_change();

-- -----------------------------
-- Profile share (obfuscated public link)
-- -----------------------------
-- Owner-only: return profile by handle only when requester is the owner. Used for /profile/:handle.
create or replace function public.get_own_profile_by_handle(p_handle text)
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select p.*
  from public.profiles p
  where lower(p.handle) = lower(nullif(trim(p_handle), ''))
    and p.id = auth.uid();
$$;

-- Return current user's share token; create one if missing.
create or replace function public.get_or_create_profile_share_token()
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_uid uuid;
  v_token text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select profile_share_token into v_token
  from public.profiles
  where id = v_uid;
  if v_token is not null then
    return v_token;
  end if;
  -- base64url: PostgreSQL encode() only supports base64; convert to URL-safe form
  v_token := replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
  update public.profiles
  set profile_share_token = v_token,
      profile_share_token_created_at = now()
  where id = v_uid;
  return v_token;
end;
$$;

-- Regenerate share token; previous token is invalidated immediately.
create or replace function public.regenerate_profile_share_token()
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_uid uuid;
  v_token text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  -- base64url: PostgreSQL encode() only supports base64; convert to URL-safe form
  v_token := replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
  update public.profiles
  set profile_share_token = v_token,
      profile_share_token_created_at = now()
  where id = v_uid;
  return v_token;
end;
$$;

revoke all on function public.get_own_profile_by_handle(text) from public;
grant execute on function public.get_own_profile_by_handle(text) to authenticated;
revoke all on function public.get_or_create_profile_share_token() from public;
grant execute on function public.get_or_create_profile_share_token() to authenticated;
revoke all on function public.regenerate_profile_share_token() from public;
grant execute on function public.regenerate_profile_share_token() to authenticated;

-- -----------------------------
-- portfolio_items (dashboard projects)
-- -----------------------------
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  project_url text,
  image_url text,
  tech_stack text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_items_owner_id on public.portfolio_items(owner_id);
alter table if exists public.portfolio_items
  add column if not exists sort_order integer not null default 0;
create index if not exists idx_portfolio_items_owner_sort on public.portfolio_items(owner_id, sort_order);

-- URL classification and thumbnail (Step 1 + Step 6). Additive only: ADD COLUMN IF NOT EXISTS.
-- Existing rows keep all current data; new columns are null. No DROP, DELETE, or TRUNCATE.
alter table public.portfolio_items
  add column if not exists is_highlighted boolean not null default false,
  add column if not exists normalized_url text,
  add column if not exists embed_url text,
  add column if not exists resolved_type text,
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_status text check (thumbnail_status is null or thumbnail_status in ('pending', 'generated', 'failed'));

comment on table public.portfolio_items is
  'User portfolio projects (dashboard).';
comment on column public.portfolio_items.sort_order is
  'Explicit order for display; lower first. Used for drag-and-drop reorder.';
comment on column public.portfolio_items.is_highlighted is
  'When true, item appears in the Portfolio Showcase highlights carousel.';
comment on column public.portfolio_items.normalized_url is
  'Canonical URL after provider normalization (e.g. Google /preview).';
comment on column public.portfolio_items.embed_url is
  'URL used for iframe embed when different from project_url.';
comment on column public.portfolio_items.resolved_type is
  'Detected link type: image, pdf, document, presentation, spreadsheet, text, google_doc, google_sheet, google_slides.';
comment on column public.portfolio_items.thumbnail_url is
  'Server-generated thumbnail URL in platform storage; null when manual image or pending/failed.';
comment on column public.portfolio_items.thumbnail_status is
  'pending = generation queued; generated = thumbnail_url set; failed = fallback only. Thumbnail failure does not block saving.';

drop trigger if exists trg_portfolio_items_updated_at on public.portfolio_items;
create trigger trg_portfolio_items_updated_at
before update on public.portfolio_items
for each row
execute function public.set_updated_at();

alter table public.portfolio_items
  drop constraint if exists portfolio_items_single_category_check;
alter table public.portfolio_items
  add constraint portfolio_items_single_category_check
  check (cardinality(coalesce(tech_stack, '{}'::text[])) <= 1)
  not valid;

-- Public share: needs portfolio_items (defined above).
create or replace function public.get_public_profile_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile_id uuid;
  v_row jsonb;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;
  select id into v_profile_id
  from public.profiles
  where profile_share_token = p_token
    and status = 'approved';
  if v_profile_id is null then
    return null;
  end if;
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'tagline', p.tagline,
      'avatar', p.avatar,
      'handle', p.handle,
      'nerd_creds', p.nerd_creds,
      'socials', p.socials,
      'resume_url', p.resume_url,
      'industry', p.industry,
      'secondary_industry', p.secondary_industry,
      'niche_field', p.niche_field,
      'location', p.location,
      'pronouns', p.pronouns
    ),
    'portfolio', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'title', pi.title,
          'description', pi.description,
          'project_url', pi.project_url,
          'image_url', pi.image_url,
          'tech_stack', pi.tech_stack,
          'sort_order', pi.sort_order,
          'normalized_url', pi.normalized_url,
          'embed_url', pi.embed_url,
          'resolved_type', pi.resolved_type,
          'thumbnail_url', pi.thumbnail_url,
          'thumbnail_status', pi.thumbnail_status
        ) order by pi.sort_order asc, pi.created_at asc
      ), '[]'::jsonb)
      from public.portfolio_items pi
      where pi.owner_id = v_profile_id
    )
  ) into v_row
  from public.profiles p
  where p.id = v_profile_id;
  return v_row;
end;
$$;

revoke all on function public.get_public_profile_by_share_token(text) from public;
grant execute on function public.get_public_profile_by_share_token(text) to anon, authenticated;

-- -----------------------------
-- generation_jobs (Weirdling audit + idempotency)
-- -----------------------------
create table if not exists public.generation_jobs (
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

create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index if not exists idx_generation_jobs_status on public.generation_jobs(status);
create index if not exists idx_generation_jobs_idempotency on public.generation_jobs(idempotency_key)
  where idempotency_key is not null;

comment on table public.generation_jobs is
  'Generation audit trail and idempotency for Weirdling creation.';

-- -----------------------------
-- weirdlings (one active per user)
-- -----------------------------
create table if not exists public.weirdlings (
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
  updated_at timestamptz not null default now()
);

comment on table public.weirdlings is
  'Weirdling personas; a user may have multiple.';

-- -----------------------------
-- updated_at triggers (generation_jobs, weirdlings)
-- -----------------------------
create or replace function public.set_generation_jobs_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_generation_jobs_updated_at on public.generation_jobs;
create trigger trg_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_generation_jobs_updated_at();

drop trigger if exists trg_weirdlings_updated_at on public.weirdlings;
create trigger trg_weirdlings_updated_at
  before update on public.weirdlings
  for each row execute function public.set_updated_at();

create index if not exists idx_weirdlings_user_id_active
  on public.weirdlings(user_id)
  where is_active = true;

update public.profiles p
set
  avatar_type = 'ai',
  avatar = coalesce(
    nullif(trim(p.avatar), ''),
    (select w.avatar_url from public.weirdlings w where w.user_id = p.id and w.is_active = true limit 1)
  )
where p.use_weirdling_avatar = true;

-- -----------------------------
-- Feed: connections (who follows whom) and activity stream
-- -----------------------------
create table if not exists public.feed_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, connected_user_id),
  check (user_id != connected_user_id)
);

create index if not exists idx_feed_connections_user_id on public.feed_connections(user_id);
create index if not exists idx_feed_connections_connected_user_id on public.feed_connections(connected_user_id);
create index if not exists idx_feed_connections_connected_user_user
  on public.feed_connections(connected_user_id, user_id);

comment on table public.feed_connections is
  'Who follows whom; used to scope feed to self + connected users.';

-- -----------------------------
-- connection_requests (Directory: Connect flow -> accept/decline -> mutual feed_connections)
-- -----------------------------
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id != recipient_id)
);

create index if not exists idx_connection_requests_requester on public.connection_requests(requester_id);
create index if not exists idx_connection_requests_recipient on public.connection_requests(recipient_id);
create index if not exists idx_connection_requests_status on public.connection_requests(status) where status = 'pending';
create index if not exists idx_connection_requests_pending_requester_recipient
  on public.connection_requests(requester_id, recipient_id)
  where status = 'pending';
create index if not exists idx_connection_requests_pending_recipient_requester
  on public.connection_requests(recipient_id, requester_id)
  where status = 'pending';

comment on table public.connection_requests is
  'Connection requests: pending until accepted (creates mutual feed_connections) or declined.';

drop trigger if exists trg_connection_requests_updated_at on public.connection_requests;
create trigger trg_connection_requests_updated_at
  before update on public.connection_requests
  for each row execute function public.set_updated_at();

-- -----------------------------
-- feed_advertisers: Ads shown every 6th post in Feed. Admin-managed.
-- -----------------------------
create table if not exists public.feed_advertisers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  title text not null,
  description text not null,
  url text not null,
  logo_url text,
  image_url text,
  links jsonb default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_advertisers_active_order
  on public.feed_advertisers(active, sort_order)
  where active = true;

drop trigger if exists trg_feed_advertisers_updated_at on public.feed_advertisers;
create trigger trg_feed_advertisers_updated_at
  before update on public.feed_advertisers
  for each row execute function public.set_updated_at();

comment on column public.feed_advertisers.image_url is
  'Public URL of ad banner image (1200x400 recommended). Stored in feed-ad-images bucket.';
comment on table public.feed_advertisers is
  'Advertisers displayed in Feed every 6th post. Admin CRUD.';

-- Seed baseline ad slot (idempotent: only if empty)
insert into public.feed_advertisers (
  company_name, title, description, url, logo_url, links, active, sort_order
)
select
  'WRDLNKDN',
  'Sponsor spotlight',
  'Reserved ad placement for approved sponsors.',
  'https://wrdlnkdn.com',
  null,
  '[
    {"label":"Learn more","url":"https://wrdlnkdn.com"},
    {"label":"Contact","url":"https://wrdlnkdn.com/about"}
  ]'::jsonb,
  true,
  0
where not exists (select 1 from public.feed_advertisers limit 1);

-- -----------------------------
-- feed_ad_events: analytics sink for feed ad impressions/clicks
-- -----------------------------
create table if not exists public.feed_ad_events (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.feed_advertisers(id) on delete cascade,
  member_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in ('feed_ad_impression', 'feed_ad_click')),
  slot_index int,
  target text,
  url text,
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_ad_events_advertiser_created
  on public.feed_ad_events(advertiser_id, created_at desc);
create index if not exists idx_feed_ad_events_name_created
  on public.feed_ad_events(event_name, created_at desc);

comment on table public.feed_ad_events is
  'Feed ad analytics events for admin reporting.';

-- -----------------------------
-- community_partners: public partner listings (decoupled from ad inventory)
-- -----------------------------
create table if not exists public.community_partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  title text,
  description text,
  url text not null,
  logo_url text,
  image_url text,
  links jsonb default '[]'::jsonb,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_partners_active_order
  on public.community_partners(active, featured desc, sort_order)
  where active = true;

drop trigger if exists trg_community_partners_updated_at on public.community_partners;
create trigger trg_community_partners_updated_at
  before update on public.community_partners
  for each row execute function public.set_updated_at();

comment on table public.community_partners is
  'Public Community Partners directory, managed separately from feed ads.';

-- Seed Nettica partner (idempotent: only if empty)
insert into public.community_partners (
  company_name, title, description, url, logo_url, image_url, active, featured, sort_order
)
select
  'Nettica',
  'Secure networking partner',
  'Nettica helps teams run secure private networking with simple WireGuard management.',
  'https://nettica.com/',
  null,
  null,
  true,
  true,
  0
where not exists (select 1 from public.community_partners limit 1);

-- -----------------------------
-- Feed items
-- -----------------------------
create table if not exists public.feed_items (
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
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  scheduled_at timestamptz
);

create index if not exists idx_feed_items_user_id on public.feed_items(user_id);
create index if not exists idx_feed_items_created_at on public.feed_items(created_at desc);
create index if not exists idx_feed_items_kind on public.feed_items(kind);
create index if not exists idx_feed_items_parent_id on public.feed_items(parent_id) where parent_id is not null;

create unique index if not exists idx_feed_items_reaction_user_post
  on public.feed_items (parent_id, user_id)
  where kind = 'reaction'
    and payload->>'type' in ('like', 'love', 'inspiration', 'care');

-- get_feed_page / get_saved_feed_page: root rows, cursor order matches index
create index if not exists idx_feed_items_root_timeline
  on public.feed_items (
    (coalesce(scheduled_at, created_at)) desc,
    id desc
  )
  where parent_id is null;

-- Connections-mode feed: filter fi.user_id = any(connection set) + same ordering
create index if not exists idx_feed_items_user_root_timeline
  on public.feed_items (
    user_id,
    (coalesce(scheduled_at, created_at)) desc,
    id desc
  )
  where parent_id is null;

-- Viewer reaction subquery (laughing/rage etc.): parent_id + user_id + kind
create index if not exists idx_feed_items_reaction_parent_user_kind
  on public.feed_items(parent_id, user_id)
  where kind = 'reaction' and parent_id is not null;

comment on table public.feed_items is
  'Unified activity stream: WRDLNKDN-native posts, profile updates, user-submitted external links (opaque), reposts, reactions.';
comment on column public.feed_items.payload is
  'Opaque per kind. External URLs stored as metadata only; no third-party fetch.';
comment on column public.feed_items.scheduled_at is
  'When set, post is hidden until this time. Null = publish immediately.';
comment on column public.feed_items.edited_at is
  'Timestamp of latest edit for posts/comments. Null when never edited.';

-- Update profiles.last_active_at on post, comment, or reaction (Directory sort)
create or replace function public.feed_items_update_last_active()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.kind = 'post' then
    update public.profiles set last_active_at = now() where id = new.user_id;
  elsif new.kind = 'reaction' and new.user_id is not null then
    update public.profiles set last_active_at = now() where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feed_items_update_last_active on public.feed_items;
create trigger trg_feed_items_update_last_active
after insert on public.feed_items
for each row
execute function public.feed_items_update_last_active();

comment on function public.feed_items_update_last_active() is
  'Updates profiles.last_active_at when user posts or reacts (Directory sort).';

-- saved_feed_items (bookmarks for Feed / Saved page)
create table if not exists public.saved_feed_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feed_item_id)
);
create index if not exists idx_saved_feed_items_user_created
  on public.saved_feed_items(user_id, created_at desc);

create index if not exists idx_saved_feed_items_feed_item_id
  on public.saved_feed_items(feed_item_id);

comment on table public.saved_feed_items is
  'Member bookmarks for feed items; powers Saved page and Save action on Feed.';

-- -----------------------------
-- get_feed_page (cursor-based pagination; feed_view: anyone | connections; reaction counts; scheduled posts)
-- -----------------------------

-- Required: drop before recreate if return type changed (prevents 42P13)
drop function if exists public.get_feed_page(uuid, timestamptz, uuid, integer, text) cascade;
drop function if exists public.get_feed_page(uuid, timestamptz, uuid, integer) cascade;

create or replace function public.get_feed_page(
  p_viewer_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 21,
  p_feed_view text default 'anyone'
)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  payload jsonb,
  parent_id uuid,
  created_at timestamptz,
  edited_at timestamptz,
  scheduled_at timestamptz,
  actor_handle text,
  actor_display_name text,
  actor_avatar text,
  like_count bigint,
  love_count bigint,
  inspiration_count bigint,
  care_count bigint,
  laughing_count bigint,
  rage_count bigint,
  viewer_reaction text,
  comment_count bigint,
  viewer_saved boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  actor_ids uuid[];
  use_connections boolean;
begin
  use_connections := coalesce(nullif(trim(lower(p_feed_view)), ''), 'anyone') = 'connections';

  if use_connections then
    select array_agg(fc.connected_user_id)
    into actor_ids
    from public.feed_connections fc
    where fc.user_id = p_viewer_id;
    actor_ids := coalesce(actor_ids, '{}') || p_viewer_id;
  else
    actor_ids := null;
  end if;

  return query
  select
    fi.id,
    fi.user_id,
    fi.kind,
    fi.payload,
    fi.parent_id,
    fi.created_at,
    fi.edited_at,
    fi.scheduled_at,
    p.handle::text as actor_handle,
    p.display_name as actor_display_name,
    (case
      when p.use_weirdling_avatar = true and w.avatar_url is not null then w.avatar_url
      else p.avatar
    end)::text as actor_avatar,
    coalesce(stats.like_cnt, 0::bigint),
    coalesce(stats.love_cnt, 0::bigint),
    coalesce(stats.inspiration_cnt, 0::bigint),
    coalesce(stats.care_cnt, 0::bigint),
    coalesce(stats.laughing_cnt, 0::bigint),
    coalesce(stats.rage_cnt, 0::bigint),
    stats.viewer_reaction,
    coalesce(stats.comment_cnt, 0::bigint),
    exists (
      select 1 from public.saved_feed_items s
      where s.feed_item_id = fi.id and s.user_id = p_viewer_id
    ) as viewer_saved
  from public.feed_items fi
  left join public.profiles p on p.id = fi.user_id
  left join public.weirdlings w on w.user_id = fi.user_id and w.is_active = true
  left join lateral (
    select
      count(*) filter (where r.payload->>'type' = 'like') as like_cnt,
      count(*) filter (where r.payload->>'type' = 'love') as love_cnt,
      count(*) filter (where r.payload->>'type' = 'inspiration') as inspiration_cnt,
      count(*) filter (where r.payload->>'type' = 'care') as care_cnt,
      count(*) filter (where r.payload->>'type' = 'laughing') as laughing_cnt,
      count(*) filter (where r.payload->>'type' = 'rage') as rage_cnt,
      count(*) filter (where r.payload->>'type' = 'comment') as comment_cnt,
      (
        select r2.payload->>'type'
        from public.feed_items r2
        where r2.parent_id = fi.id and r2.kind = 'reaction'
          and r2.payload->>'type' in ('like','love','inspiration','care','laughing','rage')
          and r2.user_id = p_viewer_id
        limit 1
      ) as viewer_reaction
    from public.feed_items r
    where r.parent_id = fi.id and r.kind = 'reaction'
  ) stats on true
  where
    p.status = 'approved'
    and fi.parent_id is null
    and (
      use_connections and fi.user_id = any(actor_ids)
      or not use_connections
    )
    and (fi.scheduled_at is null or fi.scheduled_at <= now())
    and (
      p_cursor_created_at is null
      or (
        coalesce(fi.scheduled_at, fi.created_at),
        fi.id
      ) < (p_cursor_created_at, p_cursor_id)
    )
  order by coalesce(fi.scheduled_at, fi.created_at) desc, fi.id desc
  limit least(p_limit, 51);
end;
$$;

comment on function public.get_feed_page(uuid, timestamptz, uuid, int, text) is
  'Returns root feed items (post/repost/external_link only; excludes reactions/comments). Reaction counts, scheduled filtering.';

-- get_saved_feed_page (Saved page: same row shape as get_feed_page, viewer_saved true)
drop function if exists public.get_saved_feed_page(uuid, timestamptz, uuid, int) cascade;
create or replace function public.get_saved_feed_page(
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
  edited_at timestamptz,
  scheduled_at timestamptz,
  actor_handle text,
  actor_display_name text,
  actor_avatar text,
  like_count bigint,
  love_count bigint,
  inspiration_count bigint,
  care_count bigint,
  laughing_count bigint,
  rage_count bigint,
  viewer_reaction text,
  comment_count bigint,
  viewer_saved boolean,
  saved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  select
    fi.id,
    fi.user_id,
    fi.kind,
    fi.payload,
    fi.parent_id,
    fi.created_at,
    fi.edited_at,
    fi.scheduled_at,
    p.handle::text as actor_handle,
    p.display_name as actor_display_name,
    (case
      when p.use_weirdling_avatar = true and w.avatar_url is not null then w.avatar_url
      else p.avatar
    end)::text as actor_avatar,
    coalesce(stats.like_cnt, 0::bigint),
    coalesce(stats.love_cnt, 0::bigint),
    coalesce(stats.inspiration_cnt, 0::bigint),
    coalesce(stats.care_cnt, 0::bigint),
    coalesce(stats.laughing_cnt, 0::bigint),
    coalesce(stats.rage_cnt, 0::bigint),
    stats.viewer_reaction,
    coalesce(stats.comment_cnt, 0::bigint),
    true::boolean as viewer_saved,
    s.created_at as saved_at
  from public.saved_feed_items s
  join public.feed_items fi on fi.id = s.feed_item_id
  left join public.profiles p on p.id = fi.user_id
  left join public.weirdlings w on w.user_id = fi.user_id and w.is_active = true
  left join lateral (
    select
      count(*) filter (where r.payload->>'type' = 'like') as like_cnt,
      count(*) filter (where r.payload->>'type' = 'love') as love_cnt,
      count(*) filter (where r.payload->>'type' = 'inspiration') as inspiration_cnt,
      count(*) filter (where r.payload->>'type' = 'care') as care_cnt,
      count(*) filter (where r.payload->>'type' = 'laughing') as laughing_cnt,
      count(*) filter (where r.payload->>'type' = 'rage') as rage_cnt,
      count(*) filter (where r.payload->>'type' = 'comment') as comment_cnt,
      (
        select r2.payload->>'type'
        from public.feed_items r2
        where r2.parent_id = fi.id and r2.kind = 'reaction'
          and r2.payload->>'type' in ('like','love','inspiration','care','laughing','rage')
          and r2.user_id = p_viewer_id
        limit 1
      ) as viewer_reaction
    from public.feed_items r
    where r.parent_id = fi.id and r.kind = 'reaction'
  ) stats on true
  where
    s.user_id = p_viewer_id
    and p.status = 'approved'
    and fi.parent_id is null
    and (fi.scheduled_at is null or fi.scheduled_at <= now())
    and (
      p_cursor_created_at is null
      or (s.created_at, s.feed_item_id) < (p_cursor_created_at, p_cursor_id)
    )
  order by s.created_at desc, s.feed_item_id desc
  limit least(p_limit, 51);
end;
$$;
comment on function public.get_saved_feed_page(uuid, timestamptz, uuid, int) is
  'Returns saved feed items for the viewer (Saved page), same shape as get_feed_page.';

-- -----------------------------
-- get_directory_page (Directory: paginated, searchable, filterable, connection-aware)
-- Ensure profiles columns exist so the function body can reference them (idempotent).
-- -----------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'secondary_industry') then
    alter table public.profiles add column secondary_industry text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'niche_field') then
    alter table public.profiles add column niche_field text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'industries') then
    alter table public.profiles add column industries jsonb not null default '[]'::jsonb;
  end if;
end $$;

-- Backfill industries from industry + secondary_industry (one group per profile)
update public.profiles
set industries = jsonb_build_array(
  jsonb_build_object(
    'industry', nullif(trim(industry), ''),
    'sub_industries', case
      when secondary_industry is not null and trim(secondary_industry) <> '' then jsonb_build_array(trim(secondary_industry))
      else '[]'::jsonb
    end
  )
)
where (industry is not null and trim(industry) <> '')
  and (industries is null or industries = '[]'::jsonb);

-- Drop all overloads so only one signature exists (avoids "function name is not unique").
drop function if exists public.get_directory_page(uuid, text, text, text, text[], text, text, int, int);
drop function if exists public.get_directory_page(uuid, text, text, text, text, text[], text, text, int, int);
drop function if exists public.get_directory_page(uuid, text, text, text, text, text[], text, text[], text, int, int);

create or replace function public.get_directory_page(
  p_viewer_id uuid,
  p_search text default null,
  p_primary_industry text default null,
  p_secondary_industry text default null,
  p_location text default null,
  p_skills text[] default null,
  p_interests text[] default null,
  p_connection_status text default null,
  p_sort text default 'recently_active',
  p_offset int default 0,
  p_limit int default 25
)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar text,
  tagline text,
  pronouns text,
  industry text,
  secondary_industry text,
  location text,
  skills text[],
  bio_snippet text,
  connection_state text,
  use_weirdling_avatar boolean,
  profile_share_token text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with params as (
    select
      p_viewer_id as viewer_id,
      nullif(lower(trim(p_search)), '') as search_q,
      nullif(trim(p_primary_industry), '') as primary_industry_q,
      nullif(trim(p_secondary_industry), '') as secondary_industry_q,
      nullif(lower(trim(p_location)), '') as location_q,
      coalesce(
        (select array_agg(lower(trim(s))) from unnest(coalesce(p_skills, '{}')) s where trim(s) <> ''),
        '{}'
      ) as skills_q,
      coalesce(
        (select array_agg(lower(trim(i))) from unnest(coalesce(p_interests, '{}')) i where trim(i) <> ''),
        '{}'
      ) as interests_q
  ),
  viewer_outgoing as (
    select fc.connected_user_id as profile_id
    from public.feed_connections fc
    join params pr on true
    where fc.user_id = pr.viewer_id
  ),
  viewer_incoming as (
    select fc.user_id as profile_id
    from public.feed_connections fc
    join params pr on true
    where fc.connected_user_id = pr.viewer_id
  ),
  any_connection as (
    select profile_id from viewer_outgoing
    union
    select profile_id from viewer_incoming
  ),
  mutual_connection as (
    select vo.profile_id
    from viewer_outgoing vo
    join viewer_incoming vi on vi.profile_id = vo.profile_id
  ),
  pending_out as (
    select cr.recipient_id as profile_id
    from public.connection_requests cr
    join params pr on true
    where cr.requester_id = pr.viewer_id
      and cr.status = 'pending'
  ),
  pending_in as (
    select cr.requester_id as profile_id
    from public.connection_requests cr
    join params pr on true
    where cr.recipient_id = pr.viewer_id
      and cr.status = 'pending'
  ),
  visible as (
    select
      p.id,
      p.handle,
      p.display_name,
      p.avatar,
      p.tagline,
      p.pronouns,
      p.industry,
      p.secondary_industry,
      p.location,
      p.nerd_creds,
      p.created_at,
      p.last_active_at,
      p.use_weirdling_avatar,
      p.profile_share_token,
      w.avatar_url as weirdling_avatar
    from public.profiles p
    join params pr on true
    left join public.weirdlings w on w.user_id = p.id and w.is_active = true
    where p.status = 'approved'
      and p.id != pr.viewer_id
      and (
        p.profile_visibility = 'members_only'
        or exists (select 1 from any_connection ac where ac.profile_id = p.id)
      )
      and (
        pr.search_q is null
        or lower(coalesce(p.display_name, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.handle, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.tagline, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.industry, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.secondary_industry, '')) like '%' || pr.search_q || '%'
        or exists (
          select 1
          from jsonb_array_elements(coalesce(p.industries, '[]'::jsonb)) g
          where lower(coalesce(g->>'industry', '')) like '%' || pr.search_q || '%'
             or exists (
               select 1
               from jsonb_array_elements_text(coalesce(g->'sub_industries', '[]'::jsonb)) sub
               where lower(sub) like '%' || pr.search_q || '%'
             )
        )
        or lower(coalesce(p.niche_field, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.location, '')) like '%' || pr.search_q || '%'
        or lower(coalesce(p.nerd_creds->>'bio', '')) like '%' || pr.search_q || '%'
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where lower(s) like '%' || pr.search_q || '%'
        )
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'interests', '[]'::jsonb)) i
          where lower(i) like '%' || pr.search_q || '%'
        )
      )
      and (
        (pr.primary_industry_q is null or p.industry = pr.primary_industry_q or p.secondary_industry = pr.primary_industry_q
          or (p.industries is not null and jsonb_array_length(p.industries) > 0 and exists (
            select 1 from jsonb_array_elements(p.industries) g where (g->>'industry') = pr.primary_industry_q
          )))
        and (pr.secondary_industry_q is null or p.industry = pr.secondary_industry_q or p.secondary_industry = pr.secondary_industry_q
          or (p.industries is not null and jsonb_array_length(p.industries) > 0 and exists (
            select 1
            from jsonb_array_elements(p.industries) g
            where (g->>'industry') = pr.secondary_industry_q
               or exists (
                 select 1
                 from jsonb_array_elements_text(coalesce(g->'sub_industries', '[]'::jsonb)) sub
                 where sub = pr.secondary_industry_q
               )
          )))
      )
      and (pr.location_q is null or lower(coalesce(p.location, '')) like '%' || pr.location_q || '%')
      and (
        array_length(pr.skills_q, 1) is null
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where lower(s) = any(pr.skills_q)
        )
      )
      and (
        array_length(pr.interests_q, 1) is null
        or array_length(pr.interests_q, 1) = 0
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'interests', '[]'::jsonb)) i
          where lower(trim(i)) = any(pr.interests_q)
        )
      )
  ),
  conn_state as (
    select
      v.id,
      case
        when exists (select 1 from mutual_connection mc where mc.profile_id = v.id) then 'connected'
        when exists (select 1 from pending_out po where po.profile_id = v.id) then 'pending'
        when exists (select 1 from pending_in pi where pi.profile_id = v.id) then 'pending_received'
        else 'not_connected'
      end as state
    from visible v
  )
  select
    v.id,
    v.handle,
    v.display_name,
    coalesce(
      case when v.use_weirdling_avatar then v.weirdling_avatar else null end,
      v.avatar
    )::text as avatar,
    v.tagline,
    v.pronouns,
    v.industry,
    v.secondary_industry,
    v.location,
    (
      select coalesce(array_agg(t.val), '{}')
      from (
        select s::text as val
        from jsonb_array_elements_text(coalesce(v.nerd_creds->'skills', '[]'::jsonb)) s
        limit 3
      ) t
    ) as skills,
    left(coalesce(v.nerd_creds->>'bio', ''), 120) as bio_snippet,
    cs.state as connection_state,
    coalesce(v.use_weirdling_avatar, false) as use_weirdling_avatar,
    v.profile_share_token
  from visible v
  join conn_state cs on cs.id = v.id
  where (p_connection_status is null or cs.state = p_connection_status)
  order by
    case p_sort
      when 'alphabetical' then 1
      else 2
    end,
    case p_sort
      when 'alphabetical' then coalesce(v.display_name, v.handle)
      else null
    end asc nulls last,
    case p_sort
      when 'alphabetical' then v.id
      else null
    end asc,
    case p_sort
      when 'newest' then v.created_at
      when 'recently_active' then coalesce(v.last_active_at, v.created_at)
      else null
    end desc nulls last,
    v.id desc
  offset greatest(0, p_offset)
  limit least(p_limit, 51);
$$;

comment on function public.get_directory_page is
  'Directory listing: searchable, filterable, connection-aware, privacy-respecting. Returns profile_share_token for /p/:token links.';

-- -----------------------------
-- Chat: rooms, members, messages, reactions, attachments, blocks, reports
-- -----------------------------
create table if not exists public.chat_moderators (
  email text primary key,
  created_at timestamptz not null default now()
);

revoke all on table public.chat_moderators from anon, authenticated;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('dm', 'group')),
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  original_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_rooms_name_required_for_group check (
    (room_type = 'dm' and name is null) or (room_type = 'group' and name is not null)
  )
);

create index if not exists idx_chat_rooms_original_admin_id on public.chat_rooms(original_admin_id);

create index if not exists idx_chat_rooms_created_by on public.chat_rooms(created_by);
create index if not exists idx_chat_rooms_room_type on public.chat_rooms(room_type);

comment on table public.chat_rooms is 'Chat rooms: 1:1 (dm) or invite-only group (max 100 members).';

create table if not exists public.chat_room_preferences (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_chat_room_preferences_user_id
  on public.chat_room_preferences(user_id);

create index if not exists idx_chat_room_preferences_user_favorite
  on public.chat_room_preferences(user_id, is_favorite)
  where is_favorite = true;

comment on table public.chat_room_preferences is
  'User-specific chat room preferences, such as favorites.';

drop trigger if exists trg_chat_room_preferences_updated_at
  on public.chat_room_preferences;
create trigger trg_chat_room_preferences_updated_at
before update on public.chat_room_preferences
for each row
execute function public.set_updated_at();

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);

create index if not exists idx_chat_room_members_user_id on public.chat_room_members(user_id);
create index if not exists idx_chat_room_members_room_id on public.chat_room_members(room_id);

create index if not exists idx_chat_room_members_room_active
  on public.chat_room_members(room_id)
  where left_at is null;

comment on table public.chat_room_members is 'Membership: admin (creator for groups), member. left_at set when user leaves.';

create table if not exists public.chat_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id != blocked_user_id)
);

create index if not exists idx_chat_blocks_blocker_id on public.chat_blocks(blocker_id);
create index if not exists idx_chat_blocks_blocked_user_id on public.chat_blocks(blocked_user_id);

comment on table public.chat_blocks is 'User blocks: disables chat contact both directions.';

create table if not exists public.chat_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suspended_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_suspensions_user_id on public.chat_suspensions(user_id);

comment on table public.chat_suspensions is 'Chat-only suspension by moderator. Platform suspension via profiles.status.';

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text,
  is_system_message boolean not null default false,
  is_deleted boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_room_created on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);

comment on table public.chat_messages is 'Chat messages. is_deleted=true shows placeholder. sender_id null when anonymized.';

create table if not exists public.chat_message_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_chat_message_reactions_message_id on public.chat_message_reactions(message_id);

create table if not exists public.chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  )),
  file_size bigint not null check (file_size > 0 and file_size <= 2097152),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_message_attachments_message_id on public.chat_message_attachments(message_id);

comment on table public.chat_message_attachments is 'Attachments: max 2MB per file, 1 per message (MVP); allowlist enforced in app and DB.';

-- Enforce 2MB cap on existing deployments (idempotent)
alter table public.chat_message_attachments drop constraint if exists chat_message_attachments_file_size_check;
alter table public.chat_message_attachments add constraint chat_message_attachments_file_size_check check (file_size > 0 and file_size <= 2097152);

create table if not exists public.chat_read_receipts (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists idx_chat_read_receipts_user_id on public.chat_read_receipts(user_id);

comment on table public.chat_read_receipts is 'Read receipts (1:1 rooms only per spec).';

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_message_id uuid references public.chat_messages(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in (
    'harassment', 'spam', 'inappropriate_content', 'other'
  )),
  free_text text,
  status text not null default 'open' check (status in (
    'open', 'under_review', 'resolved'
  )),
  created_at timestamptz not null default now(),
  constraint chat_reports_message_or_user check (
    reported_message_id is not null or reported_user_id is not null
  )
);

create index if not exists idx_chat_reports_reporter_id on public.chat_reports(reporter_id);
create index if not exists idx_chat_reports_status on public.chat_reports(status);

comment on table public.chat_reports is 'Reports: message or user; moderator workflow.';

-- are_chat_connections: mutual feed_connections required for 1:1 chat
create or replace function public.are_chat_connections(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.feed_connections fc1
    join public.feed_connections fc2
      on fc1.user_id = a and fc1.connected_user_id = b
      and fc2.user_id = b and fc2.connected_user_id = a
  );
$$;

revoke all on function public.are_chat_connections(uuid, uuid) from public;
grant execute on function public.are_chat_connections(uuid, uuid) to authenticated, service_role;

-- chat_blocked: true if either user has blocked the other
create or replace function public.chat_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.chat_blocks cb
    where (cb.blocker_id = a and cb.blocked_user_id = b)
       or (cb.blocker_id = b and cb.blocked_user_id = a)
  );
$$;

revoke all on function public.chat_blocked(uuid, uuid) from public;
grant execute on function public.chat_blocked(uuid, uuid) to authenticated, service_role;

create or replace function public.chat_create_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_room_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_other_user_id is null or p_other_user_id = v_uid then
    raise exception 'Invalid other user for DM';
  end if;
  if not public.are_chat_connections(v_uid, p_other_user_id) then
    raise exception 'You can only start 1:1 chats with Connections.';
  end if;
  if public.chat_blocked(v_uid, p_other_user_id) then
    raise exception 'You cannot message this member.';
  end if;

  select r.id
    into v_room_id
  from public.chat_rooms r
  join public.chat_room_members mine
    on mine.room_id = r.id
   and mine.user_id = v_uid
  join public.chat_room_members other_member
    on other_member.room_id = r.id
   and other_member.user_id = p_other_user_id
  where r.room_type = 'dm'
  order by coalesce(
             (
               select max(m.created_at)
               from public.chat_messages m
               where m.room_id = r.id
             ),
             r.updated_at,
             r.created_at
           ) desc,
           r.created_at asc,
           r.id asc
  limit 1;

  if v_room_id is not null then
    insert into public.chat_room_members (room_id, user_id, role, left_at)
    values
      (v_room_id, v_uid, 'admin', null),
      (v_room_id, p_other_user_id, 'member', null)
    on conflict (room_id, user_id)
    do update
      set role = excluded.role,
          left_at = null;

    return v_room_id;
  end if;

  insert into public.chat_rooms (room_type, name, created_by)
  values ('dm', null, v_uid)
  returning id into v_room_id;

  if v_room_id is null then
    raise exception 'Could not create room';
  end if;

  insert into public.chat_room_members (room_id, user_id, role)
  values (v_room_id, v_uid, 'admin'), (v_room_id, p_other_user_id, 'member');

  return v_room_id;
end;
$$;

revoke all on function public.chat_create_dm(uuid) from public;
grant execute on function public.chat_create_dm(uuid) to authenticated;

-- chat_can_message_in_room: for DM requires mutual connection + no block; for group requires membership
create or replace function public.chat_can_message_in_room(p_room_id uuid, p_sender_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  r_type text;
  other_id uuid;
begin
  select room_type into r_type from public.chat_rooms where id = p_room_id;
  if r_type = 'dm' then
    select user_id into other_id
    from public.chat_room_members
    where room_id = p_room_id and left_at is null and user_id != p_sender_id
    limit 1;
    if other_id is null then return false; end if;
    if not public.are_chat_connections(p_sender_id, other_id) then return false; end if;
    if public.chat_blocked(p_sender_id, other_id) then return false; end if;
  end if;
  return exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id and user_id = p_sender_id and left_at is null
  );
end;
$$;

revoke all on function public.chat_can_message_in_room(uuid, uuid) from public;
grant execute on function public.chat_can_message_in_room(uuid, uuid) to authenticated, service_role;

-- is_chat_moderator: Chat Moderator role (can moderate chat; Platform Admin from admin_allowlist does both)
create or replace function public.is_chat_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.chat_moderators
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) or public.is_admin();
$$;

revoke all on function public.is_chat_moderator() from public;
grant execute on function public.is_chat_moderator() to authenticated;

-- chat_is_room_member / chat_is_room_admin: Avoid RLS recursion on chat_room_members
create or replace function public.chat_is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id and user_id = auth.uid() and left_at is null
  );
$$;

create or replace function public.chat_is_room_admin(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id and user_id = auth.uid()
      and role = 'admin' and left_at is null
  );
$$;

revoke all on function public.chat_is_room_member(uuid) from public;
revoke all on function public.chat_is_room_admin(uuid) from public;
grant execute on function public.chat_is_room_member(uuid) to authenticated;
grant execute on function public.chat_is_room_admin(uuid) to authenticated;

-- chat_create_group: Create group room + members in one transaction (bypasses RLS for reliable creation)
create or replace function public.chat_create_group(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_room_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(array_length(p_member_ids, 1), 0) > 99 then
    raise exception 'Max 99 members';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Group name is required';
  end if;

  insert into public.chat_rooms (room_type, name, created_by)
  values ('group', trim(p_name), v_uid)
  returning id into v_room_id;

  if v_room_id is null then
    raise exception 'Could not create room';
  end if;

  insert into public.chat_room_members (room_id, user_id, role)
  values (v_room_id, v_uid, 'admin');

  if coalesce(array_length(p_member_ids, 1), 0) > 0 then
    insert into public.chat_room_members (room_id, user_id, role)
    select v_room_id, unnest(coalesce(p_member_ids, '{}')), 'member';
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.chat_create_group(text, uuid[]) from public;
grant execute on function public.chat_create_group(text, uuid[]) to authenticated;

-- Set original_admin_id on group create
create or replace function public.chat_set_original_admin()
returns trigger
language plpgsql
as $$
begin
  if new.room_type = 'group' then
    new.original_admin_id := new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_set_original_admin on public.chat_rooms;
create trigger trg_chat_set_original_admin
before insert on public.chat_rooms
for each row
execute function public.chat_set_original_admin();

-- Enable Realtime for chat_messages (presence, typing, live updates). Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- updated_at for chat_rooms
drop trigger if exists trg_chat_rooms_updated_at on public.chat_rooms;
create trigger trg_chat_rooms_updated_at
before update on public.chat_rooms
for each row
execute function public.set_updated_at();

-- System message when admin removes member (not self-leave)
create or replace function public.chat_on_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if old.left_at is null and new.left_at is not null and auth.uid() != new.user_id then
    insert into public.chat_messages (room_id, sender_id, content, is_system_message)
    values (new.room_id, null, 'User was removed from the group', true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_on_member_removed on public.chat_room_members;
create trigger trg_chat_on_member_removed
after update of left_at on public.chat_room_members
for each row
execute function public.chat_on_member_removed();

-- On suspend: transfer admin to oldest, emit system messages
create or replace function public.chat_on_suspension()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
  new_admin uuid;
begin
  for r in
    select cr.id as room_id, cr.original_admin_id
    from public.chat_room_members crm
    join public.chat_rooms cr on cr.id = crm.room_id
    where crm.user_id = new.user_id and crm.left_at is null and cr.room_type = 'group'
  loop
    insert into public.chat_messages (room_id, sender_id, content, is_system_message)
    values (r.room_id, null, 'User is no longer available', true);
    if exists (select 1 from public.chat_room_members where room_id = r.room_id and user_id = new.user_id and role = 'admin') then
      select user_id into new_admin from public.chat_room_members
      where room_id = r.room_id and user_id != new.user_id and left_at is null
      order by joined_at asc limit 1;
      if new_admin is not null then
        update public.chat_room_members set role = 'member' where room_id = r.room_id and user_id = new.user_id;
        update public.chat_room_members set role = 'admin' where room_id = r.room_id and user_id = new_admin;
        insert into public.chat_messages (room_id, sender_id, content, is_system_message)
        values (r.room_id, null, 'Admin has been temporarily transferred', true);
      end if;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_chat_on_suspension on public.chat_suspensions;
create trigger trg_chat_on_suspension
after insert on public.chat_suspensions
for each row
execute function public.chat_on_suspension();

-- On unsuspend: revert admin to original
create or replace function public.chat_on_unsuspend()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
begin
  for r in select id, original_admin_id from public.chat_rooms where original_admin_id = old.user_id and room_type = 'group'
  loop
    if r.original_admin_id is not null and exists (select 1 from public.chat_room_members where room_id = r.id and user_id = r.original_admin_id and left_at is null) then
      update public.chat_room_members set role = 'member' where room_id = r.id and role = 'admin';
      update public.chat_room_members set role = 'admin' where room_id = r.id and user_id = r.original_admin_id;
      insert into public.chat_messages (room_id, sender_id, content, is_system_message)
      values (r.id, null, 'Admin has been restored', true);
    end if;
  end loop;
  return old;
end;
$$;

drop trigger if exists trg_chat_on_unsuspend on public.chat_suspensions;
create trigger trg_chat_on_unsuspend
after delete on public.chat_suspensions
for each row
execute function public.chat_on_unsuspend();

-- -----------------------------
-- Chat: rate limit (30 messages/minute per user)
-- -----------------------------
create or replace function public.chat_rate_limit_check()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  msg_count int;
begin
  if new.sender_id is null or new.is_system_message then
    return new;
  end if;
  select count(*)::int into msg_count
  from public.chat_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute'
    and is_system_message = false
    and sender_id is not null;
  if msg_count >= 30 then
    raise exception 'Rate limit exceeded: 30 messages per minute';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_rate_limit on public.chat_messages;
create trigger trg_chat_messages_rate_limit
before insert on public.chat_messages
for each row
execute function public.chat_rate_limit_check();

-- -----------------------------
-- Chat: audit log (90-day retention per spec)
-- -----------------------------
create table if not exists public.chat_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in (
    'message_sent', 'message_edited', 'message_deleted',
    'room_created', 'member_invited', 'member_removed', 'member_left',
    'report_created', 'report_resolved', 'user_suspended', 'user_blocked'
  )),
  actor_id uuid references auth.users(id) on delete set null,
  target_type text check (target_type in ('room', 'message', 'user', 'report', null)),
  target_id uuid,
  room_id uuid references public.chat_rooms(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_audit_log_created_at on public.chat_audit_log(created_at);
create index if not exists idx_chat_audit_log_actor_id on public.chat_audit_log(actor_id);
create index if not exists idx_chat_audit_log_room_id on public.chat_audit_log(room_id);

comment on table public.chat_audit_log is '90-day retention. Prune via cron or scheduled job.';

create or replace function public.chat_audit_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' and not new.is_system_message then
    insert into public.chat_audit_log (action, actor_id, target_type, target_id, room_id)
    values ('message_sent', new.sender_id, 'message', new.id, new.room_id);
  elsif tg_op = 'UPDATE' and old.is_deleted = false and new.is_deleted = true then
    insert into public.chat_audit_log (action, actor_id, target_type, target_id, room_id)
    values ('message_deleted', auth.uid(), 'message', new.id, new.room_id);
  elsif tg_op = 'UPDATE' and (old.content is distinct from new.content or old.edited_at is distinct from new.edited_at) then
    insert into public.chat_audit_log (action, actor_id, target_type, target_id, room_id)
    values ('message_edited', auth.uid(), 'message', new.id, new.room_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_audit_on_message on public.chat_messages;
create trigger trg_chat_audit_on_message
after insert or update on public.chat_messages
for each row
execute function public.chat_audit_on_message();

-- -----------------------------
-- Storage: avatars bucket (profile photos; max 512x512, <=1MB; Vercel CDN)
-- -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- weirdling-previews: AI preview images, 1hr TTL (cron cleanup)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'weirdling-previews',
  'weirdling-previews',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- weirdling-avatars: permanent AI Weirdling images (max 512x512, <=1MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'weirdling-avatars',
  'weirdling-avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- project-images (portfolio project screenshots)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- portfolio-thumbnails (server-generated portfolio card thumbnails). Additive: new bucket only.
-- ON CONFLICT DO UPDATE updates bucket metadata if it exists; no table data or existing objects touched.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-thumbnails',
  'portfolio-thumbnails',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- resumes (user resume PDF or Word)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  true,
  5242880,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- feed-ad-images (ad/partner images; 50MB limit; null = no MIME restriction)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-ad-images',
  'feed-ad-images',
  true,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = null;

-- feed-post-images (user post attachments)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-post-images',
  'feed-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- chat-attachments (2MB MVP cap, allowlist: jpg, png, webp, gif, pdf, doc, docx, txt)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  2097152,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- advertiser-inquiry-assets (PNG/SVG icons from public Advertise form; private, backend-only)
-- Idempotent: on conflict updates existing bucket so migration can be reapplied safely.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advertiser-inquiry-assets',
  'advertiser-inquiry-assets',
  false,
  5242880,
  array['image/png', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------
-- Content: submissions, playlists, audit_log (community video workflow)
-- -----------------------------
create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('youtube', 'upload')),
  youtube_url text,
  storage_path text,
  tags text[] default '{}',
  notes_for_moderators text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'published')),
  moderation_notes text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_submissions_youtube_url_required
    check (type != 'youtube' or youtube_url is not null and trim(youtube_url) != ''),
  constraint content_submissions_storage_path_when_upload
    check (type != 'upload' or storage_path is not null and trim(storage_path) != '')
);

create index if not exists idx_content_submissions_submitted_by on public.content_submissions(submitted_by);
create index if not exists idx_content_submissions_status on public.content_submissions(status);
create index if not exists idx_content_submissions_created_at on public.content_submissions(created_at desc);

comment on table public.content_submissions is
  'Community video submissions: YouTube links or uploaded files. Status: pending → approved/rejected/changes_requested → published.';

drop trigger if exists trg_content_submissions_updated_at on public.content_submissions;
create trigger trg_content_submissions_updated_at
before update on public.content_submissions
for each row
execute function public.set_updated_at();

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  thumbnail_url text,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playlists_slug on public.playlists(slug);
create index if not exists idx_playlists_is_public on public.playlists(is_public) where is_public = true;

comment on table public.playlists is
  'Curated playlists for WRDLNKDN YouTube channel. Admin-only management.';

insert into public.playlists (slug, title, description, is_public)
values (
  'wrdlnkdn-weekly',
  'WRDLNKDN Weekly',
  'Curated community picks.',
  true
)
on conflict (slug) do nothing;

drop trigger if exists trg_playlists_updated_at on public.playlists;
create trigger trg_playlists_updated_at
before update on public.playlists
for each row
execute function public.set_updated_at();

create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  submission_id uuid not null references public.content_submissions(id) on delete cascade,
  sort_order int not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_playlist_items_playlist_id on public.playlist_items(playlist_id);
create unique index if not exists idx_playlist_items_playlist_submission
  on public.playlist_items(playlist_id, submission_id);

comment on table public.playlist_items is
  'Published items within a playlist. Links to content_submissions.';

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_actor_id on public.audit_log(actor_id);
create index if not exists idx_audit_log_target on public.audit_log(target_type, target_id);
create index if not exists idx_audit_log_target_action_created_at
  on public.audit_log(target_type, action, created_at desc);

comment on table public.audit_log is
  'Audit trail for privileged operations: content approval, rejection, publishing, etc.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-submissions',
  'content-submissions',
  false,
  536870912,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------
-- Chat room summaries (last message, unread count for room list)
-- -----------------------------
create or replace function public.chat_room_summaries(p_room_ids uuid[], p_user_id uuid)
returns table (
  room_id uuid,
  last_content text,
  last_created_at timestamptz,
  last_is_deleted boolean,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with last_msgs as (
    select distinct on (room_id)
      room_id, content, created_at, is_deleted
    from public.chat_messages
    where room_id = any(p_room_ids)
    order by room_id, created_at desc
  ),
  unread as (
    select
      cm.room_id,
      count(*)::bigint as cnt
    from public.chat_messages cm
    left join public.chat_read_receipts crr
      on cm.id = crr.message_id and crr.user_id = p_user_id
    where cm.room_id = any(p_room_ids)
      and cm.sender_id is not null
      and cm.sender_id != p_user_id
      and crr.message_id is null
      and cm.is_deleted = false
    group by cm.room_id
  )
  select
    lm.room_id,
    lm.content as last_content,
    lm.created_at as last_created_at,
    lm.is_deleted as last_is_deleted,
    coalesce(u.cnt, 0) as unread_count
  from last_msgs lm
  left join unread u on u.room_id = lm.room_id;
$$;

revoke all on function public.chat_room_summaries(uuid[], uuid) from public;
grant execute on function public.chat_room_summaries(uuid[], uuid) to authenticated, service_role;

comment on function public.chat_room_summaries is 'Per-room last message and unread count for room list UI.';

-- -----------------------------
-- chat_audit_log 90-day prune (invoked by Edge Function or cron)
-- -----------------------------
create or replace function public.chat_prune_audit_log()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.chat_audit_log
    where created_at < now() - interval '90 days'
    returning 1
  )
  select count(*)::integer into deleted_count from deleted;
  return deleted_count;
end;
$$;

revoke all on function public.chat_prune_audit_log() from public;
grant execute on function public.chat_prune_audit_log() to service_role;

comment on function public.chat_prune_audit_log is 'Prune chat_audit_log older than 90 days. Call from Edge Function or pg_cron.';

-- -----------------------------
-- resume backfill lock event prune (invoked by Edge Function or cron)
-- -----------------------------
create or replace function public.audit_prune_resume_backfill_lock_events()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.audit_log
    where target_type = 'resume_thumbnail_backfill_lock'
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer into deleted_count from deleted;
  return deleted_count;
end;
$$;

revoke all on function public.audit_prune_resume_backfill_lock_events() from public;
grant execute on function public.audit_prune_resume_backfill_lock_events() to service_role;

comment on function public.audit_prune_resume_backfill_lock_events is
  'Prune resume backfill lock events older than 30 days. Call from Edge Function or pg_cron.';

-- -----------------------------
-- Notifications (in-app activity signals)
-- -----------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in (
    'reaction',
    'comment',
    'mention',
    'chat_message',
    'connection_request',
    'event_rsvp'
  )),
  reference_id uuid,
  reference_type text,
  payload jsonb default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, read_at)
  where read_at is null;

comment on table public.notifications is
  'In-app activity signals: reactions, comments, mentions, chat, connections.';

create or replace function public.notifications_on_feed_reaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_parent_user_id uuid;
  v_parent_id uuid;
  v_reaction_type text;
  v_is_comment boolean;
begin
  if new.kind != 'reaction' or new.parent_id is null then
    return new;
  end if;

  v_reaction_type := new.payload->>'type';
  v_is_comment := v_reaction_type = 'comment';

  if not v_is_comment and v_reaction_type not in ('like', 'love', 'inspiration', 'care', 'laughing', 'rage') then
    return new;
  end if;

  select fi.user_id, fi.id into v_parent_user_id, v_parent_id
  from public.feed_items fi
  where fi.id = new.parent_id;

  if v_parent_user_id is null or v_parent_user_id = new.user_id then
    return new;
  end if;

  -- Respect blocking rules
  if exists (
    select 1 from public.chat_blocks cb
    where (cb.blocker_id = v_parent_user_id and cb.blocked_user_id = new.user_id)
       or (cb.blocker_id = new.user_id and cb.blocked_user_id = v_parent_user_id)
  ) then
    return new;
  end if;

  -- No duplicate: one per (recipient, actor, type, reference)
  if exists (
    select 1 from public.notifications n
    where n.recipient_id = v_parent_user_id
      and n.actor_id = new.user_id
      and n.type = case when v_is_comment then 'comment' else 'reaction' end
      and n.reference_id = v_parent_id
      and n.created_at > now() - interval '1 minute'
  ) then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
  values (
    v_parent_user_id,
    new.user_id,
    case when v_is_comment then 'comment' else 'reaction' end,
    v_parent_id,
    'feed_item',
    jsonb_build_object(
      'parent_id', new.parent_id,
      'reaction_type', v_reaction_type,
      'reaction_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notifications_on_feed_reaction on public.feed_items;
create trigger trg_notifications_on_feed_reaction
  after insert on public.feed_items
  for each row
  execute function public.notifications_on_feed_reaction();

-- -----------------------------
-- notifications_on_connection_request: notify recipient of pending request
-- -----------------------------
create or replace function public.notifications_on_connection_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.status != 'pending' then
    return new;
  end if;
  if new.requester_id = new.recipient_id then
    return new;
  end if;

  if exists (select 1 from public.chat_suspensions where user_id = new.requester_id) then
    return new;
  end if;
  if exists (
    select 1 from public.profiles
    where id = new.requester_id and status = 'disabled'
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.chat_blocks cb
    where (cb.blocker_id = new.recipient_id and cb.blocked_user_id = new.requester_id)
       or (cb.blocker_id = new.requester_id and cb.blocked_user_id = new.recipient_id)
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.recipient_id = new.recipient_id
      and n.actor_id = new.requester_id
      and n.type = 'connection_request'
      and n.reference_id = new.id
  ) then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
  values (
    new.recipient_id,
    new.requester_id,
    'connection_request',
    new.id,
    'connection_request',
    jsonb_build_object('request_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists trg_notifications_on_connection_request on public.connection_requests;
create trigger trg_notifications_on_connection_request
  after insert on public.connection_requests
  for each row
  execute function public.notifications_on_connection_request();

-- -----------------------------
-- notifications_on_chat_message: notify other room members (not sender)
-- -----------------------------
create or replace function public.notifications_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
begin
  if new.sender_id is null or new.is_system_message or new.is_deleted then
    return new;
  end if;

  for r in
    select crm.user_id
    from public.chat_room_members crm
    where crm.room_id = new.room_id
      and crm.left_at is null
      and crm.user_id != new.sender_id
      and crm.user_id is not null
  loop
    if exists (
      select 1 from public.chat_blocks cb
      where (cb.blocker_id = r.user_id and cb.blocked_user_id = new.sender_id)
         or (cb.blocker_id = new.sender_id and cb.blocked_user_id = r.user_id)
    ) then
      continue;
    end if;

    insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
    values (
      r.user_id,
      new.sender_id,
      'chat_message',
      new.id,
      'chat_message',
      jsonb_build_object('room_id', new.room_id, 'message_id', new.id)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notifications_on_chat_message on public.chat_messages;
create trigger trg_notifications_on_chat_message
  after insert on public.chat_messages
  for each row
  execute function public.notifications_on_chat_message();

-- -----------------------------
-- notifications_on_event_rsvp: notify event host when someone RSVPs
-- -----------------------------
create or replace function public.notifications_on_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_host_id uuid;
begin
  select host_id into v_host_id from public.events where id = new.event_id;
  if v_host_id is null or v_host_id = new.user_id then
    return new;
  end if;

  if exists (
    select 1 from public.chat_blocks cb
    where (cb.blocker_id = v_host_id and cb.blocked_user_id = new.user_id)
       or (cb.blocker_id = new.user_id and cb.blocked_user_id = v_host_id)
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.recipient_id = v_host_id
      and n.actor_id = new.user_id
      and n.type = 'event_rsvp'
      and n.reference_id = new.event_id
      and n.created_at > now() - interval '1 minute'
  ) then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
  values (
    v_host_id,
    new.user_id,
    'event_rsvp',
    new.event_id,
    'event',
    jsonb_build_object('event_id', new.event_id, 'status', new.status)
  );

  return new;
end;
$$;

-- -----------------------------
-- notifications_on_mention: parse @handle in post/comment body
-- -----------------------------
create or replace function public.notifications_on_mention()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_body text;
  v_ref_id uuid;
  v_matched text;
  v_mentioned_id uuid;
begin
  if new.kind = 'post' then
    v_body := new.payload->>'body';
    v_ref_id := new.id;
  elsif new.kind = 'reaction' and (new.payload->>'type') = 'comment' then
    v_body := new.payload->>'body';
    v_ref_id := coalesce(new.parent_id, new.id);
  else
    return new;
  end if;

  if v_body is null or trim(v_body) = '' then
    return new;
  end if;

  for v_matched in
    select distinct lower(match[1])
    from regexp_matches(v_body, '@([a-zA-Z0-9_]+)', 'g') as match
  loop
    select id into v_mentioned_id
    from public.profiles
    where lower(handle) = v_matched
      and id != new.user_id
      and status = 'approved'
    limit 1;

    if v_mentioned_id is not null then
      if exists (
        select 1 from public.chat_blocks cb
        where (cb.blocker_id = v_mentioned_id and cb.blocked_user_id = new.user_id)
           or (cb.blocker_id = new.user_id and cb.blocked_user_id = v_mentioned_id)
      ) then
        continue;
      end if;

      if exists (
        select 1 from public.notifications n
        where n.recipient_id = v_mentioned_id
          and n.actor_id = new.user_id
          and n.type = 'mention'
          and n.reference_id = v_ref_id
          and n.created_at > now() - interval '1 minute'
      ) then
        continue;
      end if;

      insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
      values (
        v_mentioned_id,
        new.user_id,
        'mention',
        v_ref_id,
        'feed_item',
        jsonb_build_object('handle', v_matched)
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notifications_on_mention on public.feed_items;
create trigger trg_notifications_on_mention
  after insert on public.feed_items
  for each row
  execute function public.notifications_on_mention();

-- -----------------------------
-- Events (community gatherings)
-- -----------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  location_type text check (location_type in ('virtual', 'physical')),
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_start_at on public.events(start_at);
create index if not exists idx_events_host_id on public.events(host_id);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

comment on table public.events is 'Community gatherings: AMAs, meetups, virtual sessions.';

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'yes' check (status in ('yes', 'no', 'maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_rsvps_event_id on public.event_rsvps(event_id);
create index if not exists idx_event_rsvps_user_id on public.event_rsvps(user_id);

drop trigger if exists trg_event_rsvps_updated_at on public.event_rsvps;
create trigger trg_event_rsvps_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();

create or replace function public.event_rsvps_block_suspended()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if exists (select 1 from public.chat_suspensions where user_id = new.user_id) then
    raise exception 'Suspended users cannot RSVP';
  end if;
  if exists (
    select 1 from public.profiles where id = new.user_id and status = 'disabled'
  ) then
    raise exception 'Account disabled';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_rsvps_block_suspended on public.event_rsvps;
create trigger trg_event_rsvps_block_suspended
  before insert on public.event_rsvps
  for each row execute function public.event_rsvps_block_suspended();

drop trigger if exists trg_notifications_on_event_rsvp on public.event_rsvps;
create trigger trg_notifications_on_event_rsvp
  after insert on public.event_rsvps
  for each row
  execute function public.notifications_on_event_rsvp();

comment on table public.event_rsvps is 'RSVP state: yes, no, maybe.';

-- Enable Realtime for notifications (unread badge updates). Idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- -----------------------------
-- Game Session Framework (shared infrastructure for Phuzzle, Hangman, Tic-Tac-Toe, etc.)
-- -----------------------------
create table if not exists public.game_definitions (
  id uuid primary key default gen_random_uuid(),
  game_type text not null unique,
  name text not null,
  min_players int not null default 1,
  max_players int not null default 1,
  is_solo_capable boolean not null default true,
  is_multiplayer_capable boolean not null default false,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  capabilities jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.game_definitions is
  'Registry of game types: player counts, solo/multiplayer, capabilities.';

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_definition_id uuid not null references public.game_definitions(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'pending_invitation', 'active', 'waiting_players',
    'waiting_your_move', 'waiting_opponent_move', 'completed', 'declined', 'canceled', 'expired'
  )),
  state_payload jsonb default '{}',
  result text check (result is null or result in ('winner', 'loser', 'draw', 'solved', 'failed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_sessions_created_by on public.game_sessions(created_by);
create index if not exists idx_game_sessions_status on public.game_sessions(status);
create index if not exists idx_game_sessions_game_definition on public.game_sessions(game_definition_id);
create index if not exists idx_game_sessions_updated_at on public.game_sessions(updated_at desc);

comment on table public.game_sessions is
  'One record per active or completed match; state_payload holds game-specific state.';

drop trigger if exists trg_game_sessions_updated_at on public.game_sessions;
create trigger trg_game_sessions_updated_at
  before update on public.game_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.game_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('creator', 'invitee', 'player')),
  acceptance_state text not null default 'pending' check (acceptance_state in ('pending', 'accepted', 'declined')),
  turn_order_position int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists idx_game_session_participants_session on public.game_session_participants(session_id);
create index if not exists idx_game_session_participants_user on public.game_session_participants(user_id);

comment on table public.game_session_participants is
  'Players in a session; turn_order_position for turn-based games.';

drop trigger if exists trg_game_session_participants_updated_at on public.game_session_participants;
create trigger trg_game_session_participants_updated_at
  before update on public.game_session_participants
  for each row execute function public.set_updated_at();

create table if not exists public.game_invitations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, recipient_id),
  check (sender_id != recipient_id)
);

create index if not exists idx_game_invitations_recipient on public.game_invitations(recipient_id);
create index if not exists idx_game_invitations_sender on public.game_invitations(sender_id);
create index if not exists idx_game_invitations_session on public.game_invitations(session_id);
create index if not exists idx_game_invitations_pending on public.game_invitations(recipient_id, status)
  where status = 'pending';

comment on table public.game_invitations is
  'Invites for multiplayer games; recipient can accept or decline, sender can cancel.';

drop trigger if exists trg_game_invitations_updated_at on public.game_invitations;
create trigger trg_game_invitations_updated_at
  before update on public.game_invitations
  for each row execute function public.set_updated_at();

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('move', 'turn_advance', 'completion', 'system')),
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_game_events_session on public.game_events(session_id);
create index if not exists idx_game_events_created_at on public.game_events(session_id, created_at desc);

comment on table public.game_events is
  'Optional audit trail: moves, turn advances, completion, system events.';

-- Extend notifications to support game-related types (idempotent: drop existing type check, add new)
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'notifications' and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%type%'
  limit 1;
  if conname is not null then
    execute format('alter table public.notifications drop constraint if exists %I', conname);
  end if;
end $$;
alter table public.notifications add constraint notifications_type_check check (type in (
  'reaction', 'comment', 'mention', 'chat_message', 'connection_request', 'event_rsvp',
  'game_invite', 'game_invite_accepted', 'game_invite_declined', 'game_invite_canceled',
  'game_your_turn', 'game_completed'
));

-- Seed default game definitions (idempotent)
insert into public.game_definitions (game_type, name, min_players, max_players, is_solo_capable, is_multiplayer_capable)
values
  ('phuzzle', 'Phuzzle', 1, 1, true, false),
  ('hangman', 'Hangman', 1, 2, true, true),
  ('tic_tac_toe', 'Tic-Tac-Toe', 2, 2, false, true),
  ('connect_four', 'Connect 4', 2, 2, false, true),
  ('snake', 'Snake', 1, 1, true, false),
  ('slots', 'Slots', 1, 1, true, false),
  ('checkers', 'Checkers', 2, 2, false, true),
  ('trivia', 'Trivia', 1, 10, true, true),
  ('2048', '2048', 1, 1, true, false),
  ('two_truths_lie', 'Two Truths and a Lie', 2, 10, false, true),
  ('would_you_rather', 'Would You Rather', 2, 10, false, true),
  ('darts', 'Darts', 1, 10, true, true),
  ('caption_game', 'Caption Game', 2, 10, false, true),
  ('word_search', 'Word Search', 1, 1, true, false),
  ('battleship', 'Battleship', 2, 2, false, true),
  ('reversi', 'Reversi', 2, 2, false, true),
  ('breakout', 'Breakout', 1, 1, true, false),
  ('scrabble', 'Scrabble', 2, 4, false, true),
  ('tetris', 'Tetris', 1, 1, true, false),
  ('maze_chase', 'Maze Chase', 1, 1, true, false),
  ('chess', 'Chess', 2, 2, false, true),
  ('blackjack', 'Blackjack', 1, 1, true, false),
  ('daily_word', 'Daily Word', 1, 1, true, false)
on conflict (game_type) do nothing;

-- Daily Word (Wordle-style): one puzzle per calendar day for all players; 5-letter word, 6 attempts; hints: correct/present/absent.
create table if not exists public.daily_puzzle_words (
  id serial primary key,
  word text not null unique check (char_length(word) = 5 and word ~ '^[a-zA-Z]+$')
);
create index if not exists idx_daily_puzzle_words_word_lower on public.daily_puzzle_words(lower(word));
comment on table public.daily_puzzle_words is 'Word list for daily word puzzle; one word per day selected by date seed.';

insert into public.daily_puzzle_words (word) values
  ('about'),('above'),('abuse'),('actor'),('acute'),('admit'),('adopt'),('adult'),('after'),('again'),
  ('agent'),('agree'),('ahead'),('alarm'),('album'),('alert'),('alien'),('align'),('alike'),('alive'),
  ('allow'),('alone'),('along'),('alter'),('among'),('angel'),('anger'),('angle'),('angry'),('apart'),
  ('apple'),('apply'),('arena'),('argue'),('arise'),('array'),('aside'),('asset'),('avoid'),('await'),
  ('bacon'),('badly'),('baker'),('bases'),('basic'),('basis'),('batch'),('beach'),('began'),('begin'),
  ('being'),('below'),('bench'),('billy'),('birth'),('black'),('blade'),('blame'),('blank'),('blast'),
  ('blend'),('bless'),('blind'),('block'),('blood'),('board'),('boost'),('booth'),('bound'),('brain'),
  ('brand'),('brass'),('brave'),('bread'),('break'),('breed'),('brick'),('brief'),('bring'),('broad'),
  ('broke'),('build'),('built'),('burst'),('buyer'),('cabin'),('cable'),('calif'),('carry'),('catch'),
  ('cause'),('chain'),('chair'),('chart'),('chase'),('cheap'),('check'),('chest'),('chief'),('child'),
  ('china'),('chose'),('civil'),('claim'),('class'),('clean'),('clear'),('click'),('climb'),('clock'),
  ('close'),('cloth'),('cloud'),('coach'),('coast'),('count'),('court'),('cover'),('crack'),('craft'),
  ('crash'),('crazy'),('cream'),('crime'),('cross'),('crowd'),('crown'),('curve'),('cycle'),('daily'),
  ('dance'),('dated'),('dealt'),('death'),('delay'),('delta'),('dense'),('depth'),('dirty'),('doubt'),
  ('dozen'),('draft'),('drama'),('drawn'),('dream'),('dress'),('drill'),('drink'),('drive'),('drove'),
  ('eager'),('early'),('earth'),('eight'),('elite'),('empty'),('enemy'),('enjoy'),('enter'),('entry'),
  ('equal'),('error'),('event'),('every'),('exact'),('exist'),('extra'),('faith'),('false'),('fault'),
  ('favor'),('feast'),('field'),('fifth'),('fifty'),('fight'),('final'),('first'),('fixed'),('flash'),
  ('fleet'),('floor'),('fluid'),('focus'),('force'),('forth'),('forty'),('forum'),('found'),('frame'),
  ('frank'),('fresh'),('front'),('fruit'),('fully'),('giant'),('given'),('glass'),('globe'),('grace'),
  ('grade'),('grain'),('grand'),('grant'),('grass'),('great'),('green'),('gross'),('group'),('grown'),
  ('guard'),('guess'),('guest'),('guide'),('habit'),('happy'),('heart'),('heavy'),('hello'),('hence'),
  ('horse'),('hotel'),('house'),('human'),('ideal'),('image'),('index'),('inner'),('input'),('issue'),
  ('joint'),('jones'),('judge'),('juice'),('known'),('label'),('large'),('laser'),('later'),('laugh'),
  ('layer'),('learn'),('least'),('leave'),('legal'),('level'),('light'),('limit'),('local'),('logic'),
  ('loose'),('lower'),('lucky'),('lunch'),('lying'),('magic'),('major'),('maker'),('march'),('match'),
  ('maybe'),('mayor'),('meant'),('media'),('metal'),('meter'),('midst'),('might'),('minor'),('minus'),
  ('mixed'),('model'),('money'),('month'),('moral'),('motor'),('mount'),('mouse'),('mouth'),('movie'),
  ('music'),('nasty'),('never'),('night'),('noble'),('noise'),('north'),('novel'),('nurse'),('occur'),
  ('ocean'),('offer'),('often'),('order'),('other'),('ought'),('ounce'),('outer'),('owner'),('panel'),
  ('paper'),('party'),('peace'),('phase'),('phone'),('photo'),('piece'),('pilot'),('pitch'),('place'),
  ('plain'),('plane'),('plant'),('plate'),('point'),('pound'),('power'),('press'),('price'),('pride'),
  ('prime'),('print'),('prior'),('prize'),('proof'),('proud'),('prove'),('queen'),('quick'),('quiet'),
  ('quite'),('quote'),('radio'),('raise'),('range'),('rapid'),('ratio'),('reach'),('ready'),('refer'),
  ('right'),('rival'),('river'),('round'),('route'),('royal'),('rural'),('scale'),('scene'),('scope'),
  ('score'),('sense'),('serve'),('seven'),('shall'),('shape'),('share'),('sharp'),('sheet'),('shelf'),
  ('shell'),('shift'),('shine'),('shirt'),('shock'),('shoot'),('short'),('shown'),('sight'),('since'),
  ('skill'),('sleep'),('slide'),('small'),('smart'),('smile'),('smith'),('smoke'),('solid'),('solve'),
  ('sorry'),('sound'),('south'),('space'),('spare'),('speak'),('speed'),('spend'),('spite'),('split'),
  ('spoke'),('sport'),('staff'),('stage'),('stake'),('stand'),('start'),('state'),('steam'),('steel'),
  ('stick'),('still'),('stock'),('stone'),('stood'),('store'),('storm'),('story'),('strip'),('stuck'),
  ('study'),('stuff'),('style'),('sugar'),('suite'),('super'),('sweet'),('table'),('taken'),('taste'),
  ('teach'),('teeth'),('thank'),('theme'),('there'),('these'),('thick'),('thing'),('think'),('third'),
  ('those'),('three'),('throw'),('tight'),('times'),('title'),('today'),('total'),('touch'),('tough'),
  ('tower'),('track'),('trade'),('train'),('treat'),('trend'),('trial'),('tribe'),('trick'),('tried'),
  ('truck'),('truly'),('trust'),('truth'),('twice'),('under'),('union'),('unity'),('until'),('upper'),
  ('urban'),('usual'),('valid'),('value'),('video'),('virus'),('visit'),('vital'),('voice'),('waste'),
  ('watch'),('water'),('wheel'),('where'),('which'),('while'),('white'),('whole'),('whose'),('woman'),
  ('world'),('worry'),('worse'),('worst'),('worth'),('would'),('wound'),('write'),('wrong'),('wrote'),
  ('yield'),('young'),('youth')
on conflict (word) do nothing;

create or replace function public.get_daily_puzzle_word(p_date date)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count int;
  v_idx int;
  v_word text;
begin
  select count(*) into v_count from public.daily_puzzle_words;
  if v_count = 0 then return null; end if;
  v_idx := mod(abs(hashtext(to_char(p_date, 'YYYY-MM-DD'))), v_count);
  select word into v_word from public.daily_puzzle_words order by id limit 1 offset v_idx;
  return lower(v_word);
end;
$$;

create or replace function public.submit_daily_word_guess(p_session_id uuid, p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_puzzle_date date;
  v_word text;
  v_guess text;
  v_guesses jsonb;
  v_hints text[];
  v_i int;
  v_c char;
  v_letter_count jsonb;
  v_used jsonb;
  v_win boolean;
  v_game_over boolean;
  v_result text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_guess := lower(trim(p_guess));
  if length(v_guess) <> 5 or v_guess !~ '^[a-z]+$' then
    raise exception 'Guess must be exactly 5 letters';
  end if;
  if not exists (select 1 from public.daily_puzzle_words where lower(word) = v_guess) then
    raise exception 'Invalid word';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'daily_word' then
    raise exception 'Session not found or not Daily Word';
  end if;
  if v_session.status = 'completed' then
    raise exception 'Puzzle already completed';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  v_puzzle_date := (v_state->>'puzzleDate')::date;
  if v_puzzle_date is null then v_puzzle_date := current_date; end if;
  v_word := public.get_daily_puzzle_word(v_puzzle_date);
  if v_word is null then raise exception 'No puzzle word for this date'; end if;

  v_guesses := coalesce(v_state->'guesses', '[]'::jsonb);
  if jsonb_array_length(v_guesses) >= 6 then
    raise exception 'No attempts remaining';
  end if;

  v_hints := array_fill('absent'::text, array[5]);
  for v_i in 1..5 loop
    v_c := substr(v_word, v_i, 1);
    if substr(v_guess, v_i, 1) = v_c then
      v_hints[v_i] := 'correct';
    end if;
  end loop;
  v_letter_count := '{}'::jsonb;
  for v_i in 1..5 loop
    v_c := substr(v_word, v_i, 1);
    if v_hints[v_i] <> 'correct' then
      v_letter_count := jsonb_set(v_letter_count, array[v_c], to_jsonb(coalesce((v_letter_count->>v_c)::int, 0) + 1));
    end if;
  end loop;
  v_used := '{}'::jsonb;
  for v_i in 1..5 loop
    if v_hints[v_i] = 'correct' then continue; end if;
    v_c := substr(v_guess, v_i, 1);
    if (v_letter_count->>v_c)::int > coalesce((v_used->>v_c)::int, 0) then
      v_hints[v_i] := 'present';
      v_used := jsonb_set(v_used, array[v_c], to_jsonb(coalesce((v_used->>v_c)::int, 0) + 1));
    end if;
  end loop;

  v_guesses := v_guesses || jsonb_build_array(
    jsonb_build_object('word', v_guess, 'hints', to_jsonb(v_hints))
  );
  v_win := (v_guess = v_word);
  v_game_over := v_win or jsonb_array_length(v_guesses) >= 6;
  if v_game_over then
    v_result := case when v_win then 'win' else 'loss' end;
    update public.game_sessions
    set state_payload = jsonb_set(jsonb_set(v_state, array['guesses'], v_guesses), array['puzzleDate'], to_jsonb(v_puzzle_date::text)),
        status = 'completed',
        result = v_result,
        updated_at = now()
    where id = p_session_id;
  else
    update public.game_sessions
    set state_payload = jsonb_set(jsonb_set(v_state, array['guesses'], v_guesses), array['puzzleDate'], to_jsonb(v_puzzle_date::text)),
        updated_at = now()
    where id = p_session_id;
  end if;

  return jsonb_build_object(
    'hints', to_jsonb(v_hints),
    'win', v_win,
    'gameOver', v_game_over,
    'attemptsUsed', jsonb_array_length(v_guesses)
  );
end;
$$;

create or replace function public.get_or_create_daily_word_session()
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_def_id uuid;
  v_session_id uuid;
  v_today text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_today := to_char(current_date, 'YYYY-MM-DD');
  select id into v_def_id from public.game_definitions where game_type = 'daily_word';
  if v_def_id is null then raise exception 'Daily Word game not found'; end if;

  select gs.id into v_session_id
  from public.game_sessions gs
  where gs.game_definition_id = v_def_id
    and gs.created_by = v_uid
    and coalesce(gs.state_payload->>'puzzleDate', '') = v_today
  order by gs.created_at desc
  limit 1;
  if v_session_id is not null then return v_session_id; end if;

  insert into public.game_sessions (game_definition_id, created_by, status, state_payload)
  values (v_def_id, v_uid, 'active', jsonb_build_object('puzzleDate', v_today, 'guesses', '[]'::jsonb))
  returning id into v_session_id;
  return v_session_id;
end;
$$;

revoke all on function public.get_daily_puzzle_word(date) from public;
grant execute on function public.get_daily_puzzle_word(date) to authenticated;
revoke all on function public.submit_daily_word_guess(uuid, text) from public;
grant execute on function public.submit_daily_word_guess(uuid, text) to authenticated;
revoke all on function public.get_or_create_daily_word_session() from public;
grant execute on function public.get_or_create_daily_word_session() to authenticated;

-- Trivia: questions with correct answer and optional choices (multiple choice)
create table if not exists public.trivia_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  correct_answer text not null,
  choices jsonb default '[]'::jsonb,
  category text,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);
create index if not exists idx_trivia_questions_category on public.trivia_questions(category);
create index if not exists idx_trivia_questions_difficulty on public.trivia_questions(difficulty);
comment on table public.trivia_questions is 'Question bank for Trivia; choices is optional array of strings for multiple choice.';

insert into public.trivia_questions (question_text, correct_answer, choices, category, difficulty)
select * from (values
  ('What is 2 + 2?', '4', '["3", "4", "5", "6"]'::jsonb, 'math', 'easy'),
  ('Capital of France?', 'Paris', '["London", "Paris", "Berlin", "Madrid"]'::jsonb, 'geography', 'easy'),
  ('Largest planet in our solar system?', 'Jupiter', '["Saturn", "Jupiter", "Neptune", "Mars"]'::jsonb, 'science', 'easy'),
  ('How many continents are there?', '7', '["5", "6", "7", "8"]'::jsonb, 'geography', 'easy'),
  ('What year did World War II end?', '1945', '["1943", "1944", "1945", "1946"]'::jsonb, 'history', 'medium'),
  ('Speed of light in vacuum (approx) in m/s?', '299792458', '[]'::jsonb, 'science', 'hard'),
  ('Who wrote "Romeo and Juliet"?', 'William Shakespeare', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]'::jsonb, 'literature', 'easy'),
  ('Smallest prime number?', '2', '["0", "1", "2", "3"]'::jsonb, 'math', 'easy'),
  ('Chemical symbol for gold?', 'Au', '["Ag", "Au", "Fe", "Cu"]'::jsonb, 'science', 'medium'),
  ('How many sides does a hexagon have?', '6', '["5", "6", "7", "8"]'::jsonb, 'math', 'easy'),
  ('Which planet is known as the Red Planet?', 'Mars', '["Venus", "Mars", "Jupiter", "Saturn"]'::jsonb, 'science', 'easy'),
  ('In what country is the Great Wall located?', 'China', '["Japan", "China", "India", "Mongolia"]'::jsonb, 'geography', 'easy'),
  ('What is the largest ocean on Earth?', 'Pacific', '["Atlantic", "Indian", "Pacific", "Arctic"]'::jsonb, 'geography', 'easy'),
  ('How many strings does a standard guitar have?', '6', '["4", "5", "6", "7"]'::jsonb, 'music', 'easy'),
  ('What is the boiling point of water in Celsius?', '100', '["90", "100", "110", "120"]'::jsonb, 'science', 'easy')
) v(question_text, correct_answer, choices, category, difficulty)
where not exists (select 1 from public.trivia_questions limit 1);

create or replace function public.get_trivia_questions(
  p_count int default 5,
  p_category text default null,
  p_difficulty text default null
)
returns setof public.trivia_questions
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  select * from public.trivia_questions t
  where (p_category is null or t.category = p_category)
    and (p_difficulty is null or t.difficulty = p_difficulty)
  order by random()
  limit greatest(1, least(p_count, 50));
end;
$$;
revoke all on function public.get_trivia_questions(int, text, text) from public;
grant execute on function public.get_trivia_questions(int, text, text) to authenticated;

-- submit_trivia_answer: validate answer, update score, record answer, advance or complete.
-- state_payload: questionIds (uuid[]), currentQuestionIndex (int), totalQuestions (int), scores (jsonb {userId: number}), answers (jsonb array of {q, user_id, answer, correct})
create or replace function public.submit_trivia_answer(
  p_session_id uuid,
  p_question_index int,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_session record;
  v_uid uuid;
  v_state jsonb;
  v_question_ids jsonb;
  v_question_id uuid;
  v_question record;
  v_correct boolean;
  v_scores jsonb;
  v_answers jsonb;
  v_participants uuid[];
  v_answered_count int;
  v_next_index int;
  v_total int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'trivia' then
    raise exception 'Invalid session or not a Trivia game';
  end if;
  if v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  v_question_ids := v_state->'questionIds';
  if v_question_ids is null or jsonb_array_length(v_question_ids) = 0 then
    raise exception 'No questions in session';
  end if;

  if p_question_index < 0 or p_question_index >= jsonb_array_length(v_question_ids) then
    raise exception 'Invalid question index';
  end if;

  v_question_id := (v_question_ids->>p_question_index)::uuid;
  select id, correct_answer into v_question from public.trivia_questions where id = v_question_id;
  if v_question.id is null then
    raise exception 'Question not found';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(v_state->'answers', '[]'::jsonb)) a
    where (a->>'user_id')::uuid = v_uid and (a->>'q')::int = p_question_index
  ) then
    return;
  end if;

  v_correct := trim(lower(coalesce(p_answer, ''))) = trim(lower(v_question.correct_answer));

  v_scores := coalesce(v_state->'scores', '{}'::jsonb);
  v_scores := jsonb_set(v_scores, array[v_uid::text], to_jsonb((coalesce((v_scores->>v_uid::text)::int, 0)) + case when v_correct then 1 else 0 end));

  v_answers := coalesce(v_state->'answers', '[]'::jsonb);
  v_answers := v_answers || jsonb_build_array(
    jsonb_build_object('q', p_question_index, 'user_id', v_uid, 'answer', coalesce(p_answer, ''), 'correct', v_correct)
  );

  v_state := jsonb_set(jsonb_set(v_state, array['scores'], v_scores), array['answers'], v_answers);

  select array_agg(p.user_id order by p.turn_order_position nulls last)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';

  select count(distinct (a->>'user_id'))
  into v_answered_count
  from jsonb_array_elements(v_answers) a
  where (a->>'q')::int = p_question_index;

  v_total := jsonb_array_length(v_question_ids);
  if v_answered_count >= coalesce(array_length(v_participants, 1), 1) then
    v_next_index := p_question_index + 1;
    v_state := jsonb_set(v_state, array['currentQuestionIndex'], to_jsonb(v_next_index));
    if v_next_index >= v_total then
      update public.game_sessions
      set status = 'completed', result = 'winner', state_payload = v_state, updated_at = now()
      where id = p_session_id;
      return;
    end if;
  end if;

  update public.game_sessions
  set state_payload = v_state, updated_at = now()
  where id = p_session_id;
end;
$$;
revoke all on function public.submit_trivia_answer(uuid, int, text) from public;
grant execute on function public.submit_trivia_answer(uuid, int, text) to authenticated;

-- Two Truths and a Lie: state has roundIndex, submitterUserId, statements (3 strings), lieIndex (0|1|2), votes {userId: index}, revealed, scores {userId: number}
create or replace function public.submit_two_truths_lie_statements(
  p_session_id uuid,
  p_statements jsonb,
  p_lie_index int
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_submitter uuid;
  v_stmt text;
  v_i int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'two_truths_lie' then
    raise exception 'Invalid session or not Two Truths and a Lie';
  end if;
  if v_session.status = 'completed' then raise exception 'Game completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'statements') is not null and (v_state->'statements') != 'null'::jsonb then
    raise exception 'Statements already submitted for this round';
  end if;

  if p_lie_index is null or p_lie_index < 0 or p_lie_index > 2 then
    raise exception 'lie_index must be 0, 1, or 2';
  end if;
  if jsonb_array_length(p_statements) <> 3 then
    raise exception 'Exactly 3 statements required';
  end if;
  for v_i in 0..2 loop
    v_stmt := nullif(trim((p_statements->>v_i)::text), '');
    if v_stmt is null then raise exception 'All statements must be non-empty'; end if;
  end loop;

  select array_agg(p.user_id order by p.turn_order_position nulls last)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  if not (v_uid = any(v_participants)) then
    raise exception 'You are not a participant';
  end if;

  v_submitter := (v_state->>'submitterUserId')::uuid;
  if v_submitter is null and array_length(v_participants, 1) > 0 then
    v_submitter := v_participants[1];
  end if;
  if v_uid <> v_submitter then
    raise exception 'Only the submitter for this round may submit statements';
  end if;

  v_state := jsonb_set(jsonb_set(v_state, array['statements'], p_statements), array['lieIndex'], to_jsonb(p_lie_index));
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_two_truths_lie_statements(uuid, jsonb, int) from public;
grant execute on function public.submit_two_truths_lie_statements(uuid, jsonb, int) to authenticated;

create or replace function public.submit_two_truths_lie_vote(
  p_session_id uuid,
  p_statement_index int
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_submitter uuid;
  v_votes jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'two_truths_lie' then
    raise exception 'Invalid session or not Two Truths and a Lie';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'statements') is null or (v_state->'statements') = 'null'::jsonb then
    raise exception 'No statements to vote on yet';
  end if;
  if (v_state->'revealed')::text = 'true' then
    raise exception 'Round already revealed';
  end if;

  if p_statement_index is null or p_statement_index < 0 or p_statement_index > 2 then
    raise exception 'statement_index must be 0, 1, or 2';
  end if;

  select array_agg(p.user_id order by p.turn_order_position nulls last)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  if not (v_uid = any(v_participants)) then
    raise exception 'You are not a participant';
  end if;

  v_submitter := (v_state->>'submitterUserId')::uuid;
  if v_uid = v_submitter then
    raise exception 'Submitter cannot vote';
  end if;

  v_votes := coalesce(v_state->'votes', '{}'::jsonb);
  if (v_votes ? v_uid::text) then
    raise exception 'You have already voted this round';
  end if;

  v_votes := jsonb_set(v_votes, array[v_uid::text], to_jsonb(p_statement_index));
  v_state := jsonb_set(v_state, array['votes'], v_votes);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_two_truths_lie_vote(uuid, int) from public;
grant execute on function public.submit_two_truths_lie_vote(uuid, int) to authenticated;

create or replace function public.reveal_two_truths_lie(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_scores jsonb;
  v_lie_index int;
  v_votes jsonb;
  v_voter text;
  v_vote int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'two_truths_lie' then
    raise exception 'Invalid session or not Two Truths and a Lie';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'revealed')::text = 'true' then
    return;
  end if;

  v_lie_index := (v_state->>'lieIndex')::int;
  v_scores := coalesce(v_state->'scores', '{}'::jsonb);
  v_votes := coalesce(v_state->'votes', '{}'::jsonb);

  for v_voter in select * from jsonb_object_keys(v_votes) loop
    v_vote := (v_votes->>v_voter)::int;
    if v_vote = v_lie_index then
      v_scores := jsonb_set(v_scores, array[v_voter], to_jsonb((coalesce((v_scores->>v_voter)::int, 0)) + 1));
    end if;
  end loop;

  v_state := jsonb_set(jsonb_set(v_state, array['scores'], v_scores), array['revealed'], 'true'::jsonb);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.reveal_two_truths_lie(uuid) from public;
grant execute on function public.reveal_two_truths_lie(uuid) to authenticated;

create or replace function public.advance_round_two_truths_lie(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_next_index int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'two_truths_lie' then
    raise exception 'Invalid session or not Two Truths and a Lie';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'revealed')::text <> 'true' then
    raise exception 'Reveal the round before advancing';
  end if;

  select array_agg(p.user_id order by p.turn_order_position nulls last)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';

  v_next_index := coalesce((v_state->>'roundIndex')::int, 0) + 1;
  v_state := jsonb_build_object(
    'roundIndex', v_next_index,
    'submitterUserId', v_participants[1 + (v_next_index % nullif(array_length(v_participants, 1), 0))],
    'statements', null,
    'lieIndex', null,
    'votes', '{}'::jsonb,
    'revealed', false,
    'scores', coalesce(v_state->'scores', '{}'::jsonb)
  );
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.advance_round_two_truths_lie(uuid) from public;
grant execute on function public.advance_round_two_truths_lie(uuid) to authenticated;

-- Would You Rather: two-option prompts; players vote A or B; results show percentages; prompts rotate
create table if not exists public.would_you_rather_prompts (
  id uuid primary key default gen_random_uuid(),
  text_a text not null,
  text_b text not null,
  created_at timestamptz not null default now()
);
comment on table public.would_you_rather_prompts is 'Prompt bank for Would You Rather; each row is one A vs B choice.';

insert into public.would_you_rather_prompts (text_a, text_b)
select * from (values
  ('Have unlimited coffee for life', 'Have unlimited tea for life'),
  ('Always be 10 minutes early', 'Always be 10 minutes late'),
  ('Live without music', 'Live without movies'),
  ('Have a rewind button in life', 'Have a pause button in life'),
  ('Be able to speak all languages', 'Be able to talk to animals'),
  ('Have summer year-round', 'Have winter year-round'),
  ('Only eat breakfast foods', 'Only eat dinner foods'),
  ('Give up social media', 'Give up streaming'),
  ('Travel 100 years back in time', 'Travel 100 years into the future'),
  ('Have a tiny elephant as a pet', 'Have a full-sized giraffe as a pet')
) v(text_a, text_b)
where not exists (select 1 from public.would_you_rather_prompts limit 1);

create or replace function public.get_would_you_rather_prompts(p_count int default 5)
returns setof public.would_you_rather_prompts
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  select * from public.would_you_rather_prompts
  order by random()
  limit greatest(1, least(p_count, 20));
end;
$$;
revoke all on function public.get_would_you_rather_prompts(int) from public;
grant execute on function public.get_would_you_rather_prompts(int) to authenticated;

-- state: promptIds (uuid[]), promptIndex (int), votes (userId -> 'A'|'B'), revealed (bool)
create or replace function public.submit_would_you_rather_vote(
  p_session_id uuid,
  p_choice text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_votes jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_choice is null or p_choice not in ('A', 'B') then
    raise exception 'Choice must be A or B';
  end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'would_you_rather' then
    raise exception 'Invalid session or not Would You Rather';
  end if;
  if v_session.status = 'completed' then raise exception 'Game completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'revealed')::text = 'true' then
    raise exception 'Prompt already revealed';
  end if;
  if (v_state->'promptIds') is null or jsonb_array_length(v_state->'promptIds') = 0 then
    raise exception 'No prompts in session';
  end if;

  select array_agg(p.user_id)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  if not (v_uid = any(v_participants)) then
    raise exception 'You are not a participant';
  end if;

  v_votes := coalesce(v_state->'votes', '{}'::jsonb);
  if (v_votes ? v_uid::text) then
    raise exception 'You have already voted for this prompt';
  end if;

  v_votes := jsonb_set(v_votes, array[v_uid::text], to_jsonb(p_choice));
  v_state := jsonb_set(v_state, array['votes'], v_votes);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_would_you_rather_vote(uuid, text) from public;
grant execute on function public.submit_would_you_rather_vote(uuid, text) to authenticated;

create or replace function public.reveal_would_you_rather(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_session record;
  v_state jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'would_you_rather' then
    raise exception 'Invalid session or not Would You Rather';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'revealed')::text = 'true' then return; end if;

  v_state := jsonb_set(v_state, array['revealed'], 'true'::jsonb);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.reveal_would_you_rather(uuid) from public;
grant execute on function public.reveal_would_you_rather(uuid) to authenticated;

create or replace function public.advance_prompt_would_you_rather(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_prompt_ids jsonb;
  v_next_index int;
  v_len int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'would_you_rather' then
    raise exception 'Invalid session or not Would You Rather';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->'revealed')::text <> 'true' then
    raise exception 'Reveal results before advancing';
  end if;

  v_prompt_ids := v_state->'promptIds';
  v_len := jsonb_array_length(v_prompt_ids);
  v_next_index := coalesce((v_state->>'promptIndex')::int, 0) + 1;
  if v_next_index >= v_len then
    v_next_index := 0;
  end if;

  v_state := jsonb_set(
    jsonb_set(
      jsonb_set(v_state, array['promptIndex'], to_jsonb(v_next_index)),
      array['votes'], '{}'::jsonb
    ),
    array['revealed'], 'false'::jsonb
  );
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.advance_prompt_would_you_rather(uuid) from public;
grant execute on function public.advance_prompt_would_you_rather(uuid) to authenticated;

-- Darts: state has startingScore (301|501), playerOrder (uuid[]), scores {userId: number}, currentPlayerIndex, currentTurnThrows (int[]), throwHistory, winnerId
-- Valid throw points: 0-60 (segments), 25 (outer bull), 50 (inner bull). 3 throws per turn. Bust: score < 0 or = 1. Win: score = 0.
create or replace function public.submit_darts_throw(
  p_session_id uuid,
  p_points int
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_player_order jsonb;
  v_current_idx int;
  v_current_player uuid;
  v_scores jsonb;
  v_throws jsonb;
  v_turn_total int;
  v_new_score int;
  v_next_idx int;
  v_history jsonb;
  v_starting int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if p_points is null or p_points < 0 or (p_points > 60 and p_points not in (25, 50)) then
    raise exception 'Invalid points: must be 0-60, 25, or 50';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'darts' then
    raise exception 'Invalid session or not Darts';
  end if;
  if v_session.status = 'completed' then raise exception 'Game completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  v_player_order := v_state->'playerOrder';
  if v_player_order is null or jsonb_array_length(v_player_order) = 0 then
    raise exception 'No player order';
  end if;

  v_current_idx := coalesce((v_state->>'currentPlayerIndex')::int, 0);
  v_current_player := (v_player_order->>v_current_idx)::uuid;
  if v_uid <> v_current_player then
    raise exception 'Not your turn';
  end if;

  v_throws := coalesce(v_state->'currentTurnThrows', '[]'::jsonb);
  if jsonb_array_length(v_throws) >= 3 then
    raise exception 'Turn already has 3 throws';
  end if;

  v_throws := v_throws || to_jsonb(p_points);
  v_state := jsonb_set(v_state, array['currentTurnThrows'], v_throws);

  if jsonb_array_length(v_throws) < 3 then
    update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
    return;
  end if;

  v_turn_total := (v_throws->>0)::int + (v_throws->>1)::int + (v_throws->>2)::int;
  v_scores := coalesce(v_state->'scores', '{}'::jsonb);
  v_new_score := (v_scores->>v_current_player::text)::int - v_turn_total;
  v_starting := coalesce((v_state->>'startingScore')::int, 501);

  if v_new_score < 0 or v_new_score = 1 then
    v_new_score := (v_scores->>v_current_player::text)::int;
  end if;

  v_scores := jsonb_set(v_scores, array[v_current_player::text], to_jsonb(v_new_score));
  v_history := coalesce(v_state->'throwHistory', '[]'::jsonb);
  v_history := v_history || jsonb_build_array(
    jsonb_build_object('playerId', v_current_player, 'throws', v_throws, 'turnTotal', v_turn_total)
  );

  v_state := jsonb_set(jsonb_set(v_state, array['scores'], v_scores), array['throwHistory'], v_history);
  v_state := jsonb_set(v_state, array['currentTurnThrows'], '[]'::jsonb);

  if v_new_score = 0 then
    v_state := jsonb_set(v_state, array['winnerId'], to_jsonb(v_current_player::text));
    update public.game_sessions
    set state_payload = v_state, status = 'completed', result = 'winner', updated_at = now()
    where id = p_session_id;
    return;
  end if;

  v_next_idx := (v_current_idx + 1) % jsonb_array_length(v_player_order);
  v_state := jsonb_set(v_state, array['currentPlayerIndex'], to_jsonb(v_next_idx));
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_darts_throw(uuid, int) from public;
grant execute on function public.submit_darts_throw(uuid, int) to authenticated;

-- Caption Game: prompt image per round; players submit captions, then vote; top captions recorded
create table if not exists public.caption_game_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  created_at timestamptz not null default now()
);
comment on table public.caption_game_images is 'Prompt images for Caption Game rounds.';

insert into public.caption_game_images (image_url, alt_text)
select * from (values
  ('https://picsum.photos/seed/cap1/400/300', 'Abstract scene'),
  ('https://picsum.photos/seed/cap2/400/300', 'Nature'),
  ('https://picsum.photos/seed/cap3/400/300', 'Urban'),
  ('https://picsum.photos/seed/cap4/400/300', 'Portrait'),
  ('https://picsum.photos/seed/cap5/400/300', 'Landscape')
) v(image_url, alt_text)
where not exists (select 1 from public.caption_game_images limit 1);

create or replace function public.get_caption_game_images(p_count int default 5)
returns setof public.caption_game_images
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  select * from public.caption_game_images
  order by random()
  limit greatest(1, least(p_count, 20));
end;
$$;
revoke all on function public.get_caption_game_images(int) from public;
grant execute on function public.get_caption_game_images(int) to authenticated;

-- state: imageIds[], roundIndex, phase ('submitting'|'voting'|'revealed'), captions [{playerId, text}], votes {userId: index}, roundHistory []
create or replace function public.submit_caption_game_caption(
  p_session_id uuid,
  p_caption_text text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_captions jsonb;
  v_caption_text text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_caption_text := nullif(trim(p_caption_text), '');
  if v_caption_text is null or length(v_caption_text) > 500 then
    raise exception 'Caption must be 1-500 characters';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'caption_game' then
    raise exception 'Invalid session or not Caption Game';
  end if;
  if v_session.status = 'completed' then raise exception 'Game completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->>'phase') <> 'submitting' then
    raise exception 'Not in submitting phase';
  end if;

  select array_agg(p.user_id)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  if not (v_uid = any(v_participants)) then
    raise exception 'You are not a participant';
  end if;

  v_captions := coalesce(v_state->'captions', '[]'::jsonb);
  if exists (
    select 1 from jsonb_array_elements(v_captions) c
    where (c->>'playerId')::uuid = v_uid
  ) then
    raise exception 'You already submitted a caption this round';
  end if;

  v_captions := v_captions || jsonb_build_array(jsonb_build_object('playerId', v_uid, 'text', v_caption_text));
  v_state := jsonb_set(v_state, array['captions'], v_captions);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_caption_game_caption(uuid, text) from public;
grant execute on function public.submit_caption_game_caption(uuid, text) to authenticated;

create or replace function public.start_caption_game_voting(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_captions jsonb;
  v_count int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'caption_game' then
    raise exception 'Invalid session or not Caption Game';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->>'phase') <> 'submitting' then return; end if;

  select array_agg(p.user_id)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  v_captions := coalesce(v_state->'captions', '[]'::jsonb);
  v_count := jsonb_array_length(v_captions);
  if v_count < array_length(v_participants, 1) then
    raise exception 'Not everyone has submitted a caption yet';
  end if;

  v_state := jsonb_set(v_state, array['phase'], '"voting"'::jsonb);
  v_state := jsonb_set(v_state, array['votes'], '{}'::jsonb);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.start_caption_game_voting(uuid) from public;
grant execute on function public.start_caption_game_voting(uuid) to authenticated;

create or replace function public.submit_caption_game_vote(
  p_session_id uuid,
  p_caption_index int
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_captions jsonb;
  v_votes jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'caption_game' then
    raise exception 'Invalid session or not Caption Game';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->>'phase') <> 'voting' then
    raise exception 'Not in voting phase';
  end if;

  v_captions := v_state->'captions';
  if p_caption_index is null or p_caption_index < 0 or p_caption_index >= jsonb_array_length(v_captions) then
    raise exception 'Invalid caption index';
  end if;

  v_votes := coalesce(v_state->'votes', '{}'::jsonb);
  if (v_votes ? v_uid::text) then
    raise exception 'You already voted';
  end if;

  v_votes := jsonb_set(v_votes, array[v_uid::text], to_jsonb(p_caption_index));
  v_state := jsonb_set(v_state, array['votes'], v_votes);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_caption_game_vote(uuid, int) from public;
grant execute on function public.submit_caption_game_vote(uuid, int) to authenticated;

create or replace function public.reveal_caption_game_round(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_session record;
  v_state jsonb;
  v_participants uuid[];
  v_votes jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'caption_game' then
    raise exception 'Invalid session or not Caption Game';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->>'phase') <> 'voting' then return; end if;

  select array_agg(p.user_id)
  into v_participants
  from public.game_session_participants p
  where p.session_id = p_session_id and p.acceptance_state = 'accepted';
  v_votes := v_state->'votes';
  if (select count(*) from jsonb_each(v_votes)) < array_length(v_participants, 1) then
    raise exception 'Not everyone has voted yet';
  end if;

  v_state := jsonb_set(v_state, array['phase'], '"revealed"'::jsonb);
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.reveal_caption_game_round(uuid) from public;
grant execute on function public.reveal_caption_game_round(uuid) to authenticated;

create or replace function public.advance_caption_game_round(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_image_ids jsonb;
  v_round int;
  v_next_round int;
  v_history jsonb;
  v_votes jsonb;
  v_captions jsonb;
  v_vote_counts jsonb;
  v_i int;
  v_idx int;
  v_top jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'caption_game' then
    raise exception 'Invalid session or not Caption Game';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if (v_state->>'phase') <> 'revealed' then
    raise exception 'Reveal results before advancing';
  end if;

  v_image_ids := v_state->'imageIds';
  v_round := coalesce((v_state->>'roundIndex')::int, 0);
  v_next_round := v_round + 1;

  v_captions := v_state->'captions';
  v_votes := v_state->'votes';
  v_vote_counts := '{}'::jsonb;
  for v_i in 0..jsonb_array_length(v_captions)-1 loop
    v_vote_counts := jsonb_set(v_vote_counts, array[v_i::text],
      to_jsonb((select count(*) from jsonb_each_text(v_votes) where value::int = v_i)));
  end loop;
  v_history := coalesce(v_state->'roundHistory', '[]'::jsonb);
  v_top := (
    select coalesce(jsonb_agg(idx), '[]'::jsonb)
    from (
      select idx::int as idx
      from generate_series(0, jsonb_array_length(v_captions)-1) idx
      order by (v_vote_counts->>idx::text)::int desc nulls last
      limit 3
    ) t
  );
  v_history := v_history || jsonb_build_array(
    jsonb_build_object(
      'roundIndex', v_round,
      'imageId', v_state->'currentImageId',
      'captions', v_captions,
      'voteCounts', v_vote_counts,
      'topCaptionIndices', coalesce(v_top, '[]'::jsonb)
    )
  );

  if v_next_round >= jsonb_array_length(v_image_ids) then
    update public.game_sessions
    set state_payload = jsonb_set(v_state, array['roundHistory'], v_history),
        status = 'completed', result = 'winner', updated_at = now()
    where id = p_session_id;
    return;
  end if;

  v_state := jsonb_build_object(
    'imageIds', v_image_ids,
    'roundIndex', v_next_round,
    'currentImageId', v_image_ids->v_next_round,
    'phase', 'submitting',
    'captions', '[]'::jsonb,
    'votes', '{}'::jsonb,
    'roundHistory', v_history
  );
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.advance_caption_game_round(uuid) from public;
grant execute on function public.advance_caption_game_round(uuid) to authenticated;

-- Word Search: timed solo; grid of letters; form words by adjacent path; score by word length; dictionary = hangman_words
create or replace function public.submit_word_search_word(
  p_session_id uuid,
  p_word text,
  p_path jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_grid jsonb;
  v_start_time timestamptz;
  v_duration int;
  v_found jsonb;
  v_score int;
  v_word text;
  v_path_len int;
  v_i int;
  v_j int;
  v_r int;
  v_c int;
  v_r2 int;
  v_c2 int;
  v_letter text;
  v_word_from_path text;
  v_exists boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  v_word := lower(trim(p_word));
  if length(v_word) < 2 then
    raise exception 'Word must be at least 2 characters';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'word_search' then
    raise exception 'Invalid session or not Word Search';
  end if;
  if v_session.status = 'completed' then
    raise exception 'Game has ended';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  v_start_time := (v_state->>'startTime')::timestamptz;
  v_duration := coalesce((v_state->>'durationSeconds')::int, 60);
  if v_start_time is null or (now() - v_start_time) > (v_duration || ' seconds')::interval then
    update public.game_sessions set status = 'completed', result = 'failed', updated_at = now() where id = p_session_id;
    raise exception 'Time is up';
  end if;

  select exists (select 1 from public.hangman_words where lower(word) = v_word) into v_exists;
  if not v_exists then
    raise exception 'Word not in dictionary';
  end if;

  v_path_len := jsonb_array_length(p_path);
  if v_path_len <> length(v_word) then
    raise exception 'Path length does not match word length';
  end if;

  v_grid := v_state->'grid';
  if v_grid is null or jsonb_array_length(v_grid) = 0 then
    raise exception 'Invalid grid';
  end if;

  v_word_from_path := '';
  for v_i in 0..v_path_len-1 loop
    v_r := (p_path->v_i->>0)::int;
    v_c := (p_path->v_i->>1)::int;
    if v_r is null or v_c is null then
      raise exception 'Invalid path cell';
    end if;
    if v_i > 0 then
      v_r2 := (p_path->(v_i-1)->>0)::int;
      v_c2 := (p_path->(v_i-1)->>1)::int;
      if abs(v_r - v_r2) > 1 or abs(v_c - v_c2) > 1 then
        raise exception 'Path cells must be adjacent';
      end if;
    end if;
    for v_j in 0..v_i-1 loop
      if (p_path->v_j->>0)::int = v_r and (p_path->v_j->>1)::int = v_c then
        raise exception 'Path cannot repeat a cell';
      end if;
    end loop;
    v_letter := (v_grid->v_r->>v_c);
    if v_letter is null then
      raise exception 'Invalid path position';
    end if;
    v_word_from_path := v_word_from_path || lower(v_letter);
  end loop;

  if v_word_from_path <> v_word then
    raise exception 'Path does not spell the word';
  end if;

  v_found := coalesce(v_state->'foundWords', '[]'::jsonb);
  if exists (
    select 1 from jsonb_array_elements_text(v_found) e where e = v_word
  ) then
    raise exception 'Word already found';
  end if;

  v_found := v_found || to_jsonb(v_word);

  v_score := coalesce((v_state->>'score')::int, 0) + length(v_word);
  v_state := jsonb_set(jsonb_set(v_state, array['foundWords'], v_found), array['score'], to_jsonb(v_score));
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
end;
$$;
revoke all on function public.submit_word_search_word(uuid, text, jsonb) from public;
grant execute on function public.submit_word_search_word(uuid, text, jsonb) to authenticated;

-- Battleship: 2-player, 10x10. Ships: 5,4,3,3,2 cells. state_payload: phase (placing|playing|completed),
-- creatorShips, inviteeShips (array of {id, positions: [[r,c],...]}), creatorShots, inviteeShots ({r,c,hit}),
-- currentTurnPosition (0=creator, 1=invitee), winnerPosition when completed.
create or replace function public.place_battleship_ships(p_session_id uuid, p_ships jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_ship jsonb;
  v_positions jsonb;
  v_len int;
  v_i int;
  v_j int;
  v_r int;
  v_c int;
  v_r0 int;
  v_c0 int;
  v_cells text[];
  v_expected_len int[] := array[2, 3, 3, 4, 5];
  v_lengths int[] := array[]::int[];
  v_prev_r int;
  v_prev_c int;
  v_ship_count int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_ships is null or jsonb_typeof(p_ships) <> 'array' or jsonb_array_length(p_ships) <> 5 then
    raise exception 'Exactly 5 ships required';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'battleship' then
    raise exception 'Session not found or not Battleship';
  end if;
  if v_session.status not in ('active', 'waiting_your_move', 'waiting_opponent_move') then
    raise exception 'Game not in play';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', 'placing') <> 'placing' then
    raise exception 'Placement phase is over';
  end if;

  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';
  if v_creator_id is null or v_invitee_id is null then
    raise exception 'Session must have two players';
  end if;

  v_cells := array[]::text[];

  for v_i in 0..4 loop
    v_ship := p_ships->v_i;
    if v_ship is null or v_ship->'positions' is null then
      raise exception 'Ship % must have positions', v_i;
    end if;
    v_positions := v_ship->'positions';
    v_len := jsonb_array_length(v_positions);
    if v_len < 2 or v_len > 5 then
      raise exception 'Ship % has invalid length', v_i;
    end if;
    v_lengths := v_lengths || v_len;

    v_r0 := (v_positions->0->>0)::int;
    v_c0 := (v_positions->0->>1)::int;
    if v_r0 is null or v_c0 is null or v_r0 < 0 or v_r0 > 9 or v_c0 < 0 or v_c0 > 9 then
      raise exception 'Ship % position out of bounds', v_i;
    end if;
    if (v_r0::text || ',' || v_c0::text) = any(v_cells) then
      raise exception 'Ships cannot overlap';
    end if;
    v_cells := v_cells || (v_r0::text || ',' || v_c0::text);
    v_prev_r := v_r0;
    v_prev_c := v_c0;
    for v_j in 1..v_len-1 loop
      v_r := (v_positions->v_j->>0)::int;
      v_c := (v_positions->v_j->>1)::int;
      if v_r is null or v_c is null or v_r < 0 or v_r > 9 or v_c < 0 or v_c > 9 then
        raise exception 'Ship % position out of bounds', v_i;
      end if;
      if abs(v_r - v_prev_r) + abs(v_c - v_prev_c) <> 1 then
        raise exception 'Ship % cells must be consecutive (horizontal or vertical)', v_i;
      end if;
      if (v_r::text || ',' || v_c::text) = any(v_cells) then
        raise exception 'Ships cannot overlap';
      end if;
      v_cells := v_cells || (v_r::text || ',' || v_c::text);
      v_prev_r := v_r;
      v_prev_c := v_c;
    end loop;
  end loop;
  if (select array_agg(l order by l) from unnest(v_lengths) as l) <> v_expected_len then
    raise exception 'Ship lengths must be exactly 5, 4, 3, 3, 2 (one each: 5,4,3,3,2)';
  end if;

  if v_uid = v_creator_id then
    v_state := jsonb_set(v_state, array['creatorShips'], p_ships);
  elsif v_uid = v_invitee_id then
    v_state := jsonb_set(v_state, array['inviteeShips'], p_ships);
  else
    raise exception 'You are not a participant';
  end if;

  v_ship_count := 0;
  if jsonb_array_length(coalesce(v_state->'creatorShips', '[]'::jsonb)) = 5 then
    v_ship_count := v_ship_count + 1;
  end if;
  if jsonb_array_length(coalesce(v_state->'inviteeShips', '[]'::jsonb)) = 5 then
    v_ship_count := v_ship_count + 1;
  end if;
  if v_ship_count = 2 then
    v_state := jsonb_set(jsonb_set(v_state, array['phase'], to_jsonb('playing'::text)), array['currentTurnPosition'], to_jsonb(0));
  end if;

  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
  if v_ship_count = 2 then
    perform public.notify_game_event(v_creator_id, 'game_your_turn', p_session_id, v_uid);
    perform public.notify_game_event(v_invitee_id, 'game_started', p_session_id, v_uid);
  end if;
end;
$$;

create or replace function public.fire_battleship(p_session_id uuid, p_row int, p_col int)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_opponent_ships jsonb;
  v_my_shots jsonb;
  v_ship jsonb;
  v_positions jsonb;
  v_i int;
  v_j int;
  v_r int;
  v_c int;
  v_hit boolean := false;
  v_sunk boolean;
  v_all_sunk boolean := true;
  v_shot jsonb;
  v_winner_position int;
  v_other_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_row is null or p_col is null or p_row < 0 or p_row > 9 or p_col < 0 or p_col > 9 then
    raise exception 'Invalid coordinates (0-9)';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'battleship' then
    raise exception 'Session not found or not Battleship';
  end if;
  if v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', '') <> 'playing' then
    raise exception 'Game not in firing phase';
  end if;

  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';

  if (coalesce((v_state->>'currentTurnPosition')::int, 0) = 0 and v_uid <> v_creator_id)
     or (coalesce((v_state->>'currentTurnPosition')::int, 0) = 1 and v_uid <> v_invitee_id) then
    raise exception 'Not your turn';
  end if;

  if v_uid = v_creator_id then
    v_opponent_ships := coalesce(v_state->'inviteeShips', '[]'::jsonb);
    v_my_shots := coalesce(v_state->'creatorShots', '[]'::jsonb);
  else
    v_opponent_ships := coalesce(v_state->'creatorShips', '[]'::jsonb);
    v_my_shots := coalesce(v_state->'inviteeShots', '[]'::jsonb);
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_my_shots) s
    where (s->>'r')::int = p_row and (s->>'c')::int = p_col
  ) then
    raise exception 'Already shot at this cell';
  end if;

  for v_j in 0..jsonb_array_length(v_opponent_ships)-1 loop
    v_ship := v_opponent_ships->v_j;
    v_positions := v_ship->'positions';
    if v_positions is not null then
      if exists (
        select 1 from jsonb_array_elements(v_positions) pos
        where (pos->>0)::int = p_row and (pos->>1)::int = p_col
      ) then
        v_hit := true;
        exit;
      end if;
    end if;
  end loop;

  v_shot := jsonb_build_object('r', p_row, 'c', p_col, 'hit', v_hit);
  if v_uid = v_creator_id then
    v_state := jsonb_set(v_state, array['creatorShots'], coalesce(v_state->'creatorShots', '[]'::jsonb) || v_shot);
  else
    v_state := jsonb_set(v_state, array['inviteeShots'], coalesce(v_state->'inviteeShots', '[]'::jsonb) || v_shot);
  end if;

  v_all_sunk := true;
  for v_j in 0..jsonb_array_length(v_opponent_ships)-1 loop
    v_ship := v_opponent_ships->v_j;
    v_positions := v_ship->'positions';
    v_sunk := true;
    if v_positions is not null then
      for v_i in 0..jsonb_array_length(v_positions)-1 loop
        v_r := (v_positions->v_i->>0)::int;
        v_c := (v_positions->v_i->>1)::int;
        if not exists (
          select 1 from jsonb_array_elements(
            case when v_uid = v_creator_id then v_state->'creatorShots' else v_state->'inviteeShots' end
          ) sh where (sh->>'r')::int = v_r and (sh->>'c')::int = v_c
        ) then
          v_sunk := false;
          exit;
        end if;
      end loop;
    end if;
    if not v_sunk then
      v_all_sunk := false;
      exit;
    end if;
  end loop;

  if v_all_sunk then
    v_winner_position := case when v_uid = v_creator_id then 0 else 1 end;
    v_other_id := case when v_uid = v_creator_id then v_invitee_id else v_creator_id end;
    v_state := jsonb_set(v_state, array['winnerPosition'], to_jsonb(v_winner_position));
    update public.game_sessions
    set status = 'completed', result = 'winner',
        state_payload = jsonb_set(v_state, array['phase'], to_jsonb('completed'::text)),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('row', p_row, 'col', p_col, 'hit', v_hit, 'winnerPosition', v_winner_position));
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;

  v_state := jsonb_set(v_state, array['currentTurnPosition'], to_jsonb(1 - (coalesce((v_state->>'currentTurnPosition')::int, 0))));
  v_other_id := case when (v_state->>'currentTurnPosition')::int = 0 then v_creator_id else v_invitee_id end;
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload)
  values (p_session_id, 'move', v_uid, jsonb_build_object('row', p_row, 'col', p_col, 'hit', v_hit));
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

revoke all on function public.place_battleship_ships(uuid, jsonb) from public;
grant execute on function public.place_battleship_ships(uuid, jsonb) to authenticated;
revoke all on function public.fire_battleship(uuid, int, int) from public;
grant execute on function public.fire_battleship(uuid, int, int) to authenticated;

-- Reversi (Othello): 8x8, X=creator (black, first), O=invitee (white). Place to capture lines; no moves = pass; both no moves = game over; most pieces wins.
create or replace function public.make_reversi_move(p_session_id uuid, p_row int, p_col int)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_board jsonb;
  v_current int;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_my_marker text;
  v_opp_marker text;
  v_dirs int[] := array[-1,0,1];
  v_dr int;
  v_dc int;
  v_r int;
  v_c int;
  v_cell text;
  v_valid boolean := false;
  v_flip_r int[];
  v_flip_c int[];
  v_nr int;
  v_nc int;
  v_i int;
  v_opp_moves int := 0;
  v_my_moves int := 0;
  v_count_x int := 0;
  v_count_o int := 0;
  v_winner_position int;
  v_other_id uuid;
  v_j int;
  v_has_line boolean;
  v_tr int[];
  v_tc int[];
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_row is null or p_col is null or p_row < 0 or p_row > 7 or p_col < 0 or p_col > 7 then
    raise exception 'Invalid coordinates (0-7)';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'reversi' then
    raise exception 'Session not found or not Reversi';
  end if;
  if v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;

  v_board := coalesce(v_session.state_payload->'board', null);
  if v_board is null or jsonb_array_length(v_board) <> 8 then
    v_board := '[
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","X","O","","",""],
      ["","","","O","X","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""]
    ]'::jsonb;
  end if;

  v_current := coalesce((v_session.state_payload->>'currentTurnPosition')::int, 0);
  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';
  if (v_current = 0 and v_uid <> v_creator_id) or (v_current = 1 and v_uid <> v_invitee_id) then
    raise exception 'Not your turn';
  end if;

  v_my_marker := case when v_current = 0 then 'X' else 'O' end;
  v_opp_marker := case when v_current = 0 then 'O' else 'X' end;

  v_cell := v_board->p_row->>p_col;
  if v_cell is not null and trim(coalesce(v_cell, '')) <> '' then
    raise exception 'Cell already occupied';
  end if;

  v_flip_r := array[]::int[];
  v_flip_c := array[]::int[];

  for v_dr in select unnest(v_dirs) loop
    for v_dc in select unnest(v_dirs) loop
      if v_dr = 0 and v_dc = 0 then continue; end if;
      v_tr := array[]::int[];
      v_tc := array[]::int[];
      v_r := p_row + v_dr;
      v_c := p_col + v_dc;
      v_has_line := false;
      while v_r >= 0 and v_r <= 7 and v_c >= 0 and v_c <= 7 loop
        v_cell := v_board->v_r->>v_c;
        if trim(coalesce(v_cell, '')) = v_opp_marker then
          v_tr := array_append(v_tr, v_r);
          v_tc := array_append(v_tc, v_c);
          v_r := v_r + v_dr;
          v_c := v_c + v_dc;
        elsif trim(coalesce(v_cell, '')) = v_my_marker then
          v_has_line := true;
          exit;
        else
          exit;
        end if;
      end loop;
      if v_has_line and array_length(v_tr, 1) > 0 then
        v_valid := true;
        v_flip_r := v_flip_r || v_tr;
        v_flip_c := v_flip_c || v_tc;
      end if;
    end loop;
  end loop;

  if not v_valid then
    raise exception 'Invalid move: must capture at least one opponent piece';
  end if;

  v_board := jsonb_set(v_board, array[p_row::text, p_col::text], to_jsonb(v_my_marker));
  for v_i in 1..coalesce(array_length(v_flip_r, 1), 0) loop
    v_nr := v_flip_r[v_i];
    v_nc := v_flip_c[v_i];
    v_board := jsonb_set(v_board, array[v_nr::text, v_nc::text], to_jsonb(v_my_marker));
  end loop;

  for v_r in 0..7 loop
    for v_c in 0..7 loop
      v_cell := v_board->v_r->>v_c;
      if trim(coalesce(v_cell, '')) = 'X' then v_count_x := v_count_x + 1;
      elsif trim(coalesce(v_cell, '')) = 'O' then v_count_o := v_count_o + 1;
      end if;
    end loop;
  end loop;

  v_opp_moves := 0;
  v_my_moves := 0;
  for v_r in 0..7 loop
    for v_c in 0..7 loop
      v_cell := v_board->v_r->>v_c;
      if v_cell is null or trim(coalesce(v_cell, '')) = '' then
        for v_dr in select unnest(v_dirs) loop
          for v_dc in select unnest(v_dirs) loop
            if v_dr = 0 and v_dc = 0 then continue; end if;
            v_nr := v_r + v_dr;
            v_nc := v_c + v_dc;
            if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 and trim(coalesce(v_board->v_nr->>v_nc, '')) = v_my_marker then
              v_nr := v_nr + v_dr;
              v_nc := v_nc + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                v_cell := v_board->v_nr->>v_nc;
                if trim(coalesce(v_cell, '')) = v_my_marker then
                  v_nr := v_nr + v_dr;
                  v_nc := v_nc + v_dc;
                elsif trim(coalesce(v_cell, '')) = v_opp_marker then
                  v_opp_moves := v_opp_moves + 1;
                  exit;
                else exit;
                end if;
              end loop;
              exit;
            end if;
          end loop;
          if v_opp_moves > 0 then exit; end if;
        end loop;
      end if;
      if v_opp_moves > 0 then exit; end if;
    end loop;
    if v_opp_moves > 0 then exit; end if;
  end loop;

  for v_r in 0..7 loop
    for v_c in 0..7 loop
      v_cell := v_board->v_r->>v_c;
      if v_cell is null or trim(coalesce(v_cell, '')) = '' then
        for v_dr in select unnest(v_dirs) loop
          for v_dc in select unnest(v_dirs) loop
            if v_dr = 0 and v_dc = 0 then continue; end if;
            v_nr := v_r + v_dr;
            v_nc := v_c + v_dc;
            if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 and trim(coalesce(v_board->v_nr->>v_nc, '')) = v_opp_marker then
              v_nr := v_nr + v_dr;
              v_nc := v_nc + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                v_cell := v_board->v_nr->>v_nc;
                if trim(coalesce(v_cell, '')) = v_opp_marker then
                  v_nr := v_nr + v_dr;
                  v_nc := v_nc + v_dc;
                elsif trim(coalesce(v_cell, '')) = v_my_marker then
                  v_my_moves := v_my_moves + 1;
                  exit;
                else exit;
                end if;
              end loop;
              exit;
            end if;
          end loop;
          if v_my_moves > 0 then exit; end if;
        end loop;
      end if;
      if v_my_moves > 0 then exit; end if;
    end loop;
    if v_my_moves > 0 then exit; end if;
  end loop;

  if v_opp_moves = 0 and v_my_moves = 0 then
    if v_count_x > v_count_o then
      v_winner_position := 0;
    elsif v_count_o > v_count_x then
      v_winner_position := 1;
    else
      v_winner_position := -1;
    end if;
    v_other_id := case when v_uid = v_creator_id then v_invitee_id else v_creator_id end;
    update public.game_sessions
    set status = 'completed',
        result = case when v_winner_position < 0 then 'draw' else 'winner' end,
        state_payload = jsonb_build_object(
          'board', v_board,
          'currentTurnPosition', v_current,
          'winnerPosition', v_winner_position,
          'countX', v_count_x,
          'countO', v_count_o
        ),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('row', p_row, 'col', p_col, 'winnerPosition', v_winner_position));
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;

  if v_opp_moves > 0 then
    v_current := 1 - v_current;
  end if;
  v_other_id := case when v_current = 0 then v_creator_id else v_invitee_id end;
  update public.game_sessions
  set state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current),
      updated_at = now()
  where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload)
  values (p_session_id, 'move', v_uid, jsonb_build_object('row', p_row, 'col', p_col));
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

revoke all on function public.make_reversi_move(uuid, int, int) from public;
grant execute on function public.make_reversi_move(uuid, int, int) to authenticated;

-- Chess: 2-player, invite one connection. state: phase (waiting_players|playing|completed),
-- board 8x8 (row 0 = rank 8 black, row 7 = rank 1 white), turn 'white'|'black', moveHistory, captured, castling, enPassantTarget, halfMoveClock, fullMoveNumber, gameOver, winner.
create or replace function public.start_chess_game(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_count int;
  v_board jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select gs.id, gs.state_payload, gd.game_type into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'chess' then
    raise exception 'Session not found or not Chess';
  end if;
  if coalesce(v_session.state_payload->>'phase', '') = 'playing' then
    raise exception 'Game already started';
  end if;
  v_count := (select count(*) from public.game_session_participants where session_id = p_session_id and acceptance_state = 'accepted');
  if v_count <> 2 then
    raise exception 'Need exactly 2 accepted players, got %', v_count;
  end if;
  v_board := '[
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ]'::jsonb;
  update public.game_sessions
  set state_payload = jsonb_build_object(
    'phase', 'playing',
    'board', v_board,
    'turn', 'white',
    'moveHistory', '[]'::jsonb,
    'captured', jsonb_build_object('white', '[]'::jsonb, 'black', '[]'::jsonb),
    'castling', jsonb_build_object('whiteKingside', true, 'whiteQueenside', true, 'blackKingside', true, 'blackQueenside', true),
    'enPassantTarget', null,
    'halfMoveClock', 0,
    'fullMoveNumber', 1,
    'gameOver', null,
    'winner', null,
    'inCheck', false
  ),
  status = 'active',
  updated_at = now()
  where id = p_session_id;
end;
$$;

-- Parse square 'e4' to (row, col). Row 0 = rank 8, row 7 = rank 1. Col 0 = a, 7 = h.
create or replace function public.chess_parse_square(p_sq text)
returns int[] language plpgsql immutable as $$
declare
  v_file int;
  v_rank int;
begin
  if p_sq is null or length(p_sq) <> 2 then return null; end if;
  v_file := ascii(lower(substr(p_sq, 1, 1))) - ascii('a');
  v_rank := (substr(p_sq, 2, 1))::int;
  if v_file < 0 or v_file > 7 or v_rank < 1 or v_rank > 8 then return null; end if;
  return array[8 - v_rank, v_file];
end;
$$;

-- Return new board with piece at (r,c) set to p_piece. Empty = ''.
create or replace function public.chess_set_cell(p_board jsonb, p_r int, p_c int, p_piece text)
returns jsonb language sql immutable as $$
  select jsonb_set(p_board, array[p_r::text, p_c::text], to_jsonb(coalesce(p_piece, '')));
$$;

-- Get piece at (r,c). Empty returns ''.
create or replace function public.chess_get_cell(p_board jsonb, p_r int, p_c int)
returns text language sql immutable as $$
  select coalesce(nullif(trim(p_board->p_r->>p_c), ''), '');
$$;

-- Is (p_r, p_c) attacked by side p_white (true = white pieces attack)?
create or replace function public.chess_square_attacked(p_board jsonb, p_r int, p_c int, p_white boolean)
returns boolean language plpgsql as $$
declare
  v_row int;
  v_col int;
  v_piece text;
  v_dr int; v_dc int; v_nr int; v_nc int;
  v_fr int; v_fc int;
begin
  for v_row in 0..7 loop
    for v_col in 0..7 loop
      v_piece := chess_get_cell(p_board, v_row, v_col);
      if v_piece = '' then continue; end if;
      if (p_white and v_piece ~ '[A-Z]') or (not p_white and v_piece ~ '[a-z]') then
        case upper(v_piece)
          when 'P' then
            if p_white then if p_r = v_row - 1 and abs(p_c - v_col) = 1 then return true; end if;
            else if p_r = v_row + 1 and abs(p_c - v_col) = 1 then return true; end if; end if;
          when 'N' then
            if abs(v_row - p_r) in (1,2) and abs(v_col - p_c) in (1,2) and abs(v_row - p_r) + abs(v_col - p_c) = 3 then return true; end if;
          when 'K' then
            if abs(v_row - p_r) <= 1 and abs(v_col - p_c) <= 1 then return true; end if;
          when 'R' then
            if v_row = p_r or v_col = p_c then
              v_dr := sign(p_r - v_row); v_dc := sign(p_c - v_col);
              v_nr := v_row + v_dr; v_nc := v_col + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                if v_nr = p_r and v_nc = p_c then return true; end if;
                if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
                v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
              end loop;
            end if;
          when 'B' then
            if abs(v_row - p_r) = abs(v_col - p_c) then
              v_dr := sign(p_r - v_row); v_dc := sign(p_c - v_col);
              v_nr := v_row + v_dr; v_nc := v_col + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                if v_nr = p_r and v_nc = p_c then return true; end if;
                if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
                v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
              end loop;
            end if;
          when 'Q' then
            if v_row = p_r or v_col = p_c then
              v_dr := sign(p_r - v_row); v_dc := sign(p_c - v_col);
              v_nr := v_row + v_dr; v_nc := v_col + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                if v_nr = p_r and v_nc = p_c then return true; end if;
                if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
                v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
              end loop;
            end if;
            if abs(v_row - p_r) = abs(v_col - p_c) then
              v_dr := sign(p_r - v_row); v_dc := sign(p_c - v_col);
              v_nr := v_row + v_dr; v_nc := v_col + v_dc;
              while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
                if v_nr = p_r and v_nc = p_c then return true; end if;
                if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
                v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
              end loop;
            end if;
          else null;
        end case;
      end if;
    end loop;
  end loop;
  return false;
end;
$$;

-- Make one move on a copy of the board; return new board and captured piece (if any).
create or replace function public.chess_apply_move(p_board jsonb, p_fr int, p_fc int, p_tr int, p_tc int)
returns jsonb language plpgsql as $$
declare
  v_piece text;
  v_new jsonb;
begin
  v_piece := chess_get_cell(p_board, p_fr, p_fc);
  v_new := chess_set_cell(p_board, p_fr, p_fc, '');
  v_new := chess_set_cell(v_new, p_tr, p_tc, v_piece);
  return v_new;
end;
$$;

-- Get all legal (to_r, to_c) for piece at (from_r, from_c). Turn: true = white.
create or replace function public.chess_legal_targets(
  p_board jsonb, p_fr int, p_fc int, p_white boolean,
  p_castling jsonb, p_en_passant text
)
returns table(to_r int, to_c int) language plpgsql as $$
declare
  v_piece text;
  v_tr int; v_tc int;
  v_dr int; v_dc int; v_nr int; v_nc int;
  v_tmp jsonb;
  v_king_r int; v_king_c int;
  v_r int; v_c int;
  v_pawn_start_row int;
  v_opp_white boolean;
begin
  v_piece := chess_get_cell(p_board, p_fr, p_fc);
  if v_piece = '' then return; end if;
  v_opp_white := not p_white;
  case upper(v_piece)
    when 'P' then
      v_pawn_start_row := case when p_white then 6 else 1 end;
      if p_white then
        if p_fr > 0 and chess_get_cell(p_board, p_fr - 1, p_fc) = '' then
          v_tmp := chess_apply_move(p_board, p_fr, p_fc, p_fr - 1, p_fc);
          v_king_r := 7; v_king_c := 4;
          for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'K' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
          if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := p_fr - 1; to_c := p_fc; return next; end if;
        end if;
        if p_fr = 6 and chess_get_cell(p_board, 5, p_fc) = '' and chess_get_cell(p_board, 4, p_fc) = '' then
          v_tmp := chess_apply_move(p_board, p_fr, p_fc, 4, p_fc);
          v_king_r := 7; v_king_c := 4;
          for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'K' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
          if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := 4; to_c := p_fc; return next; end if;
        end if;
        for v_dc in select unnest(array[-1, 1]::int[]) loop
          v_tc := p_fc + v_dc;
          if v_tc >= 0 and v_tc <= 7 and p_fr >= 1 then
            if (chess_get_cell(p_board, p_fr - 1, v_tc) <> '' and chess_get_cell(p_board, p_fr - 1, v_tc) ~ '[a-z]') or (p_en_passant is not null and (p_fr - 1)::text || ',' || v_tc::text = replace(p_en_passant, ' ', '')) then
              v_tmp := chess_apply_move(p_board, p_fr, p_fc, p_fr - 1, v_tc);
              v_king_r := 7; v_king_c := 4;
              for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'K' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
              if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := p_fr - 1; to_c := v_tc; return next; end if;
            end if;
          end if;
        end loop;
      else
        if p_fr < 7 and chess_get_cell(p_board, p_fr + 1, p_fc) = '' then
          v_tmp := chess_apply_move(p_board, p_fr, p_fc, p_fr + 1, p_fc);
          v_king_r := 0; v_king_c := 4;
          for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'k' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
          if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := p_fr + 1; to_c := p_fc; return next; end if;
        end if;
        if p_fr = 1 and chess_get_cell(p_board, 2, p_fc) = '' and chess_get_cell(p_board, 3, p_fc) = '' then
          v_tmp := chess_apply_move(p_board, p_fr, p_fc, 3, p_fc);
          v_king_r := 0; v_king_c := 4;
          for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'k' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
          if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := 3; to_c := p_fc; return next; end if;
        end if;
        for v_dc in select unnest(array[-1, 1]::int[]) loop
          v_tc := p_fc + v_dc;
          if v_tc >= 0 and v_tc <= 7 and p_fr <= 6 then
            if chess_get_cell(p_board, p_fr + 1, v_tc) ~ '[A-Z]' or (p_en_passant is not null) then
              v_tmp := chess_apply_move(p_board, p_fr, p_fc, p_fr + 1, v_tc);
              v_king_r := 0; v_king_c := 4;
              for v_r in 0..7 loop for v_c in 0..7 loop if chess_get_cell(v_tmp, v_r, v_c) = 'k' then v_king_r := v_r; v_king_c := v_c; end if; end loop; end loop;
              if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := p_fr + 1; to_c := v_tc; return next; end if;
            end if;
          end if;
        end loop;
      end if;
    when 'R' then
      for v_dr in select unnest(array[-1, 0, 1]::int[]) loop for v_dc in select unnest(array[-1, 0, 1]::int[]) loop
        if v_dr = 0 and v_dc = 0 then continue; end if;
        if v_dr <> 0 and v_dc <> 0 then continue; end if;
        v_nr := p_fr + v_dr; v_nc := p_fc + v_dc;
        while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
          if (p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[a-z]') or (not p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[A-Z]') or chess_get_cell(p_board, v_nr, v_nc) = '' then
            v_tmp := chess_apply_move(p_board, p_fr, p_fc, v_nr, v_nc);
            v_king_r := 0; v_king_c := 4;
            for v_r in 0..7 loop for v_c in 0..7 loop
              if (p_white and chess_get_cell(v_tmp, v_r, v_c) = 'K') or (not p_white and chess_get_cell(v_tmp, v_r, v_c) = 'k') then v_king_r := v_r; v_king_c := v_c; end if;
            end loop; end loop;
            if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := v_nr; to_c := v_nc; return next; end if;
          end if;
          if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
          v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
        end loop;
      end loop; end loop;
    when 'B' then
      for v_dr in select unnest(array[-1, 1]::int[]) loop for v_dc in select unnest(array[-1, 1]::int[]) loop
        v_nr := p_fr + v_dr; v_nc := p_fc + v_dc;
        while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
          if (p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[a-z]') or (not p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[A-Z]') or chess_get_cell(p_board, v_nr, v_nc) = '' then
            v_tmp := chess_apply_move(p_board, p_fr, p_fc, v_nr, v_nc);
            for v_r in 0..7 loop for v_c in 0..7 loop
              if (p_white and chess_get_cell(v_tmp, v_r, v_c) = 'K') or (not p_white and chess_get_cell(v_tmp, v_r, v_c) = 'k') then v_king_r := v_r; v_king_c := v_c; end if;
            end loop; end loop;
            if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := v_nr; to_c := v_nc; return next; end if;
          end if;
          if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
          v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
        end loop;
      end loop; end loop;
    when 'Q' then
      for v_dr in select unnest(array[-1, 0, 1]::int[]) loop for v_dc in select unnest(array[-1, 0, 1]::int[]) loop
        if v_dr = 0 and v_dc = 0 then continue; end if;
        v_nr := p_fr + v_dr; v_nc := p_fc + v_dc;
        while v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 loop
          if (p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[a-z]') or (not p_white and chess_get_cell(p_board, v_nr, v_nc) ~ '[A-Z]') or chess_get_cell(p_board, v_nr, v_nc) = '' then
            v_tmp := chess_apply_move(p_board, p_fr, p_fc, v_nr, v_nc);
            for v_r in 0..7 loop for v_c in 0..7 loop
              if (p_white and chess_get_cell(v_tmp, v_r, v_c) = 'K') or (not p_white and chess_get_cell(v_tmp, v_r, v_c) = 'k') then v_king_r := v_r; v_king_c := v_c; end if;
            end loop; end loop;
            if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := v_nr; to_c := v_nc; return next; end if;
          end if;
          if chess_get_cell(p_board, v_nr, v_nc) <> '' then exit; end if;
          v_nr := v_nr + v_dr; v_nc := v_nc + v_dc;
        end loop;
      end loop; end loop;
    when 'N' then
      for v_dr in select unnest(array[-2, -1, 1, 2]::int[]) loop for v_dc in select unnest(array[-2, -1, 1, 2]::int[]) loop
        if abs(v_dr) + abs(v_dc) <> 3 then continue; end if;
        v_nr := p_fr + v_dr; v_nc := p_fc + v_dc;
        if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 then
          v_tmp := chess_get_cell(p_board, v_nr, v_nc);
          if v_tmp = '' or (p_white and v_tmp ~ '[a-z]') or (not p_white and v_tmp ~ '[A-Z]') then
            v_tmp := chess_apply_move(p_board, p_fr, p_fc, v_nr, v_nc);
            for v_r in 0..7 loop for v_c in 0..7 loop
              if (p_white and chess_get_cell(v_tmp, v_r, v_c) = 'K') or (not p_white and chess_get_cell(v_tmp, v_r, v_c) = 'k') then v_king_r := v_r; v_king_c := v_c; end if;
            end loop; end loop;
            if not chess_square_attacked(v_tmp, v_king_r, v_king_c, v_opp_white) then to_r := v_nr; to_c := v_nc; return next; end if;
          end if;
        end if;
      end loop; end loop;
    when 'K' then
      for v_dr in select unnest(array[-1, 0, 1]::int[]) loop for v_dc in select unnest(array[-1, 0, 1]::int[]) loop
        if v_dr = 0 and v_dc = 0 then continue; end if;
        v_nr := p_fr + v_dr; v_nc := p_fc + v_dc;
        if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 then
          v_tmp := chess_get_cell(p_board, v_nr, v_nc);
          if v_tmp = '' or (p_white and v_tmp ~ '[a-z]') or (not p_white and v_tmp ~ '[A-Z]') then
            v_tmp := chess_apply_move(p_board, p_fr, p_fc, v_nr, v_nc);
            if not chess_square_attacked(v_tmp, v_nr, v_nc, v_opp_white) then to_r := v_nr; to_c := v_nc; return next; end if;
          end if;
        end if;
      end loop; end loop;
    else null;
  end case;
end;
$$;

create or replace function public.make_chess_move(p_session_id uuid, p_from_square text, p_to_square text)
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_board jsonb;
  v_turn text;
  v_fr int; v_fc int; v_tr int; v_tc int;
  v_rc int[];
  v_piece text;
  v_legal boolean := false;
  v_creator_id uuid; v_invitee_id uuid;
  v_other_id uuid;
  v_new_board jsonb;
  v_captured text;
  v_move_history jsonb;
  v_captured_white jsonb; v_captured_black jsonb;
  v_castling jsonb;
  v_en_passant text;
  v_half int; v_full int;
  v_opp_white boolean;
  v_king_r int; v_king_c int;
  v_has_legal boolean;
  v_tmp jsonb;
  v_r int; v_c int;
  v_next_turn text;
  v_in_check boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_from_square is null or p_to_square is null or length(p_from_square) <> 2 or length(p_to_square) <> 2 then
    raise exception 'Invalid squares; use e.g. e2, e4';
  end if;
  select gs.id, gs.status, gs.state_payload, gd.game_type into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'chess' then
    raise exception 'Session not found or not Chess';
  end if;
  if v_session.status = 'completed' then raise exception 'Game already completed'; end if;
  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', '') <> 'playing' then
    raise exception 'Game not in play';
  end if;
  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';
  v_turn := coalesce(v_state->>'turn', 'white');
  if (v_turn = 'white' and v_uid <> v_creator_id) or (v_turn = 'black' and v_uid <> v_invitee_id) then
    raise exception 'Not your turn';
  end if;
  v_rc := chess_parse_square(p_from_square);
  if v_rc is null then raise exception 'Invalid from square %', p_from_square; end if;
  v_fr := v_rc[1]; v_fc := v_rc[2];
  v_rc := chess_parse_square(p_to_square);
  if v_rc is null then raise exception 'Invalid to square %', p_to_square; end if;
  v_tr := v_rc[1]; v_tc := v_rc[2];
  v_board := v_state->'board';
  v_piece := chess_get_cell(v_board, v_fr, v_fc);
  if v_piece = '' then raise exception 'No piece at %', p_from_square; end if;
  if (v_turn = 'white' and v_piece !~ '[A-Z]') or (v_turn = 'black' and v_piece !~ '[a-z]') then
    raise exception 'Not your piece';
  end if;
  select exists (select 1 from chess_legal_targets(v_board, v_fr, v_fc, v_turn = 'white', coalesce(v_state->'castling', '{}'), v_state->>'enPassantTarget') lt where lt.to_r = v_tr and lt.to_c = v_tc) into v_legal;
  if not v_legal then raise exception 'Illegal move: % to %', p_from_square, p_to_square; end if;
  v_captured := chess_get_cell(v_board, v_tr, v_tc);
  v_new_board := chess_apply_move(v_board, v_fr, v_fc, v_tr, v_tc);
  v_move_history := coalesce(v_state->'moveHistory', '[]'::jsonb) || jsonb_build_object('from', p_from_square, 'to', p_to_square, 'piece', v_piece, 'captured', case when v_captured = '' then null else v_captured end);
  v_captured_white := coalesce(v_state->'captured'->'white', '[]'::jsonb);
  v_captured_black := coalesce(v_state->'captured'->'black', '[]'::jsonb);
  if v_captured <> '' then
    if v_turn = 'white' then v_captured_white := v_captured_white || to_jsonb(v_captured); else v_captured_black := v_captured_black || to_jsonb(v_captured); end if;
  end if;
  v_castling := coalesce(v_state->'castling', '{}'::jsonb);
  v_en_passant := null;
  v_half := coalesce((v_state->>'halfMoveClock')::int, 0);
  v_full := coalesce((v_state->>'fullMoveNumber')::int, 1);
  if v_captured <> '' or upper(v_piece) = 'P' then v_half := 0; else v_half := v_half + 1; end if;
  if v_turn = 'black' then v_full := v_full + 1; end if;
  if upper(v_piece) = 'P' and abs(v_fr - v_tr) = 2 then v_en_passant := (v_fr + (v_tr - v_fr)/2)::text || ',' || v_fc::text; end if;
  v_next_turn := case when v_turn = 'white' then 'black' else 'white' end;
  v_opp_white := (v_next_turn = 'white');
  v_king_r := 0; v_king_c := 4;
  for v_r in 0..7 loop for v_c in 0..7 loop
    if (v_opp_white and chess_get_cell(v_new_board, v_r, v_c) = 'K') or (not v_opp_white and chess_get_cell(v_new_board, v_r, v_c) = 'k') then v_king_r := v_r; v_king_c := v_c; end if;
  end loop; end loop;
  v_in_check := chess_square_attacked(v_new_board, v_king_r, v_king_c, not v_opp_white);
  v_has_legal := false;
  for v_r in 0..7 loop
    for v_c in 0..7 loop
      if (v_opp_white and chess_get_cell(v_new_board, v_r, v_c) ~ '[A-Z]') or (not v_opp_white and chess_get_cell(v_new_board, v_r, v_c) ~ '[a-z]') then
        if exists (select 1 from chess_legal_targets(v_new_board, v_r, v_c, v_opp_white, v_castling, v_en_passant) limit 1) then
          v_has_legal := true;
          exit;
        end if;
      end if;
    end loop;
    if v_has_legal then exit; end if;
  end loop;
  if not v_has_legal then
    if v_in_check then
      update public.game_sessions set status = 'completed', result = 'winner',
        state_payload = jsonb_build_object('phase', 'completed', 'board', v_new_board, 'turn', v_next_turn, 'moveHistory', v_move_history, 'captured', jsonb_build_object('white', v_captured_white, 'black', v_captured_black), 'castling', v_castling, 'enPassantTarget', null, 'halfMoveClock', v_half, 'fullMoveNumber', v_full, 'gameOver', 'checkmate', 'winner', v_turn, 'inCheck', true), updated_at = now()
      where id = p_session_id;
      v_other_id := case when v_uid = v_creator_id then v_invitee_id else v_creator_id end;
      perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    else
      update public.game_sessions set status = 'completed', result = 'draw',
        state_payload = jsonb_build_object('phase', 'completed', 'board', v_new_board, 'turn', v_next_turn, 'moveHistory', v_move_history, 'captured', jsonb_build_object('white', v_captured_white, 'black', v_captured_black), 'castling', v_castling, 'enPassantTarget', null, 'halfMoveClock', v_half, 'fullMoveNumber', v_full, 'gameOver', 'stalemate', 'winner', null, 'inCheck', false), updated_at = now()
      where id = p_session_id;
      v_other_id := case when v_uid = v_creator_id then v_invitee_id else v_creator_id end;
      perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    end if;
    insert into public.game_events (session_id, event_type, actor_id, payload) values (p_session_id, 'move', v_uid, jsonb_build_object('from', p_from_square, 'to', p_to_square));
    return;
  end if;
  if v_half >= 100 then
    update public.game_sessions set status = 'completed', result = 'draw',
      state_payload = jsonb_build_object('phase', 'completed', 'board', v_new_board, 'turn', v_next_turn, 'moveHistory', v_move_history, 'captured', jsonb_build_object('white', v_captured_white, 'black', v_captured_black), 'castling', v_castling, 'enPassantTarget', null, 'halfMoveClock', v_half, 'fullMoveNumber', v_full, 'gameOver', 'draw_50', 'winner', null, 'inCheck', false), updated_at = now()
    where id = p_session_id;
    v_other_id := case when v_uid = v_creator_id then v_invitee_id else v_creator_id end;
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    insert into public.game_events (session_id, event_type, actor_id, payload) values (p_session_id, 'move', v_uid, jsonb_build_object('from', p_from_square, 'to', p_to_square));
    return;
  end if;
  update public.game_sessions set state_payload = jsonb_build_object('phase', 'playing', 'board', v_new_board, 'turn', v_next_turn, 'moveHistory', v_move_history, 'captured', jsonb_build_object('white', v_captured_white, 'black', v_captured_black), 'castling', v_castling, 'enPassantTarget', v_en_passant, 'halfMoveClock', v_half, 'fullMoveNumber', v_full, 'gameOver', null, 'winner', null, 'inCheck', v_in_check), updated_at = now() where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload) values (p_session_id, 'move', v_uid, jsonb_build_object('from', p_from_square, 'to', p_to_square));
  v_other_id := case when v_next_turn = 'white' then v_creator_id else v_invitee_id end;
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

-- Convert (row, col) to square 'e4'. Row 0 = rank 8.
create or replace function public.chess_rc_to_square(p_r int, p_c int)
returns text language sql immutable as $$
  select chr(ascii('a') + p_c) || (8 - p_r)::text;
$$;

-- Return array of to-squares (e.g. ['e4','e5']) for piece at from_square.
create or replace function public.get_chess_legal_moves(p_session_id uuid, p_from_square text)
returns text[] language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_state jsonb;
  v_board jsonb;
  v_rc int[];
  v_fr int; v_fc int;
  v_turn text;
  v_white boolean;
  v_result text[];
begin
  select state_payload into v_state from public.game_sessions gs join public.game_definitions gd on gd.id = gs.game_definition_id where gs.id = p_session_id and gd.game_type = 'chess';
  if v_state is null or coalesce(v_state->>'phase', '') <> 'playing' then return array[]::text[]; end if;
  v_board := v_state->'board';
  v_rc := chess_parse_square(p_from_square);
  if v_rc is null then return array[]::text[]; end if;
  v_fr := v_rc[1]; v_fc := v_rc[2];
  v_turn := coalesce(v_state->>'turn', 'white');
  v_white := (v_turn = 'white');
  select array_agg(chess_rc_to_square(lt.to_r, lt.to_c))
  into v_result
  from chess_legal_targets(v_board, v_fr, v_fc, v_white, coalesce(v_state->'castling', '{}'), v_state->>'enPassantTarget') lt;
  return coalesce(v_result, array[]::text[]);
end;
$$;

revoke all on function public.start_chess_game(uuid) from public;
grant execute on function public.start_chess_game(uuid) to authenticated;
revoke all on function public.make_chess_move(uuid, text, text) from public;
grant execute on function public.make_chess_move(uuid, text, text) to authenticated;
revoke all on function public.get_chess_legal_moves(uuid, text) from public;
grant execute on function public.get_chess_legal_moves(uuid, text) to authenticated;

-- Scrabble-style: 2-4 players, invite connections. state: phase (waiting_players|playing|completed),
-- board 15x15, tileBag, racks by position, currentTurnPosition, scores, passCount.
-- Dictionary: hangman_words. Letter values standard; center (7,7) required on first move.
create or replace function public.start_scrabble_game(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_count int;
  v_bag text[];
  v_shuffled text[];
  v_remaining jsonb;
  v_racks jsonb := '{}'::jsonb;
  v_i int;
  v_board jsonb;
  v_scores jsonb := '{}'::jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'scrabble' then
    raise exception 'Session not found or not Scrabble';
  end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', 'waiting_players') <> 'waiting_players' then
    raise exception 'Game already started';
  end if;

  v_count := (select count(*) from public.game_session_participants where session_id = p_session_id and acceptance_state = 'accepted');
  if v_count < 2 or v_count > 4 then
    raise exception 'Need 2 to 4 accepted players, got %', v_count;
  end if;

  v_bag := array_cat(
    array_fill('A'::text, array[9]), array_fill('B'::text, array[2]), array_fill('C'::text, array[2]),
    array_fill('D'::text, array[4]), array_fill('E'::text, array[12]), array_fill('F'::text, array[2]),
    array_fill('G'::text, array[3]), array_fill('H'::text, array[2]), array_fill('I'::text, array[9]),
    array_fill('J'::text, array[1]), array_fill('K'::text, array[1]), array_fill('L'::text, array[4]),
    array_fill('M'::text, array[2]), array_fill('N'::text, array[6]), array_fill('O'::text, array[8]),
    array_fill('P'::text, array[2]), array_fill('Q'::text, array[1]), array_fill('R'::text, array[6]),
    array_fill('S'::text, array[4]), array_fill('T'::text, array[6]), array_fill('U'::text, array[4]),
    array_fill('V'::text, array[2]), array_fill('W'::text, array[2]), array_fill('X'::text, array[1]),
    array_fill('Y'::text, array[2]), array_fill('Z'::text, array[1])
  );
  select array_agg(t order by random()) into v_shuffled from unnest(v_bag) as t;

  for v_i in 0..v_count-1 loop
    v_racks := v_racks || jsonb_build_object(v_i::text, (
      select coalesce(jsonb_agg(v_shuffled[n]), '[]'::jsonb) from generate_series(v_i*7+1, least((v_i+1)*7, array_length(v_shuffled, 1))) as n
    ));
    v_scores := v_scores || jsonb_build_object(v_i::text, 0);
  end loop;

  v_remaining := (select coalesce(jsonb_agg(to_jsonb(v_shuffled[n]) order by n), '[]'::jsonb) from generate_series(v_count*7+1, array_length(v_shuffled, 1)) as n);
  if v_remaining is null then v_remaining := '[]'::jsonb; end if;

  v_board := (select jsonb_agg(row order by ord) from (
    select jsonb_build_array('','','','','','','','','','','','','','','') as row, g as ord from generate_series(0,14) g
  ) t);

  v_state := jsonb_build_object(
    'phase', 'playing',
    'board', v_board,
    'tileBag', v_remaining,
    'racks', v_racks,
    'currentTurnPosition', 0,
    'scores', v_scores,
    'passCount', 0
  );

  update public.game_sessions set state_payload = v_state, status = 'active', updated_at = now() where id = p_session_id;
end;
$$;

create or replace function public.play_scrabble_word(p_session_id uuid, p_placements jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_board jsonb;
  v_racks jsonb;
  v_bag jsonb;
  v_current int;
  v_my_pos int;
  v_participants uuid[];
  v_placement jsonb;
  v_r int;
  v_c int;
  v_letter text;
  v_rack text[];
  v_i int;
  v_word text;
  v_val int;
  v_score int := 0;
  v_letter_vals jsonb := '{"A":1,"B":3,"C":3,"D":2,"E":1,"F":4,"G":2,"H":4,"I":1,"J":8,"K":5,"L":1,"M":3,"N":1,"O":1,"P":3,"Q":10,"R":1,"S":1,"T":1,"U":1,"V":4,"W":4,"X":8,"Y":4,"Z":10}'::jsonb;
  v_new_letters jsonb;
  v_exists boolean;
  v_next_pos int;
  v_other_id uuid;
  v_first_move boolean;
  v_covers_center boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'Placements must be a non-empty array of {r, c, letter}';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'scrabble' then
    raise exception 'Session not found or not Scrabble';
  end if;
  if v_session.status = 'completed' then raise exception 'Game already completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', '') <> 'playing' then
    raise exception 'Game not in play';
  end if;

  select array_agg(user_id order by turn_order_position)
  into v_participants
  from public.game_session_participants
  where session_id = p_session_id and acceptance_state = 'accepted';
  v_current := (coalesce((v_state->>'currentTurnPosition')::int, 0));
  v_my_pos := -1;
  for v_i in 1..array_length(v_participants, 1) loop
    if v_participants[v_i] = v_uid then v_my_pos := v_i - 1; exit; end if;
  end loop;
  if v_my_pos < 0 then raise exception 'You are not a participant'; end if;
  if v_my_pos <> v_current then raise exception 'Not your turn'; end if;

  v_board := v_state->'board';
  v_racks := v_state->'racks';
  v_bag := coalesce(v_state->'tileBag', '[]'::jsonb);

  v_first_move := true;
  for v_r in 0..14 loop
    for v_c in 0..14 loop
      if coalesce(v_board->v_r->>v_c, '') <> '' then v_first_move := false; exit; end if;
    end loop;
    if not v_first_move then exit; end if;
  end loop;

  v_rack := (select array_agg(elem) from jsonb_array_elements_text(coalesce(v_racks->v_my_pos::text, '[]'::jsonb)) as elem);
  v_new_letters := '[]'::jsonb;

  for v_i in 0..jsonb_array_length(p_placements)-1 loop
    v_placement := p_placements->v_i;
    v_r := (v_placement->>'r')::int;
    v_c := (v_placement->>'c')::int;
    v_letter := upper(trim(v_placement->>>'letter'));
    if v_r is null or v_c is null or v_letter is null or v_r < 0 or v_r > 14 or v_c < 0 or v_c > 14 or length(v_letter) <> 1 then
      raise exception 'Invalid placement at index %', v_i;
    end if;
    if coalesce(v_board->v_r->>v_c, '') <> '' then
      raise exception 'Cell (%, %) already has a letter', v_r, v_c;
    end if;
    if not (v_letter = any(v_rack)) then
      raise exception 'Letter % not in your rack', v_letter;
    end if;
    v_rack := array_remove(v_rack, v_letter);
    v_new_letters := v_new_letters || to_jsonb(jsonb_build_object('r', v_r, 'c', v_c, 'letter', v_letter));
  end loop;

  if jsonb_array_length(v_new_letters) = 0 then
    raise exception 'At least one placement required';
  end if;
  if v_first_move and jsonb_array_length(v_new_letters) < 2 then
    raise exception 'First move must place at least two letters';
  end if;

  v_covers_center := false;
  for v_i in 0..jsonb_array_length(v_new_letters)-1 loop
    if (v_new_letters->v_i->>'r')::int = 7 and (v_new_letters->v_i->>'c')::int = 7 then
      v_covers_center := true;
      exit;
    end if;
  end loop;
  if v_first_move and not v_covers_center then
    raise exception 'First move must cover the center square (7,7)';
  end if;

  for v_i in 0..jsonb_array_length(v_new_letters)-1 loop
    v_r := (v_new_letters->v_i->>'r')::int;
    v_c := (v_new_letters->v_i->>'c')::int;
    v_letter := v_new_letters->v_i->>>'letter';
    v_board := jsonb_set(v_board, array[v_r::text, v_c::text], to_jsonb(v_letter));
  end loop;

  declare
    v_r0 int := (v_new_letters->0->>'r')::int;
    v_c0 int := (v_new_letters->0->>'c')::int;
    v_min_c int;
    v_max_c int;
    v_min_r int;
    v_max_r int;
    v_col int;
    v_row int;
  begin
    if (select count(distinct (e->>'r')::int) from jsonb_array_elements(v_new_letters) as e) > 1
       and (select count(distinct (e->>'c')::int) from jsonb_array_elements(v_new_letters) as e) > 1 then
      raise exception 'Placements must be in one row or one column';
    end if;
    select min(c), max(c) into v_min_c, v_max_c from generate_series(0,14) c
    where (v_board->v_r0->>c) is not null and trim(coalesce(v_board->v_r0->>c, '')) <> '';
    if v_min_c is not null and v_max_c - v_min_c >= 1 then
      v_word := (select string_agg(v_board->v_r0->>(c::text), '' order by c) from generate_series(v_min_c, v_max_c) c);
      select exists (select 1 from public.hangman_words where lower(word) = lower(v_word)) into v_exists;
      if not v_exists then raise exception 'Invalid word: %', v_word; end if;
      for v_i in 1..length(v_word) loop
        v_score := v_score + coalesce((v_letter_vals->>upper(substr(v_word, v_i, 1)))::int, 0);
      end loop;
    end if;
    select min(r), max(r) into v_min_r, v_max_r from generate_series(0,14) r
    where (v_board->r->>v_c0) is not null and trim(coalesce(v_board->r->>v_c0, '')) <> '';
    if v_min_r is not null and v_max_r - v_min_r >= 1 then
      v_word := (select string_agg(v_board->r->>(v_c0::text), '' order by r) from generate_series(v_min_r, v_max_r) r);
      select exists (select 1 from public.hangman_words where lower(word) = lower(v_word)) into v_exists;
      if not v_exists then raise exception 'Invalid word: %', v_word; end if;
      for v_i in 1..length(v_word) loop
        v_score := v_score + coalesce((v_letter_vals->>upper(substr(v_word, v_i, 1)))::int, 0);
      end loop;
    end if;
  end;

  v_racks := jsonb_set(v_racks, array[v_my_pos::text], (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from unnest(v_rack) as t));
  while (select jsonb_array_length(v_racks->v_my_pos::text)) < 7 and (select jsonb_array_length(v_bag)) > 0 loop
    v_racks := jsonb_set(v_racks, array[v_my_pos::text], (v_racks->v_my_pos::text) || (v_bag->0));
    v_bag := (select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements(v_bag) with ordinality as t(elem, n) where n > 1);
  end loop;

  v_state := jsonb_set(v_state, array['scores'], jsonb_set(v_state->'scores', array[v_my_pos::text], to_jsonb((coalesce((v_state->'scores'->v_my_pos::text)::int, 0)) + v_score)));
  v_state := jsonb_set(jsonb_set(jsonb_set(v_state, array['board'], v_board), array['racks'], v_racks), array['tileBag'], v_bag);
  v_next_pos := (v_current + 1) % array_length(v_participants, 1);
  v_state := jsonb_set(jsonb_set(v_state, array['currentTurnPosition'], to_jsonb(v_next_pos)), array['passCount'], to_jsonb(0));
  v_other_id := v_participants[v_next_pos+1];

  if (select jsonb_array_length(v_bag)) = 0 and (select jsonb_array_length(v_racks->v_my_pos::text)) = 0 then
    v_state := jsonb_set(v_state, array['phase'], to_jsonb('completed'::text));
    v_state := jsonb_set(v_state, array['winnerPosition'], to_jsonb(v_my_pos));
    update public.game_sessions set state_payload = v_state, status = 'completed', result = 'winner', updated_at = now() where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'move', v_uid, jsonb_build_object('placements', p_placements, 'score', v_score));
    for v_i in 1..array_length(v_participants, 1) loop
      perform public.notify_game_event(v_participants[v_i], 'game_completed', p_session_id, v_uid);
    end loop;
    return;
  end if;

  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload)
  values (p_session_id, 'move', v_uid, jsonb_build_object('placements', p_placements, 'score', v_score));
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

create or replace function public.pass_scrabble_turn(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_state jsonb;
  v_current int;
  v_my_pos int;
  v_participants uuid[];
  v_i int;
  v_pass_count int;
  v_next_pos int;
  v_other_id uuid;
  v_max_score int;
  v_winner_pos int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'scrabble' then
    raise exception 'Session not found or not Scrabble';
  end if;
  if v_session.status = 'completed' then raise exception 'Game already completed'; end if;

  v_state := coalesce(v_session.state_payload, '{}'::jsonb);
  if coalesce(v_state->>'phase', '') <> 'playing' then
    raise exception 'Game not in play';
  end if;

  select array_agg(user_id order by turn_order_position)
  into v_participants
  from public.game_session_participants
  where session_id = p_session_id and acceptance_state = 'accepted';
  v_current := (coalesce((v_state->>'currentTurnPosition')::int, 0));
  v_my_pos := -1;
  for v_i in 1..array_length(v_participants, 1) loop
    if v_participants[v_i] = v_uid then v_my_pos := v_i - 1; exit; end if;
  end loop;
  if v_my_pos < 0 then raise exception 'You are not a participant'; end if;
  if v_my_pos <> v_current then raise exception 'Not your turn'; end if;

  v_pass_count := coalesce((v_state->>'passCount')::int, 0) + 1;
  v_state := jsonb_set(v_state, array['passCount'], to_jsonb(v_pass_count));

  if v_pass_count >= array_length(v_participants, 1) then
    v_state := jsonb_set(v_state, array['phase'], to_jsonb('completed'::text));
    select max((v_state->'scores'->pos::text)::int) into v_max_score from generate_series(0, array_length(v_participants, 1) - 1) as pos;
    select min(pos) into v_winner_pos from generate_series(0, array_length(v_participants, 1) - 1) as pos
    where (v_state->'scores'->pos::text)::int = v_max_score;
    v_state := jsonb_set(v_state, array['winnerPosition'], to_jsonb(v_winner_pos));
    update public.game_sessions set state_payload = v_state, status = 'completed', result = 'winner', updated_at = now() where id = p_session_id;
    for v_i in 1..array_length(v_participants, 1) loop
      perform public.notify_game_event(v_participants[v_i], 'game_completed', p_session_id, v_uid);
    end loop;
    return;
  end if;

  v_next_pos := (v_current + 1) % array_length(v_participants, 1);
  v_state := jsonb_set(v_state, array['currentTurnPosition'], to_jsonb(v_next_pos));
  v_other_id := v_participants[v_next_pos+1];
  update public.game_sessions set state_payload = v_state, updated_at = now() where id = p_session_id;
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

revoke all on function public.start_scrabble_game(uuid) from public;
grant execute on function public.start_scrabble_game(uuid) to authenticated;
revoke all on function public.play_scrabble_word(uuid, jsonb) from public;
grant execute on function public.play_scrabble_word(uuid, jsonb) to authenticated;
revoke all on function public.pass_scrabble_turn(uuid) from public;
grant execute on function public.pass_scrabble_turn(uuid) to authenticated;

-- Hangman: approved internal word list (solo game)
create table if not exists public.hangman_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists idx_hangman_words_word_lower on public.hangman_words(lower(word));
comment on table public.hangman_words is 'Approved word list for solo Hangman games.';

insert into public.hangman_words (word) values
  ('algorithm'), ('buffer'), ('cache'), ('database'), ('export'), ('filter'), ('gateway'), ('handler'),
  ('integer'), ('javascript'), ('keyboard'), ('lambda'), ('module'), ('network'), ('object'), ('parser'),
  ('query'), ('runtime'), ('schema'), ('token'), ('unicode'), ('vector'), ('widget'), ('yield'),
  ('anchor'), ('bridge'), ('cloud'), ('domain'), ('engine'), ('format'), ('graph'), ('header'),
  ('index'), ('join'), ('kernel'), ('layout'), ('matrix'), ('node'), ('offset'), ('packet'),
  ('queue'), ('router'), ('stream'), ('thread'), ('upload'), ('vertex'), ('window'), ('zoom'),
  ('array'), ('binary'), ('cursor'), ('digest'), ('encode'), ('float'), ('global'), ('hash'),
  ('import'), ('journal'), ('lambda'), ('merge'), ('null'), ('output'), ('proxy'), ('random'),
  ('string'), ('tuple'), ('union'), ('value'), ('worker'), ('branch'), ('commit'), ('deploy')
on conflict (word) do nothing;

create or replace function public.get_random_hangman_word()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_word text;
begin
  select word into v_word from public.hangman_words order by random() limit 1;
  return v_word;
end;
$$;
revoke all on function public.get_random_hangman_word() from public;
grant execute on function public.get_random_hangman_word() to authenticated;

-- Notifications for game invitations (invite → recipient; accept/decline/cancel → sender)
create or replace function public.notifications_on_game_invitation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
    values (
      new.recipient_id,
      new.sender_id,
      'game_invite',
      new.session_id,
      'game_session',
      jsonb_build_object('session_id', new.session_id, 'invitation_id', new.id)
    );
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status != old.status then
    if new.status in ('accepted', 'declined') then
      insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
      values (
        new.sender_id,
        new.recipient_id,
        case new.status when 'accepted' then 'game_invite_accepted' else 'game_invite_declined' end,
        new.session_id,
        'game_session',
        jsonb_build_object('session_id', new.session_id, 'invitation_id', new.id)
      );
    end if;
    if new.status = 'canceled' then
      insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
      values (
        new.recipient_id,
        new.sender_id,
        'game_invite_canceled',
        new.session_id,
        'game_session',
        jsonb_build_object('session_id', new.session_id, 'invitation_id', new.id)
      );
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_on_game_invitation on public.game_invitations;
create trigger trg_notifications_on_game_invitation
  after insert or update on public.game_invitations
  for each row execute function public.notifications_on_game_invitation();

-- RPC: insert a game notification (your turn, game completed). Call from app after state/turn/completion changes.
create or replace function public.notify_game_event(
  p_recipient_id uuid,
  p_type text,
  p_session_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_type not in ('game_your_turn', 'game_completed') then
    raise exception 'Invalid type for notify_game_event';
  end if;
  insert into public.notifications (recipient_id, actor_id, type, reference_id, reference_type, payload)
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_session_id,
    'game_session',
    jsonb_build_object('session_id', p_session_id)
  );
end;
$$;

revoke all on function public.notify_game_event(uuid, text, uuid, uuid) from public;
grant execute on function public.notify_game_event(uuid, text, uuid, uuid) to authenticated;

-- Game invitations: only allow inviting connections for tic_tac_toe (and other multiplayer connection-only games)
create or replace function public.game_invitations_connection_check()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_game_type text;
begin
  select gd.game_type into v_game_type
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = new.session_id;
  if v_game_type in ('tic_tac_toe', 'connect_four', 'checkers', 'trivia', 'two_truths_lie', 'would_you_rather', 'darts', 'caption_game', 'battleship', 'reversi', 'scrabble', 'chess') and not public.are_chat_connections(new.sender_id, new.recipient_id) then
    raise exception 'You can only invite Connections to this game.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_game_invitations_connection_check on public.game_invitations;
create trigger trg_game_invitations_connection_check
  before insert on public.game_invitations
  for each row execute function public.game_invitations_connection_check();

-- Tic-Tac-Toe: apply move, detect win/draw, advance turn, notify. state_payload: board (jsonb array 0..8), currentTurnPosition (0=X=creator, 1=O=invitee)
create or replace function public.make_tic_tac_toe_move(p_session_id uuid, p_cell_index int)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_board jsonb;
  v_current int;
  v_marker text;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_winner_position int;
  v_draw boolean;
  v_next_position int;
  v_other_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_cell_index is null or p_cell_index < 0 or p_cell_index > 8 then
    raise exception 'Invalid cell index';
  end if;

  select gs.id, gs.status, gs.state_payload, gs.result, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'tic_tac_toe' then
    raise exception 'Session not found or not Tic-Tac-Toe';
  end if;
  if v_session.result is not null or v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;
  if v_session.status not in ('active', 'waiting_your_move', 'waiting_opponent_move') then
    raise exception 'Game not in play';
  end if;

  v_board := coalesce(v_session.state_payload->'board', '[]'::jsonb);
  if jsonb_array_length(v_board) <> 9 then
    v_board := '["","","","","","","","",""]'::jsonb;
  end if;
  if v_board->p_cell_index is not null and (v_board->>p_cell_index) is not null and trim(v_board->>p_cell_index) <> '' then
    raise exception 'Cell already taken';
  end if;

  v_current := (coalesce((v_session.state_payload->>'currentTurnPosition')::int, 0));
  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';
  if v_current = 0 then
    if v_uid <> v_creator_id then raise exception 'Not your turn'; end if;
    v_marker := 'X';
  else
    if v_uid <> v_invitee_id then raise exception 'Not your turn'; end if;
    v_marker := 'O';
  end if;

  v_board := jsonb_set(v_board, array[p_cell_index::text], to_jsonb(v_marker));

  -- Win check: rows 012, 345, 678; cols 036, 147, 258; diag 048, 246
  v_winner_position := -1;
  if (v_board->>0 = v_marker and v_board->>1 = v_marker and v_board->>2 = v_marker) or
     (v_board->>3 = v_marker and v_board->>4 = v_marker and v_board->>5 = v_marker) or
     (v_board->>6 = v_marker and v_board->>7 = v_marker and v_board->>8 = v_marker) or
     (v_board->>0 = v_marker and v_board->>3 = v_marker and v_board->>6 = v_marker) or
     (v_board->>1 = v_marker and v_board->>4 = v_marker and v_board->>7 = v_marker) or
     (v_board->>2 = v_marker and v_board->>5 = v_marker and v_board->>8 = v_marker) or
     (v_board->>0 = v_marker and v_board->>4 = v_marker and v_board->>8 = v_marker) or
     (v_board->>2 = v_marker and v_board->>4 = v_marker and v_board->>6 = v_marker) then
    v_winner_position := v_current;
  end if;

  v_draw := (v_winner_position < 0) and (
    (v_board->>0) <> '' and (v_board->>1) <> '' and (v_board->>2) <> '' and
    (v_board->>3) <> '' and (v_board->>4) <> '' and (v_board->>5) <> '' and
    (v_board->>6) <> '' and (v_board->>7) <> '' and (v_board->>8) <> ''
  );

  if v_winner_position >= 0 then
    v_other_id := case when v_current = 0 then v_invitee_id else v_creator_id end;
    update public.game_sessions
    set status = 'completed', result = 'winner',
        state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current, 'winnerTurnPosition', v_winner_position),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('cell', p_cell_index, 'marker', v_marker, 'winner_position', v_winner_position));
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;
  if v_draw then
    update public.game_sessions
    set status = 'completed', result = 'draw', state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('cell', p_cell_index, 'marker', v_marker, 'draw', true));
    perform public.notify_game_event(v_creator_id, 'game_completed', p_session_id, v_uid);
    perform public.notify_game_event(v_invitee_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;

  v_next_position := 1 - v_current;
  v_other_id := case when v_next_position = 0 then v_creator_id else v_invitee_id end;
  update public.game_sessions
  set status = 'waiting_opponent_move',
      state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_next_position),
      updated_at = now()
  where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload)
  values (p_session_id, 'move', v_uid, jsonb_build_object('cell', p_cell_index, 'marker', v_marker));
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

revoke all on function public.make_tic_tac_toe_move(uuid, int) from public;
grant execute on function public.make_tic_tac_toe_move(uuid, int) to authenticated;

-- Connect 4: 6 rows x 7 columns; board[row][col] row 0 = top. state_payload: board (6 arrays of 7), currentTurnPosition, winningLine (optional)
create or replace function public.make_connect_four_move(p_session_id uuid, p_column int)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_board jsonb;
  v_row int;
  v_r int;
  v_c int;
  v_current int;
  v_marker text;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_other_id uuid;
  v_next_position int;
  v_cell_val text;
  v_win boolean := false;
  v_win_line jsonb := '[]'::jsonb;
  v_draw boolean := false;
  v_filled int;
  v_i int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_column is null or p_column < 0 or p_column > 6 then
    raise exception 'Invalid column (0-6)';
  end if;

  select gs.id, gs.status, gs.state_payload, gs.result, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'connect_four' then
    raise exception 'Session not found or not Connect 4';
  end if;
  if v_session.result is not null or v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;
  if v_session.status not in ('active', 'waiting_your_move', 'waiting_opponent_move') then
    raise exception 'Game not in play';
  end if;

  v_board := coalesce(v_session.state_payload->'board', null);
  if v_board is null or jsonb_array_length(v_board) <> 6 then
    v_board := '[[ "","","","","","","" ],
      [ "","","","","","","" ],
      [ "","","","","","","" ],
      [ "","","","","","","" ],
      [ "","","","","","","" ],
      [ "","","","","","","" ]]'::jsonb;
  end if;

  -- Find lowest empty row in column p_column (row 5 = bottom)
  v_row := -1;
  v_r := 5;
  while v_r >= 0 loop
    v_cell_val := v_board->v_r->>p_column;
    if v_cell_val is null or trim(coalesce(v_cell_val, '')) = '' then
      v_row := v_r;
      exit;
    end if;
    v_r := v_r - 1;
  end loop;
  if v_row < 0 then
    raise exception 'Column is full';
  end if;

  v_current := (coalesce((v_session.state_payload->>'currentTurnPosition')::int, 0));
  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';
  if v_current = 0 then
    if v_uid <> v_creator_id then raise exception 'Not your turn'; end if;
    v_marker := 'X';
  else
    if v_uid <> v_invitee_id then raise exception 'Not your turn'; end if;
    v_marker := 'O';
  end if;

  v_board := jsonb_set(v_board, array[v_row::text, p_column::text], to_jsonb(v_marker));

  -- Win check: horizontal, vertical, two diagonals (4 in a row)
  for v_r in 0..5 loop
    for v_c in 0..3 loop
      if (v_board->v_r->>v_c) = v_marker and (v_board->v_r->>(v_c+1)) = v_marker
         and (v_board->v_r->>(v_c+2)) = v_marker and (v_board->v_r->>(v_c+3)) = v_marker then
        v_win := true;
        v_win_line := jsonb_build_array(
          jsonb_build_array(v_r, v_c), jsonb_build_array(v_r, v_c+1),
          jsonb_build_array(v_r, v_c+2), jsonb_build_array(v_r, v_c+3));
        exit;
      end if;
    end loop;
    if v_win then exit; end if;
  end loop;
  if not v_win then
    for v_r in 0..2 loop
      for v_c in 0..6 loop
        if (v_board->v_r->>v_c) = v_marker and (v_board->(v_r+1)->>v_c) = v_marker
           and (v_board->(v_r+2)->>v_c) = v_marker and (v_board->(v_r+3)->>v_c) = v_marker then
          v_win := true;
          v_win_line := jsonb_build_array(
            jsonb_build_array(v_r, v_c), jsonb_build_array(v_r+1, v_c),
            jsonb_build_array(v_r+2, v_c), jsonb_build_array(v_r+3, v_c));
          exit;
        end if;
      end loop;
      if v_win then exit; end if;
    end loop;
  end if;
  if not v_win then
    for v_r in 0..2 loop
      for v_c in 0..3 loop
        if (v_board->v_r->>v_c) = v_marker and (v_board->(v_r+1)->>(v_c+1)) = v_marker
           and (v_board->(v_r+2)->>(v_c+2)) = v_marker and (v_board->(v_r+3)->>(v_c+3)) = v_marker then
          v_win := true;
          v_win_line := jsonb_build_array(
            jsonb_build_array(v_r, v_c), jsonb_build_array(v_r+1, v_c+1),
            jsonb_build_array(v_r+2, v_c+2), jsonb_build_array(v_r+3, v_c+3));
          exit;
        end if;
      end loop;
      if v_win then exit; end if;
    end loop;
  end if;
  if not v_win then
    for v_r in 0..2 loop
      for v_c in 3..6 loop
        if (v_board->v_r->>v_c) = v_marker and (v_board->(v_r+1)->>(v_c-1)) = v_marker
           and (v_board->(v_r+2)->>(v_c-2)) = v_marker and (v_board->(v_r+3)->>(v_c-3)) = v_marker then
          v_win := true;
          v_win_line := jsonb_build_array(
            jsonb_build_array(v_r, v_c), jsonb_build_array(v_r+1, v_c-1),
            jsonb_build_array(v_r+2, v_c-2), jsonb_build_array(v_r+3, v_c-3));
          exit;
        end if;
      end loop;
      if v_win then exit; end if;
    end loop;
  end if;

  v_filled := 0;
  for v_r in 0..5 loop
    for v_c in 0..6 loop
      v_cell_val := v_board->v_r->>v_c;
      if v_cell_val is not null and trim(v_cell_val) <> '' then v_filled := v_filled + 1; end if;
    end loop;
  end loop;
  v_draw := (not v_win) and (v_filled >= 42);

  if v_win then
    v_other_id := case when v_current = 0 then v_invitee_id else v_creator_id end;
    update public.game_sessions
    set status = 'completed', result = 'winner',
        state_payload = jsonb_build_object(
          'board', v_board, 'currentTurnPosition', v_current,
          'winnerTurnPosition', v_current, 'winningLine', v_win_line),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('column', p_column, 'row', v_row, 'marker', v_marker, 'winningLine', v_win_line));
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;
  if v_draw then
    update public.game_sessions
    set status = 'completed', result = 'draw',
        state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('column', p_column, 'row', v_row, 'marker', v_marker, 'draw', true));
    perform public.notify_game_event(v_creator_id, 'game_completed', p_session_id, v_uid);
    perform public.notify_game_event(v_invitee_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;

  v_next_position := 1 - v_current;
  v_other_id := case when v_next_position = 0 then v_creator_id else v_invitee_id end;
  update public.game_sessions
  set status = 'waiting_opponent_move',
      state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_next_position),
      updated_at = now()
  where id = p_session_id;
  insert into public.game_events (session_id, event_type, actor_id, payload)
  values (p_session_id, 'move', v_uid, jsonb_build_object('column', p_column, 'row', v_row, 'marker', v_marker));
  perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
end;
$$;

revoke all on function public.make_connect_four_move(uuid, int) from public;
grant execute on function public.make_connect_four_move(uuid, int) to authenticated;

-- Checkers: 8x8, dark squares (r+c) odd. x/X = creator (bottom, moves up), o/O = invitee (top, moves down). King row: 0 for x, 7 for o.
create or replace function public.make_checkers_move(
  p_session_id uuid,
  p_from_r int,
  p_from_c int,
  p_to_r int,
  p_to_c int
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_session record;
  v_board jsonb;
  v_current int;
  v_creator_id uuid;
  v_invitee_id uuid;
  v_other_id uuid;
  v_piece text;
  v_dr int;
  v_dc int;
  v_mid_r int;
  v_mid_c int;
  v_mid_piece text;
  v_opponent text;
  v_my_pieces text[];
  v_is_king boolean;
  v_king_row int;
  v_can_capture_again boolean := false;
  v_any_capture boolean := false;
  v_r int;
  v_c int;
  v_nr int;
  v_nc int;
  v_cont_from jsonb;
  v_opp_count int := 0;
  v_i int;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_from_r is null or p_from_r < 0 or p_from_r > 7 or p_from_c < 0 or p_from_c > 7
     or p_to_r < 0 or p_to_r > 7 or p_to_c < 0 or p_to_c > 7 then
    raise exception 'Invalid coordinates';
  end if;
  if (p_to_r + p_to_c) % 2 <> 1 then
    raise exception 'Target must be a dark square';
  end if;

  select gs.id, gs.status, gs.state_payload, gd.game_type
  into v_session
  from public.game_sessions gs
  join public.game_definitions gd on gd.id = gs.game_definition_id
  where gs.id = p_session_id;
  if v_session.id is null or v_session.game_type <> 'checkers' then
    raise exception 'Session not found or not Checkers';
  end if;
  if v_session.result is not null or v_session.status = 'completed' then
    raise exception 'Game already completed';
  end if;
  if v_session.status not in ('active', 'waiting_your_move', 'waiting_opponent_move') then
    raise exception 'Game not in play';
  end if;

  v_board := v_session.state_payload->'board';
  if v_board is null or jsonb_array_length(v_board) <> 8 then
    v_board := '[
      ["","o","","o","","o","","o"],
      ["o","","o","","o","","o",""],
      ["","o","","o","","o","","o"],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["x","","x","","x","","x",""],
      ["","x","","x","","x","","x"],
      ["x","","x","","x","","x",""]
    ]'::jsonb;
  end if;

  v_current := coalesce((v_session.state_payload->>'currentTurnPosition')::int, 0);
  v_cont_from := v_session.state_payload->'mustContinueFrom';
  if v_cont_from is not null and jsonb_array_length(v_cont_from) = 2 then
    if (p_from_r <> (v_cont_from->>0)::int or p_from_c <> (v_cont_from->>1)::int) then
      raise exception 'You must continue capturing with the piece that just jumped';
    end if;
  end if;

  select p1.user_id, p2.user_id into v_creator_id, v_invitee_id
  from public.game_session_participants p1
  join public.game_session_participants p2 on p2.session_id = p1.session_id and p2.user_id <> p1.user_id
  where p1.session_id = p_session_id and p1.role = 'creator' and p2.role = 'invitee';

  if v_current = 0 then
    if v_uid <> v_creator_id then raise exception 'Not your turn'; end if;
    v_my_pieces := array['x', 'X'];
    v_opponent := 'o';
    v_king_row := 0;
  else
    if v_uid <> v_invitee_id then raise exception 'Not your turn'; end if;
    v_my_pieces := array['o', 'O'];
    v_opponent := 'x';
    v_king_row := 7;
  end if;

  v_piece := trim(coalesce(v_board->p_from_r->>p_from_c, ''));
  if v_piece is null or v_piece = '' or not (v_piece = any(v_my_pieces)) then
    raise exception 'No piece of yours at that position';
  end if;
  if trim(coalesce(v_board->p_to_r->>p_to_c, '')) <> '' then
    raise exception 'Target square is not empty';
  end if;

  v_dr := p_to_r - p_from_r;
  v_dc := p_to_c - p_from_c;
  if abs(v_dr) <> abs(v_dc) or abs(v_dr) not in (1, 2) then
    raise exception 'Invalid move: must be diagonal, one or two steps';
  end if;

  v_is_king := (v_piece = 'X' or v_piece = 'O');
  if not v_is_king then
    if v_current = 0 and v_dr >= 0 then raise exception 'Regular pieces move upward only'; end if;
    if v_current = 1 and v_dr <= 0 then raise exception 'Regular pieces move downward only'; end if;
  end if;

  if abs(v_dr) = 2 then
    v_mid_r := p_from_r + v_dr / 2;
    v_mid_c := p_from_c + v_dc / 2;
    v_mid_piece := trim(coalesce(v_board->v_mid_r->>v_mid_c, ''));
    if v_mid_piece is null or v_mid_piece = '' or v_mid_piece not in ('x','X','o','O') then
      raise exception 'Jump requires an opponent piece to capture';
    end if;
    if (v_current = 0 and v_mid_piece not in ('o','O')) or (v_current = 1 and v_mid_piece not in ('x','X')) then
      raise exception 'Can only capture opponent pieces';
    end if;
    v_board := jsonb_set(v_board, array[v_mid_r::text, v_mid_c::text], to_jsonb(''));
  else
    for v_r in 0..7 loop
      for v_c in 0..7 loop
        v_piece := trim(coalesce(v_board->v_r->>v_c, ''));
        if v_piece = any(v_my_pieces) then
          for v_nr in v_r-2..v_r+2 loop
            for v_nc in v_c-2..v_c+2 loop
              if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 and abs(v_nr-v_r)=2 and abs(v_nc-v_c)=2 then
                if (v_nr+v_nc)%2=1 and trim(coalesce(v_board->v_nr->>v_nc,'')) = '' then
                  v_mid_piece := trim(coalesce(v_board->(v_r+(v_nr-v_r)/2)->>(v_c+(v_nc-v_c)/2), ''));
                  if v_mid_piece in ('x','X','o','O') and (
                    (v_current=0 and v_mid_piece in ('o','O')) or (v_current=1 and v_mid_piece in ('x','X'))
                  ) then
                    v_any_capture := true;
                    exit;
                  end if;
                end if;
              end if;
            end loop;
            if v_any_capture then exit; end if;
          end loop;
        end if;
        if v_any_capture then exit; end if;
      end loop;
      if v_any_capture then exit; end if;
    end loop;
    if v_any_capture then
      raise exception 'You must capture when a jump is available';
    end if;
  end if;

  v_board := jsonb_set(v_board, array[p_from_r::text, p_from_c::text], to_jsonb(''));
  if p_to_r = v_king_row then
    v_board := jsonb_set(v_board, array[p_to_r::text, p_to_c::text], to_jsonb(case v_current when 0 then 'X' else 'O' end));
  else
    v_board := jsonb_set(v_board, array[p_to_r::text, p_to_c::text], to_jsonb(case v_current when 0 then 'x' else 'o' end));
  end if;

  if abs(v_dr) = 2 then
    for v_nr in p_to_r-2..p_to_r+2 loop
      for v_nc in p_to_c-2..p_to_c+2 loop
        if v_nr >= 0 and v_nr <= 7 and v_nc >= 0 and v_nc <= 7 and abs(v_nr-p_to_r)=2 and abs(v_nc-p_to_c)=2 then
          if (v_nr+v_nc)%2=1 and trim(coalesce(v_board->v_nr->>v_nc,'')) = '' then
            v_mid_piece := trim(coalesce(v_board->(p_to_r+(v_nr-p_to_r)/2)->>(p_to_c+(v_nc-p_to_c)/2), ''));
            if v_mid_piece in ('x','X','o','O') and (
              (v_current=0 and v_mid_piece in ('o','O')) or (v_current=1 and v_mid_piece in ('x','X'))
            ) then
              v_can_capture_again := true;
              exit;
            end if;
          end if;
        end if;
      end loop;
      if v_can_capture_again then exit; end if;
    end loop;
  end if;

  for v_r in 0..7 loop
    for v_c in 0..7 loop
      v_piece := trim(coalesce(v_board->v_r->>v_c, ''));
      if (v_current=0 and v_piece in ('o','O')) or (v_current=1 and v_piece in ('x','X')) then
        v_opp_count := v_opp_count + 1;
      end if;
    end loop;
  end loop;

  if v_opp_count = 0 then
    update public.game_sessions
    set status = 'completed', result = 'winner',
        state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current, 'winnerTurnPosition', v_current),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'completion', v_uid, jsonb_build_object('from', array[p_from_r, p_from_c], 'to', array[p_to_r, p_to_c]));
    v_other_id := case when v_current = 0 then v_invitee_id else v_creator_id end;
    perform public.notify_game_event(v_other_id, 'game_completed', p_session_id, v_uid);
    return;
  end if;

  if v_can_capture_again then
    update public.game_sessions
    set state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', v_current, 'mustContinueFrom', jsonb_build_array(p_to_r, p_to_c)),
        updated_at = now()
    where id = p_session_id;
  else
    v_other_id := case when (1 - v_current) = 0 then v_creator_id else v_invitee_id end;
    update public.game_sessions
    set status = 'waiting_opponent_move',
        state_payload = jsonb_build_object('board', v_board, 'currentTurnPosition', 1 - v_current),
        updated_at = now()
    where id = p_session_id;
    insert into public.game_events (session_id, event_type, actor_id, payload)
    values (p_session_id, 'move', v_uid, jsonb_build_object('from', array[p_from_r, p_from_c], 'to', array[p_to_r, p_to_c]));
    perform public.notify_game_event(v_other_id, 'game_your_turn', p_session_id, v_uid);
  end if;
end;
$$;

revoke all on function public.make_checkers_move(uuid, int, int, int, int) from public;
grant execute on function public.make_checkers_move(uuid, int, int, int, int) to authenticated;
