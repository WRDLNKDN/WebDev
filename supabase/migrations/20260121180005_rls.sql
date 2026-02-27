-- supabase/migrations/20260121180005_rls.sql
-- All RLS policies and privileges (tables/functions defined in 20260121180000_tables.sql).
--
-- If you see "duplicate key" or migration repair needed for 20260214140000, 20260214160000, 20260214170000:
--   supabase migration repair <id> --status reverted
-- Then run db push again. (Those were consolidated into these two files only.)
--
-- HOW TO FORCE RLS RECONFIGURE (when db push says "up to date" but schema is wrong):
--
-- OPTION A: Run manually in Supabase Dashboard → SQL Editor
-- 1. Open project (UAT: lgxwseyzoefxggxijatp, PROD: rpcaazmxymymqdejevtb)
-- 2. SQL Editor → New query
-- 3. Run 20260121180000_tables.sql first (if tables are missing)
-- 4. Paste this ENTIRE file and Run
--
-- OPTION B: CLI repair + push (re-applies this migration)
--   supabase link --project-ref lgxwseyzoefxggxijatp
--   supabase migration repair 20260121180005 --status reverted
--   supabase db push --linked --include-all --include-seed

-- -----------------------------
-- Optional: feed_advertisers.image_url (idempotent for existing DBs)
-- -----------------------------
alter table public.feed_advertisers add column if not exists image_url text;
alter table public.feed_items add column if not exists edited_at timestamptz;

-- Optional: community_partners table (idempotent for existing DBs)
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

-- Optional: feed_ad_events table (idempotent for existing DBs)
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

-- Optional: feed-ad-images bucket (idempotent; 50MB; null = no MIME restriction)
-- -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feed-ad-images', 'feed-ad-images', true, 52428800, null)
on conflict (id) do update set public = excluded.public, file_size_limit = 52428800, allowed_mime_types = null;

-- Optional: advertiser-inquiry-assets bucket (idempotent; 5MB; PNG/SVG only; private)
-- -----------------------------
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

-- Optional: profiles status default + backfill (remove moderation)
-- -----------------------------
update public.profiles set status = 'approved' where status = 'pending';
alter table public.profiles alter column status set default 'approved';

-- Optional: add use_weirdling_avatar if missing (idempotent for existing DBs)
-- -----------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'use_weirdling_avatar'
  ) then
    alter table public.profiles add column use_weirdling_avatar boolean not null default false;
  end if;
end $$;

-- -----------------------------
-- Optional: add directory columns to profiles if missing (idempotent for existing DBs)
-- -----------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'industry') then
    alter table public.profiles add column industry text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'location') then
    alter table public.profiles add column location text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_visibility') then
    alter table public.profiles add column profile_visibility text not null default 'members_only'
      check (profile_visibility in ('members_only', 'connections_only'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_active_at') then
    alter table public.profiles add column last_active_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'feed_view_preference') then
    alter table public.profiles add column feed_view_preference text not null default 'anyone' check (feed_view_preference in ('anyone', 'connections'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_opt_in') then
    alter table public.profiles add column marketing_opt_in boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_opt_in_timestamp') then
    alter table public.profiles add column marketing_opt_in_timestamp timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_opt_in_ip') then
    alter table public.profiles add column marketing_opt_in_ip text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_source') then
    alter table public.profiles add column marketing_source text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_product_updates') then
    alter table public.profiles add column marketing_product_updates boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'marketing_events') then
    alter table public.profiles add column marketing_events boolean not null default false;
  end if;
end $$;

-- Directory indexes (idempotent)
create index if not exists idx_profiles_industry on public.profiles(industry) where industry is not null;
create index if not exists idx_profiles_location on public.profiles(location) where location is not null;
create index if not exists idx_profiles_last_active_at on public.profiles(last_active_at desc nulls last);

-- Reaction index (idempotent)
create unique index if not exists idx_feed_items_reaction_user_post
  on public.feed_items (parent_id, user_id)
  where kind = 'reaction'
    and payload->>'type' in ('like', 'love', 'inspiration', 'care');

-- -----------------------------
-- Profile required fields (data integrity, idempotent)
-- -----------------------------
update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), handle, 'User')
where status = 'approved'
  and (display_name is null or length(trim(display_name)) = 0);

update public.profiles
set handle = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where length(trim(handle)) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_handle_not_blank' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_handle_not_blank
      check (length(trim(handle)) > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_approved_has_display_name' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_approved_has_display_name
      check (
        status != 'approved'
        or (display_name is not null and length(trim(display_name)) >= 1)
      );
  end if;
end $$;

comment on constraint profiles_handle_not_blank on public.profiles is
  'Handle cannot be blank.';
comment on constraint profiles_approved_has_display_name on public.profiles is
  'Approved profiles must have non-empty display_name for directory.';

-- -----------------------------
-- RLS replay safety: clear policies before re-create
-- -----------------------------
-- Allows safe re-application of this file on existing databases.
do $$
declare
  p record;
  managed_tables constant text[] := array[
    'admin_allowlist',
    'profiles',
    'portfolio_items',
    'generation_jobs',
    'weirdlings',
    'feed_connections',
    'connection_requests',
    'feed_items',
    'saved_feed_items',
    'chat_rooms',
    'chat_room_members',
    'chat_blocks',
    'chat_suspensions',
    'chat_messages',
    'chat_message_reactions',
    'chat_message_attachments',
    'chat_read_receipts',
    'chat_reports',
    'chat_audit_log',
    'chat_moderators',
    'feed_advertisers',
    'feed_ad_events',
    'community_partners',
    'notifications',
    'events',
    'event_rsvps',
    'content_submissions',
    'playlists',
    'playlist_items',
    'audit_log'
  ];
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(managed_tables)
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  end loop;
end $$;

-- -----------------------------
-- admin_allowlist: RLS (admin only)
-- -----------------------------
alter table public.admin_allowlist enable row level security;

drop policy if exists admin_allowlist_admin_all on public.admin_allowlist;
create policy admin_allowlist_admin_all
  on public.admin_allowlist for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.admin_allowlist from anon, authenticated;
grant select, insert, update, delete on table public.admin_allowlist to authenticated;

-- -----------------------------
-- is_admin(): execute grant
-- -----------------------------
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------
-- get_feed_page(): execute grant (5-param)
-- -----------------------------
do $$
begin
  revoke all on function public.get_feed_page(uuid, timestamptz, uuid, int) from public;
exception when undefined_function then null;
end $$;
revoke all on function public.get_feed_page(uuid, timestamptz, uuid, int, text) from public;
grant execute on function public.get_feed_page(uuid, timestamptz, uuid, int, text) to authenticated, service_role;

-- -----------------------------
-- get_directory_page(): execute grant
-- -----------------------------
revoke all on function public.get_directory_page(uuid, text, text, text, text[], text, text, int, int) from public;
grant execute on function public.get_directory_page(uuid, text, text, text, text[], text, text, int, int) to authenticated, service_role;

-- -----------------------------
-- profiles: RLS
-- -----------------------------
alter table public.profiles enable row level security;

create policy profiles_anon_read_approved
  on public.profiles for select
  to anon
  using (status = 'approved');

create policy profiles_authenticated_read
  on public.profiles for select
  to authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = id
    or (select public.is_admin())
  );

create policy profiles_authenticated_insert
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_authenticated_update
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
  )
  with check (
    (select auth.uid()) = id
    or (select public.is_admin())
  );

revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert on table public.profiles to authenticated;

grant update (
  email,
  handle,
  display_name,
  avatar,
  tagline,
  geek_creds,
  nerd_creds,
  pronouns,
  industry,
  location,
  profile_visibility,
  feed_view_preference,
  last_active_at,
  socials,
  join_reason,
  participation_style,
  additional_context,
  policy_version,
  resume_url,
  use_weirdling_avatar
) on table public.profiles to authenticated;

grant update (
  status,
  reviewed_at,
  reviewed_by,
  is_admin
) on table public.profiles to authenticated;

-- -----------------------------
-- portfolio_items: RLS
-- -----------------------------
alter table public.portfolio_items enable row level security;

create policy portfolio_items_anon_read_public
  on public.portfolio_items for select
  to anon
  using (
    exists (
      select 1 from public.profiles p
      where p.id = portfolio_items.owner_id and p.status = 'approved'
    )
  );

create policy portfolio_items_authenticated_read
  on public.portfolio_items for select
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = portfolio_items.owner_id and p.status = 'approved'
    )
  );

create policy portfolio_items_authenticated_insert
  on public.portfolio_items for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy portfolio_items_authenticated_update
  on public.portfolio_items for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy portfolio_items_authenticated_delete
  on public.portfolio_items for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.portfolio_items from anon, authenticated;
grant select on table public.portfolio_items to anon, authenticated;
grant insert, update, delete on table public.portfolio_items to authenticated;

-- -----------------------------
-- generation_jobs: RLS
-- -----------------------------
alter table public.generation_jobs enable row level security;

create policy "Users can manage own generation_jobs"
  on public.generation_jobs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------
-- weirdlings: RLS
-- -----------------------------
alter table public.weirdlings enable row level security;

create policy "Users can manage own weirdlings"
  on public.weirdlings for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------
-- feed_connections: RLS
-- -----------------------------
alter table public.feed_connections enable row level security;

create policy "Users can read own connections"
  on public.feed_connections for select
  to authenticated
  using ((select auth.uid()) = feed_connections.user_id);

create policy "Users can insert own connections"
  on public.feed_connections for insert
  to authenticated
  with check ((select auth.uid()) = feed_connections.user_id);

create policy "Users can delete own connections"
  on public.feed_connections for delete
  to authenticated
  using ((select auth.uid()) = feed_connections.user_id);

revoke all on table public.feed_connections from anon, authenticated;
grant select, insert, delete on table public.feed_connections to authenticated;

-- -----------------------------
-- connection_requests: RLS
-- -----------------------------
alter table public.connection_requests enable row level security;

create policy connection_requests_participant_select
  on public.connection_requests for select
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = recipient_id
  );

create policy connection_requests_requester_insert
  on public.connection_requests for insert
  to authenticated
  with check ((select auth.uid()) = requester_id);

create policy connection_requests_recipient_update
  on public.connection_requests for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

revoke all on table public.connection_requests from anon;
grant select, insert, update on table public.connection_requests to authenticated;

-- -----------------------------
-- feed_items: RLS
-- -----------------------------
alter table public.feed_items enable row level security;

create policy "Users can read feed items from self or followees"
  on public.feed_items for select
  to authenticated
  using (
    (select auth.uid()) = feed_items.user_id
    or exists (
      select 1 from public.feed_connections fc
      where fc.user_id = (select auth.uid()) and fc.connected_user_id = feed_items.user_id
    )
  );

create policy "Users can insert own feed items"
  on public.feed_items for insert
  to authenticated
  with check ((select auth.uid()) = feed_items.user_id);

create policy "Users can delete own feed items"
  on public.feed_items for delete
  to authenticated
  using ((select auth.uid()) = feed_items.user_id);

revoke all on table public.feed_items from anon, authenticated;
grant select, insert, delete on table public.feed_items to authenticated;

-- -----------------------------
-- get_saved_feed_page(): execute grant
-- -----------------------------
grant execute on function public.get_saved_feed_page(uuid, timestamptz, uuid, int) to authenticated, service_role;

-- -----------------------------
-- saved_feed_items: RLS
-- -----------------------------
alter table public.saved_feed_items enable row level security;

create policy "Users can manage own saved feed items"
  on public.saved_feed_items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.saved_feed_items from anon, authenticated;
grant select, insert, delete on table public.saved_feed_items to authenticated;

-- -----------------------------
-- storage.objects: avatars bucket policies
-- -----------------------------
drop policy if exists "Authenticated can upload avatars" on storage.objects;
create policy "Authenticated can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- weirdling-previews: authenticated upload, public read (temporary AI previews)
drop policy if exists "Authenticated can upload weirdling-previews" on storage.objects;
create policy "Authenticated can upload weirdling-previews"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'weirdling-previews');

drop policy if exists "Public read weirdling-previews" on storage.objects;
create policy "Public read weirdling-previews"
  on storage.objects for select
  to public
  using (bucket_id = 'weirdling-previews');

-- weirdling-avatars: authenticated upload, public read (permanent AI avatars)
drop policy if exists "Authenticated can upload weirdling-avatars" on storage.objects;
create policy "Authenticated can upload weirdling-avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'weirdling-avatars');

drop policy if exists "Public read weirdling-avatars" on storage.objects;
create policy "Public read weirdling-avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'weirdling-avatars');

-- feed-ad-images: authenticated upload, public read
drop policy if exists "Public read feed-ad-images" on storage.objects;
create policy "Public read feed-ad-images"
  on storage.objects for select to public
  using (bucket_id = 'feed-ad-images');

drop policy if exists "Authenticated can upload feed-ad-images" on storage.objects;
create policy "Authenticated can upload feed-ad-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-ad-images');

-- feed-post-images: authenticated upload, public read
drop policy if exists "Authenticated can upload feed-post-images" on storage.objects;
create policy "Authenticated can upload feed-post-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'feed-post-images');

drop policy if exists "Public read feed-post-images" on storage.objects;
create policy "Public read feed-post-images"
  on storage.objects for select
  to public
  using (bucket_id = 'feed-post-images');

-- project-images: authenticated upload, public read
drop policy if exists "Authenticated can upload project-images" on storage.objects;
create policy "Authenticated can upload project-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "Public read project-images" on storage.objects;
create policy "Public read project-images"
  on storage.objects for select
  to public
  using (bucket_id = 'project-images');

-- resumes: authenticated upload (own path), public read
drop policy if exists "Authenticated can upload resumes" on storage.objects;
create policy "Authenticated can upload resumes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes');

drop policy if exists "Authenticated can update resumes" on storage.objects;
create policy "Authenticated can update resumes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resumes');

drop policy if exists "Public read resumes" on storage.objects;
create policy "Public read resumes"
  on storage.objects for select
  to public
  using (bucket_id = 'resumes');

-- -----------------------------
-- chat_rooms: RLS
-- -----------------------------
alter table public.chat_rooms enable row level security;

create policy "Users can read rooms they are members of"
  on public.chat_rooms for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_rooms.id and crm.user_id = (select auth.uid()) and crm.left_at is null
    )
  );

create policy "Authenticated can create rooms"
  on public.chat_rooms for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Admins can update room name (groups)"
  on public.chat_rooms for update
  to authenticated
  using (public.chat_is_room_admin(chat_rooms.id))
  with check (public.chat_is_room_admin(chat_rooms.id));

-- -----------------------------
-- chat_room_members: RLS
-- -----------------------------
alter table public.chat_room_members enable row level security;

create policy "Members can read room membership"
  on public.chat_room_members for select
  to authenticated
  using (public.chat_is_room_member(chat_room_members.room_id));

create policy "Members can insert/invite room membership"
  on public.chat_room_members for insert
  to authenticated
  with check (
    public.chat_is_room_admin(chat_room_members.room_id)
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.chat_rooms r
        where r.id = room_id and r.created_by = (select auth.uid())
      )
    )
  );

create policy "Members can update room membership"
  on public.chat_room_members for update
  to authenticated
  using (
    public.chat_is_room_admin(chat_room_members.room_id)
    or (select auth.uid()) = user_id
  )
  with check (
    public.chat_is_room_admin(chat_room_members.room_id)
    or (select auth.uid()) = user_id
  );

revoke all on table public.chat_rooms from anon, authenticated;
grant select, insert on table public.chat_rooms to authenticated;
grant update on table public.chat_rooms to authenticated;

revoke all on table public.chat_room_members from anon, authenticated;
grant select, insert, update on table public.chat_room_members to authenticated;

-- -----------------------------
-- chat_blocks: RLS
-- -----------------------------
alter table public.chat_blocks enable row level security;

create policy "Users can manage own blocks"
  on public.chat_blocks for all
  to authenticated
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);

revoke all on table public.chat_blocks from anon, authenticated;
grant select, insert, delete on table public.chat_blocks to authenticated;

-- -----------------------------
-- chat_suspensions: RLS (admin only)
-- -----------------------------
alter table public.chat_suspensions enable row level security;

create policy "Moderators can read own/manage chat suspensions"
  on public.chat_suspensions for select
  to authenticated
  using (
    (select public.is_chat_moderator())
    or (select auth.uid()) = user_id
  );

create policy "Moderators can insert chat suspensions"
  on public.chat_suspensions for insert
  to authenticated
  with check ((select public.is_chat_moderator()));

create policy "Moderators can update chat suspensions"
  on public.chat_suspensions for update
  to authenticated
  using ((select public.is_chat_moderator()))
  with check ((select public.is_chat_moderator()));

create policy "Moderators can delete chat suspensions"
  on public.chat_suspensions for delete
  to authenticated
  using ((select public.is_chat_moderator()));

revoke all on table public.chat_suspensions from anon, authenticated;
grant select on table public.chat_suspensions to authenticated;
grant insert, update, delete on table public.chat_suspensions to authenticated;

-- -----------------------------
-- chat_messages: RLS
-- -----------------------------
alter table public.chat_messages enable row level security;

create policy "Members can read room messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_messages.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
    )
  );

create policy "Members can insert messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and not exists (select 1 from public.chat_suspensions cs where cs.user_id = (select auth.uid()))
    and coalesce((select p.status from public.profiles p where p.id = (select auth.uid())), 'pending') != 'disabled'
    and public.chat_can_message_in_room(chat_messages.room_id, (select auth.uid()))
  );

create policy "Senders/admins can update messages (edit/delete/moderate)"
  on public.chat_messages for update
  to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select public.is_admin())
  )
  with check (
    (select auth.uid()) = sender_id
    or (select public.is_admin())
  );

revoke all on table public.chat_messages from anon, authenticated;
grant select, insert on table public.chat_messages to authenticated;
grant update on table public.chat_messages to authenticated;

-- -----------------------------
-- chat_message_reactions: RLS
-- -----------------------------
alter table public.chat_message_reactions enable row level security;

create policy "Members can manage reactions in own rooms"
  on public.chat_message_reactions for all
  to authenticated
  using (
    exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
      where cm.id = chat_message_reactions.message_id
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
      where cm.id = chat_message_reactions.message_id
    )
  );

revoke all on table public.chat_message_reactions from anon, authenticated;
grant select, insert, delete on table public.chat_message_reactions to authenticated;

-- -----------------------------
-- chat_message_attachments: RLS
-- -----------------------------
alter table public.chat_message_attachments enable row level security;

create policy "Members can read attachments in rooms"
  on public.chat_message_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
      where cm.id = chat_message_attachments.message_id
    )
  );

create policy "Members can insert attachments for own messages"
  on public.chat_message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chat_messages cm
      where cm.id = chat_message_attachments.message_id and cm.sender_id = (select auth.uid())
    )
  );

revoke all on table public.chat_message_attachments from anon, authenticated;
grant select, insert on table public.chat_message_attachments to authenticated;

-- -----------------------------
-- chat_read_receipts: RLS
-- -----------------------------
alter table public.chat_read_receipts enable row level security;

create policy "Members can manage receipts in rooms"
  on public.chat_read_receipts for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
      where cm.id = chat_read_receipts.message_id
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
      where cm.id = chat_read_receipts.message_id
    )
  );

revoke all on table public.chat_read_receipts from anon, authenticated;
grant select, insert, update on table public.chat_read_receipts to authenticated;

-- -----------------------------
-- chat_reports: RLS
-- -----------------------------
alter table public.chat_reports enable row level security;

create policy "Users can insert reports"
  on public.chat_reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy "Admins can read all reports"
  on public.chat_reports for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update report status"
  on public.chat_reports for update
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.chat_reports from anon, authenticated;
grant select, insert on table public.chat_reports to authenticated;
grant update on table public.chat_reports to authenticated;

-- -----------------------------
-- storage.objects: chat-attachments bucket
-- -----------------------------
drop policy if exists "Authenticated can upload chat-attachments" on storage.objects;
create policy "Authenticated can upload chat-attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-attachments');

drop policy if exists "Members can read chat-attachments" on storage.objects;
create policy "Members can read chat-attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-attachments');

-- -----------------------------
-- chat_audit_log: RLS (admin read only)
-- -----------------------------
alter table public.chat_audit_log enable row level security;

-- chat_moderators: admin only
alter table public.chat_moderators enable row level security;
create policy "Admins can manage chat_moderators"
  on public.chat_moderators for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on table public.chat_moderators from anon, authenticated;
grant select, insert, delete on table public.chat_moderators to authenticated;

-- -----------------------------
create policy "Admins can read audit log"
  on public.chat_audit_log for select
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.chat_audit_log from anon, authenticated;
grant select on table public.chat_audit_log to authenticated;

-- -----------------------------
-- feed_advertisers: public read active; admin full access
-- -----------------------------
alter table public.feed_advertisers enable row level security;

drop policy if exists feed_advertisers_public_read on public.feed_advertisers;
drop policy if exists feed_advertisers_admin_all on public.feed_advertisers;

create policy feed_advertisers_public_read
  on public.feed_advertisers for select
  to anon
  using (active = true);

create policy feed_advertisers_authenticated_read
  on public.feed_advertisers for select
  to authenticated
  using (active = true or (select public.is_admin()));

create policy feed_advertisers_admin_insert
  on public.feed_advertisers for insert
  to authenticated
  with check ((select public.is_admin()));

create policy feed_advertisers_admin_update
  on public.feed_advertisers for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy feed_advertisers_admin_delete
  on public.feed_advertisers for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.feed_advertisers from anon, authenticated;
grant select on table public.feed_advertisers to authenticated;
grant select, insert, update, delete on table public.feed_advertisers to authenticated;

-- -----------------------------
-- feed_ad_events: authenticated insert own, admin read
-- -----------------------------
alter table public.feed_ad_events enable row level security;

drop policy if exists feed_ad_events_insert_own on public.feed_ad_events;
drop policy if exists feed_ad_events_admin_read on public.feed_ad_events;

create policy feed_ad_events_insert_own
  on public.feed_ad_events for insert
  to authenticated
  with check (member_id is null or (select auth.uid()) = member_id);

create policy feed_ad_events_admin_read
  on public.feed_ad_events for select
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.feed_ad_events from anon, authenticated;
grant insert, select on table public.feed_ad_events to authenticated;

-- -----------------------------
-- community_partners: public read active; admin full access
-- -----------------------------
alter table public.community_partners enable row level security;

drop policy if exists community_partners_public_read on public.community_partners;
drop policy if exists community_partners_admin_all on public.community_partners;

create policy community_partners_public_read
  on public.community_partners for select
  to anon
  using (active = true);

create policy community_partners_authenticated_read
  on public.community_partners for select
  to authenticated
  using (active = true or (select public.is_admin()));

create policy community_partners_admin_insert
  on public.community_partners for insert
  to authenticated
  with check ((select public.is_admin()));

create policy community_partners_admin_update
  on public.community_partners for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy community_partners_admin_delete
  on public.community_partners for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.community_partners from anon, authenticated;
grant select on table public.community_partners to anon, authenticated;
grant select, insert, update, delete on table public.community_partners to authenticated;

-- -----------------------------
-- notifications: recipient only
-- -----------------------------
alter table public.notifications enable row level security;

create policy notifications_recipient_select
  on public.notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

create policy notifications_recipient_update
  on public.notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

revoke all on table public.notifications from anon, authenticated;
grant select, update on table public.notifications to authenticated;

-- -----------------------------
-- events: authenticated read; host/create/update own
-- -----------------------------
alter table public.events enable row level security;

create policy events_select
  on public.events for select to authenticated using (true);

create policy events_insert_own
  on public.events for insert to authenticated
  with check ((select auth.uid()) = host_id);

create policy events_update_own
  on public.events for update to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);

revoke all on table public.events from anon, authenticated;
grant select, insert, update on table public.events to authenticated;

-- -----------------------------
-- event_rsvps: members manage own
-- -----------------------------
alter table public.event_rsvps enable row level security;

create policy event_rsvps_select
  on public.event_rsvps for select to authenticated using (true);

create policy event_rsvps_insert_own
  on public.event_rsvps for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy event_rsvps_update_own
  on public.event_rsvps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy event_rsvps_delete_own
  on public.event_rsvps for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.event_rsvps from anon, authenticated;
grant select, insert, update, delete on table public.event_rsvps to authenticated;

-- -----------------------------
-- content_submissions, playlists, playlist_items, audit_log
-- -----------------------------
alter table public.content_submissions enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.audit_log enable row level security;

create policy content_submissions_authenticated_insert
  on public.content_submissions for insert
  to authenticated
  with check (
    (select auth.uid()) = submitted_by
    or (select public.is_admin())
  );

create policy content_submissions_authenticated_select
  on public.content_submissions for select
  to authenticated
  using (
    (select auth.uid()) = submitted_by
    or (select public.is_admin())
  );

create policy content_submissions_admin_update
  on public.content_submissions for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy content_submissions_admin_delete
  on public.content_submissions for delete
  to authenticated
  using ((select public.is_admin()));

create policy playlists_select_public
  on public.playlists for select to anon
  using (is_public = true);

create policy playlists_select_authenticated
  on public.playlists for select to authenticated
  using (is_public = true or (select public.is_admin()));

create policy playlists_admin_insert
  on public.playlists for insert
  to authenticated
  with check ((select public.is_admin()));

create policy playlists_admin_update
  on public.playlists for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy playlists_admin_delete
  on public.playlists for delete
  to authenticated
  using ((select public.is_admin()));

create policy playlist_items_select_public
  on public.playlist_items for select to anon
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.is_public = true
    )
  );

create policy playlist_items_select_authenticated
  on public.playlist_items for select to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (p.is_public = true or (select public.is_admin()))
    )
  );

create policy playlist_items_admin_insert
  on public.playlist_items for insert
  to authenticated
  with check ((select public.is_admin()));

create policy playlist_items_admin_update
  on public.playlist_items for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy playlist_items_admin_delete
  on public.playlist_items for delete
  to authenticated
  using ((select public.is_admin()));

create policy audit_log_select_admin
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "content_submissions_storage_insert" on storage.objects;
create policy content_submissions_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-submissions'
    and (string_to_array(name, '/'))[2] = (select auth.uid())::text
  );

drop policy if exists "content_submissions_storage_select" on storage.objects;
create policy content_submissions_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'content-submissions'
    and (string_to_array(name, '/'))[2] = (select auth.uid())::text
  );

-- -----------------------------
-- Security Advisor hardening for unmanaged public objects
-- -----------------------------
-- Lock down any public tables not explicitly managed by this migration pair.
-- This prevents orphaned/legacy tables from remaining exposed via PostgREST.
do $$
declare
  t record;
  p record;
  managed_tables constant text[] := array[
    'admin_allowlist',
    'profiles',
    'portfolio_items',
    'generation_jobs',
    'weirdlings',
    'feed_connections',
    'connection_requests',
    'feed_items',
    'saved_feed_items',
    'chat_rooms',
    'chat_room_members',
    'chat_blocks',
    'chat_suspensions',
    'chat_messages',
    'chat_message_reactions',
    'chat_message_attachments',
    'chat_read_receipts',
    'chat_reports',
    'chat_audit_log',
    'chat_moderators',
    'feed_advertisers',
    'feed_ad_events',
    'community_partners',
    'notifications',
    'events',
    'event_rsvps',
    'content_submissions',
    'playlists',
    'playlist_items',
    'audit_log'
  ];
begin
  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename <> all (managed_tables)
  loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
    execute format('revoke all on table %I.%I from anon, authenticated', t.schemaname, t.tablename);

    -- Drop permissive legacy policies (e.g. USING (true)) on unmanaged tables.
    for p in
      select policyname
      from pg_policies
      where schemaname = t.schemaname
        and tablename = t.tablename
    loop
      execute format('drop policy if exists %I on %I.%I', p.policyname, t.schemaname, t.tablename);
    end loop;
  end loop;
end $$;

-- Force deterministic function resolution for any public functions that were
-- created without an explicit search_path, addressing advisor warnings.
-- FIX: Only touch functions owned by the migration role (skips extension-owned
-- functions like set_limit(real) that would otherwise fail with "must be owner").
do $$
declare
  fn record;
  current_role_oid oid;
begin
  select oid into current_role_oid
  from pg_roles
  where rolname = current_user;

  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proowner = current_role_oid
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_catalog', fn.signature);
    exception
      when insufficient_privilege then null;
    end;
  end loop;
end $$;
