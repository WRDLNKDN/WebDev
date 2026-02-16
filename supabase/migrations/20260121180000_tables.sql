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
drop function if exists public.are_chat_connections(uuid, uuid) cascade;
drop function if exists public.chat_blocked(uuid, uuid) cascade;
drop function if exists public.chat_can_message_in_room(uuid, uuid) cascade;
drop function if exists public.is_chat_moderator() cascade;
drop function if exists public.chat_is_room_member(uuid) cascade;
drop function if exists public.chat_is_room_admin(uuid) cascade;
drop function if exists public.chat_create_group(text, uuid[]) cascade;
drop function if exists public.chat_set_original_admin() cascade;
drop function if exists public.chat_on_member_removed() cascade;
drop function if exists public.chat_on_suspension() cascade;
drop function if exists public.chat_on_unsuspend() cascade;
drop function if exists public.chat_rate_limit_check() cascade;
drop function if exists public.chat_audit_on_message() cascade;
drop function if exists public.get_directory_page(uuid, text, text, text, text[], text, text, int, int) cascade;

-- -----------------------------
-- Drop tables (reverse dependency order)
-- -----------------------------
drop table if exists public.chat_moderators cascade;
drop table if exists public.chat_audit_log cascade;
drop table if exists public.chat_read_receipts cascade;
drop table if exists public.chat_message_reactions cascade;
drop table if exists public.chat_message_attachments cascade;
drop table if exists public.chat_reports cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.chat_room_members cascade;
drop table if exists public.chat_blocks cascade;
drop table if exists public.chat_suspensions cascade;
drop table if exists public.chat_rooms cascade;
drop table if exists public.feed_items cascade;
drop table if exists public.feed_connections cascade;
drop table if exists public.connection_requests cascade;
drop table if exists public.portfolio_items cascade;
drop table if exists public.weirdlings cascade;
drop table if exists public.generation_jobs cascade;
drop table if exists public.profiles cascade;
drop table if exists public.admin_allowlist cascade;
drop table if exists public.feed_advertisers cascade;

-- -----------------------------
-- Admin allowlist (NO RLS; grants in rls.sql)
-- -----------------------------
create table public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

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
  industry text,
  location text,
  profile_visibility text not null default 'members_only'
    check (profile_visibility in ('members_only', 'connections_only')),
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
create index idx_profiles_industry on public.profiles(industry) where industry is not null;
create index idx_profiles_location on public.profiles(location) where location is not null;
create index idx_profiles_last_active_at on public.profiles(last_active_at desc nulls last);

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
-- portfolio_items (dashboard projects)
-- -----------------------------
create table public.portfolio_items (
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

create index idx_portfolio_items_owner_id on public.portfolio_items(owner_id);

comment on table public.portfolio_items is
  'User portfolio projects (dashboard).';

create trigger trg_portfolio_items_updated_at
before update on public.portfolio_items
for each row
execute function public.set_updated_at();

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

-- -----------------------------
-- connection_requests (Directory: Connect flow -> accept/decline -> mutual feed_connections)
-- -----------------------------
create table public.connection_requests (
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

create index idx_connection_requests_requester on public.connection_requests(requester_id);
create index idx_connection_requests_recipient on public.connection_requests(recipient_id);
create index idx_connection_requests_status on public.connection_requests(status) where status = 'pending';

comment on table public.connection_requests is
  'Connection requests: pending until accepted (creates mutual feed_connections) or declined.';

create trigger trg_connection_requests_updated_at
  before update on public.connection_requests
  for each row execute function public.set_updated_at();

-- -----------------------------
-- feed_advertisers: Ads shown every 6th post in Feed. Admin-managed.
-- -----------------------------
create table public.feed_advertisers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  title text not null,
  description text not null,
  url text not null,
  logo_url text,
  links jsonb default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_feed_advertisers_active_order
  on public.feed_advertisers(active, sort_order)
  where active = true;

create trigger trg_feed_advertisers_updated_at
  before update on public.feed_advertisers
  for each row execute function public.set_updated_at();

comment on table public.feed_advertisers is
  'Advertisers displayed in Feed every 6th post. Admin CRUD.';

-- Seed Nettica VPN (idempotent: only if empty)
insert into public.feed_advertisers (
  company_name, title, description, url, logo_url, links, active, sort_order
)
select
  'NETTICA CORPORATION',
  'Welcome to Nettica VPN',
  'We provide fast, secure connections using the latest VPN software. Secure Relay and Tunnel VPN services powered by WireGuard technology.',
  'https://www.nettica.com',
  null,
  '[
    {"label":"Downloads","url":"https://www.nettica.com"},
    {"label":"Nettica VPN Performance","url":"https://www.nettica.com"},
    {"label":"API","url":"https://www.nettica.com"},
    {"label":"Getting Started","url":"https://www.nettica.com"},
    {"label":"Launch a Cloud Instance","url":"https://www.nettica.com"},
    {"label":"Enterprise","url":"https://www.nettica.com"}
  ]'::jsonb,
  true,
  0
where not exists (select 1 from public.feed_advertisers limit 1);

-- -----------------------------
-- Feed items
-- -----------------------------
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
-- get_feed_page (cursor-based pagination; used by backend API; includes engagement counts)
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
  actor_avatar text,
  like_count bigint,
  viewer_liked boolean,
  comment_count bigint
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
    end)::text as actor_avatar,
    coalesce(stats.like_cnt, 0::bigint),
    coalesce(stats.viewer_liked, false),
    coalesce(stats.comment_cnt, 0::bigint)
  from public.feed_items fi
  left join public.profiles p on p.id = fi.user_id
  left join public.weirdlings w on w.user_id = fi.user_id and w.is_active = true
  left join lateral (
    select
      count(*) filter (where r.payload->>'type' = 'like') as like_cnt,
      count(*) filter (where r.payload->>'type' = 'comment') as comment_cnt,
      exists (
        select 1 from public.feed_items r2
        where r2.parent_id = fi.id and r2.kind = 'reaction'
          and r2.payload->>'type' = 'like' and r2.user_id = p_viewer_id
      ) as viewer_liked
    from public.feed_items r
    where r.parent_id = fi.id and r.kind = 'reaction'
  ) stats on true
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
  'Returns feed items for viewer (self + followees) with cursor and engagement counts.';

-- -----------------------------
-- get_directory_page (Directory: paginated, searchable, filterable, connection-aware)
-- -----------------------------
create or replace function public.get_directory_page(
  p_viewer_id uuid,
  p_search text default null,
  p_industry text default null,
  p_location text default null,
  p_skills text[] default null,
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
  location text,
  skills text[],
  bio_snippet text,
  connection_state text,
  use_weirdling_avatar boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_sql text;
  v_skills_arr text[];
  v_search_trim text;
begin
  if p_viewer_id is null then
    return;
  end if;

  v_search_trim := nullif(trim(p_search), '');
  v_skills_arr := coalesce(p_skills, '{}');

  return query
  with visible as (
    select p.id, p.handle, p.display_name, p.avatar, p.tagline, p.pronouns,
           p.industry, p.location, p.nerd_creds, p.created_at, p.last_active_at,
           p.profile_visibility, p.use_weirdling_avatar,
           w.avatar_url as weirdling_avatar
    from public.profiles p
    left join public.weirdlings w on w.user_id = p.id and w.is_active = true
    where p.status = 'approved'
      and p.id != p_viewer_id
      and (
        p.profile_visibility = 'members_only'
        or exists (
          select 1 from public.feed_connections fc
          where (fc.user_id = p_viewer_id and fc.connected_user_id = p.id)
             or (fc.user_id = p.id and fc.connected_user_id = p_viewer_id)
        )
      )
      and (
        v_search_trim is null
        or p.display_name ilike '%' || v_search_trim || '%'
        or p.handle ilike '%' || v_search_trim || '%'
        or p.tagline ilike '%' || v_search_trim || '%'
        or coalesce(p.industry, '') ilike '%' || v_search_trim || '%'
        or coalesce(p.location, '') ilike '%' || v_search_trim || '%'
        or coalesce(p.nerd_creds->>'bio', '') ilike '%' || v_search_trim || '%'
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where s ilike '%' || v_search_trim || '%'
        )
      )
      and (p_industry is null or p.industry ilike '%' || trim(p_industry) || '%')
      and (p_location is null or p.location ilike '%' || trim(p_location) || '%')
      and (
        array_length(v_skills_arr, 1) is null
        or exists (
          select 1 from jsonb_array_elements_text(coalesce(p.nerd_creds->'skills', '[]'::jsonb)) s
          where lower(s) = any(
            select lower(unnest(v_skills_arr))
          )
        )
      )
  ),
  conn_state as (
    select v.id,
           case
             when exists (
               select 1 from public.feed_connections fc
               where fc.user_id = p_viewer_id and fc.connected_user_id = v.id
                 and exists (
                   select 1 from public.feed_connections fc2
                   where fc2.user_id = v.id and fc2.connected_user_id = p_viewer_id
                 )
             ) then 'connected'
             when exists (
               select 1 from public.connection_requests cr
               where cr.requester_id = p_viewer_id and cr.recipient_id = v.id
                 and cr.status = 'pending'
             ) then 'pending'
             when exists (
               select 1 from public.connection_requests cr
               where cr.requester_id = v.id and cr.recipient_id = p_viewer_id
                 and cr.status = 'pending'
             ) then 'pending_received'
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
    v.location,
    (
      select coalesce(array_agg(t.val), '{}')
      from (select s::text as val from jsonb_array_elements_text(coalesce(v.nerd_creds->'skills', '[]'::jsonb)) s limit 3) t
    ) as skills,
    left(coalesce(v.nerd_creds->>'bio', ''), 120) as bio_snippet,
    cs.state as connection_state,
    coalesce(v.use_weirdling_avatar, false) as use_weirdling_avatar
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
end;
$$;

comment on function public.get_directory_page is
  'Directory listing: searchable, filterable, connection-aware, privacy-respecting.';

-- -----------------------------
-- Chat: rooms, members, messages, reactions, attachments, blocks, reports
-- -----------------------------
create table public.chat_moderators (
  email text primary key,
  created_at timestamptz not null default now()
);

revoke all on table public.chat_moderators from anon, authenticated;

create table public.chat_rooms (
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

create index idx_chat_rooms_original_admin_id on public.chat_rooms(original_admin_id);

create index idx_chat_rooms_created_by on public.chat_rooms(created_by);
create index idx_chat_rooms_room_type on public.chat_rooms(room_type);

comment on table public.chat_rooms is 'Chat rooms: 1:1 (dm) or invite-only group (max 100 members).';

create table public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);

create index idx_chat_room_members_user_id on public.chat_room_members(user_id);
create index idx_chat_room_members_room_id on public.chat_room_members(room_id);

comment on table public.chat_room_members is 'Membership: admin (creator for groups), member. left_at set when user leaves.';

create table public.chat_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id != blocked_user_id)
);

create index idx_chat_blocks_blocker_id on public.chat_blocks(blocker_id);
create index idx_chat_blocks_blocked_user_id on public.chat_blocks(blocked_user_id);

comment on table public.chat_blocks is 'User blocks: disables chat contact both directions.';

create table public.chat_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suspended_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_chat_suspensions_user_id on public.chat_suspensions(user_id);

comment on table public.chat_suspensions is 'Chat-only suspension by moderator. Platform suspension via profiles.status.';

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text,
  is_system_message boolean not null default false,
  is_deleted boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_room_id on public.chat_messages(room_id);
create index idx_chat_messages_room_created on public.chat_messages(room_id, created_at desc);
create index idx_chat_messages_sender_id on public.chat_messages(sender_id);

comment on table public.chat_messages is 'Chat messages. is_deleted=true shows placeholder. sender_id null when anonymized.';

create table public.chat_message_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index idx_chat_message_reactions_message_id on public.chat_message_reactions(message_id);

create table public.chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

create index idx_chat_message_attachments_message_id on public.chat_message_attachments(message_id);

comment on table public.chat_message_attachments is 'Attachments: max 6MB per file, 5 per message, allowlist enforced in app.';

create table public.chat_read_receipts (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index idx_chat_read_receipts_user_id on public.chat_read_receipts(user_id);

comment on table public.chat_read_receipts is 'Read receipts (1:1 rooms only per spec).';

create table public.chat_reports (
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

create index idx_chat_reports_reporter_id on public.chat_reports(reporter_id);
create index idx_chat_reports_status on public.chat_reports(status);

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

create trigger trg_chat_set_original_admin
before insert on public.chat_rooms
for each row
execute function public.chat_set_original_admin();

-- Enable Realtime for chat_messages (presence, typing, live updates)
alter publication supabase_realtime add table public.chat_messages;

-- updated_at for chat_rooms
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

create trigger trg_chat_messages_rate_limit
before insert on public.chat_messages
for each row
execute function public.chat_rate_limit_check();

-- -----------------------------
-- Chat: audit log (90-day retention per spec)
-- -----------------------------
create table public.chat_audit_log (
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

create index idx_chat_audit_log_created_at on public.chat_audit_log(created_at);
create index idx_chat_audit_log_actor_id on public.chat_audit_log(actor_id);
create index idx_chat_audit_log_room_id on public.chat_audit_log(room_id);

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

create trigger trg_chat_audit_on_message
after insert or update on public.chat_messages
for each row
execute function public.chat_audit_on_message();

-- -----------------------------
-- Storage: avatars bucket (public so profile images load via URL)
-- -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
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

-- chat-attachments (6MB, allowlist: jpg, png, webp, gif, pdf, doc, docx, txt)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  6291456,
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


