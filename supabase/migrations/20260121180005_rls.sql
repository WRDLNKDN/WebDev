-- supabase/migrations/20260121180005_rls.sql
-- All RLS policies, grants, and security hardening (tables/functions defined in 20260121180000_tables.sql).
-- Additive/safe only: no TRUNCATE, no DELETE without WHERE, no DROP TABLE; table data never cleared.
-- This file contains ONLY RLS policies, grants, and security settings/hardening - no schema or data modifications.
--
-- Idempotent: `alter table if exists ... enable row level security`; each `create policy` is preceded by
-- `drop policy if exists` (or cleared by the managed_tables replay block). Safe to re-run in SQL Editor.
--
-- If you see "duplicate key" or migration repair needed for 20260214140000, 20260214160000, 20260214170000:
--   supabase migration repair <id> --status reverted
-- Then run db push again. (Those were consolidated into these two files only.)
--
-- HOW TO FORCE RLS / SECURITY RECONFIGURE (when db push says "up to date" but security config is wrong):
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
-- Consolidated follow-up migrations
-- -----------------------------

-- No RLS changes were required for the portfolio single-category constraint.

alter table if exists public.chat_room_preferences enable row level security;

drop policy if exists "Users can manage own chat room preferences"
  on public.chat_room_preferences;
create policy "Users can manage own chat room preferences"
  on public.chat_room_preferences for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and public.chat_is_room_member(chat_room_preferences.room_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.chat_is_room_member(chat_room_preferences.room_id)
  );

revoke all on table public.chat_room_preferences from anon, authenticated;
grant select, insert, update, delete on table public.chat_room_preferences to authenticated;

-- project-sources storage policies: one policy DDL template in-loop (avoids repeated format bodies / literals).
do $project_sources_storage_policies$
declare
  bucket constant text := 'project-sources';
  p_upload constant text := 'Authenticated can upload ' || bucket;
  p_read constant text := 'Public read ' || bucket;
  p_delete constant text := 'Authenticated can delete own ' || bucket;
  role_authenticated constant text := 'authenticated';
  role_public constant text := 'public';
  op_insert constant text := 'insert';
  op_select constant text := 'select';
  op_delete constant text := 'delete';
  clause_with_check constant text := format('with check (bucket_id = %L)', bucket);
  clause_using_read constant text := format('using (bucket_id = %L)', bucket);
  clause_using_delete constant text :=
    format('using (bucket_id = %L and owner = auth.uid())', bucket);
  policy_ddl_template constant text :=
    'drop policy if exists %I on storage.objects; create policy %I on storage.objects for %s to %s %s';
  pol record;
begin
  for pol in
    select * from (
      values
        (p_upload, op_insert::text, role_authenticated::text, clause_with_check),
        (p_read, op_select::text, role_public::text, clause_using_read),
        (p_delete, op_delete::text, role_authenticated::text, clause_using_delete)
    ) as t(policy_name, for_op, to_role, clause_sql)
  loop
    execute format(
      policy_ddl_template,
      pol.policy_name,
      pol.policy_name,
      pol.for_op,
      pol.to_role,
      pol.clause_sql
    );
  end loop;
end;
$project_sources_storage_policies$;

-- -----------------------------
-- RLS replay safety: clear policies before re-create
-- -----------------------------
-- Allows safe re-application of this file on existing databases.
do $$
declare
  p record;
  public_schema constant text := 'public';
  managed_tables constant text[] := array[
    'admin_allowlist',
    'feature_flags',
    'profanity_allowlist',
    'profanity_overrides',
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
    'chat_room_preferences',
    'chat_blocks',
    'chat_suspensions',
    'chat_messages',
    'chat_message_reactions',
    'chat_message_attachments',
    'chat_read_receipts',
    'chat_reports',
    'feed_reports',
    'chat_audit_log',
    'chat_moderators',
    'feed_advertisers',
    'feed_ad_events',
    'community_partners',
    'notifications',
    'events',
    'event_rsvps',
    'hangman_words',
    'daily_puzzle_words',
    'trivia_questions',
    'would_you_rather_prompts',
    'caption_game_images',
    'game_definitions',
    'game_sessions',
    'game_session_participants',
    'game_invitations',
    'game_events',
    'content_submissions',
    'playlists',
    'playlist_items',
    'audit_log'
  ];
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = public_schema
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
alter table if exists public.admin_allowlist enable row level security;

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
-- profanity_overrides: read by all (for client-side validation), write by admin
-- -----------------------------
alter table if exists public.profanity_overrides enable row level security;

drop policy if exists profanity_overrides_select on public.profanity_overrides;
create policy profanity_overrides_select
  on public.profanity_overrides for select
  to anon, authenticated
  using (true);

-- Admin writes only: separate FOR SELECT policy covers reads (lint 0006). PG14
-- has no `for insert, update, delete` on one policy — use one policy per command.
drop policy if exists profanity_overrides_admin_all on public.profanity_overrides;
drop policy if exists profanity_overrides_admin_write on public.profanity_overrides;
drop policy if exists profanity_overrides_admin_insert on public.profanity_overrides;
drop policy if exists profanity_overrides_admin_update on public.profanity_overrides;
drop policy if exists profanity_overrides_admin_delete on public.profanity_overrides;

create policy profanity_overrides_admin_insert
  on public.profanity_overrides for insert
  to authenticated
  with check ((select public.is_admin()));

create policy profanity_overrides_admin_update
  on public.profanity_overrides for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy profanity_overrides_admin_delete
  on public.profanity_overrides for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.profanity_overrides from anon, authenticated;
grant select on table public.profanity_overrides to anon, authenticated;
grant insert, update, delete on table public.profanity_overrides to authenticated;

-- -----------------------------
-- profanity_allowlist: read by all (for client-side validation), write by admin
-- -----------------------------
alter table if exists public.profanity_allowlist enable row level security;

drop policy if exists profanity_allowlist_select on public.profanity_allowlist;
create policy profanity_allowlist_select
  on public.profanity_allowlist for select
  to anon, authenticated
  using (true);

drop policy if exists profanity_allowlist_admin_all on public.profanity_allowlist;
drop policy if exists profanity_allowlist_admin_write on public.profanity_allowlist;
drop policy if exists profanity_allowlist_admin_insert on public.profanity_allowlist;
drop policy if exists profanity_allowlist_admin_update on public.profanity_allowlist;
drop policy if exists profanity_allowlist_admin_delete on public.profanity_allowlist;

create policy profanity_allowlist_admin_insert
  on public.profanity_allowlist for insert
  to authenticated
  with check ((select public.is_admin()));

create policy profanity_allowlist_admin_update
  on public.profanity_allowlist for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy profanity_allowlist_admin_delete
  on public.profanity_allowlist for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.profanity_allowlist from anon, authenticated;
grant select on table public.profanity_allowlist to anon, authenticated;
grant insert, update, delete on table public.profanity_allowlist to authenticated;

-- -----------------------------
-- feature_flags: read by all, write by admin only
-- -----------------------------
alter table if exists public.feature_flags enable row level security;

drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select
  on public.feature_flags for select
  to anon, authenticated
  using (true);

drop policy if exists feature_flags_update_admin on public.feature_flags;
create policy feature_flags_update_admin
  on public.feature_flags for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists feature_flags_insert_admin on public.feature_flags;
create policy feature_flags_insert_admin
  on public.feature_flags for insert
  to authenticated
  with check ((select public.is_admin()));

revoke all on table public.feature_flags from anon, authenticated;
grant select on table public.feature_flags to anon, authenticated;
grant update on table public.feature_flags to authenticated;
grant insert on table public.feature_flags to authenticated;

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
-- get_directory_page(): execute grant (11-arg: + p_interests text[])
-- -----------------------------
do $$
begin
  revoke all on function public.get_directory_page(uuid, text, text, text, text, text[], text, text, int, int) from public;
exception when undefined_function then null;
end $$;
grant execute on function public.get_directory_page(uuid, text, text, text, text, text[], text[], text, text, int, int) to authenticated, service_role;

-- -----------------------------
-- profiles: RLS
-- -----------------------------
alter table if exists public.profiles enable row level security;

do $$
declare
  approved_status constant text := 'approved';
begin
  drop policy if exists profiles_anon_read_approved on public.profiles;
  drop policy if exists profiles_authenticated_read on public.profiles;
  drop policy if exists profiles_authenticated_insert on public.profiles;
  drop policy if exists profiles_authenticated_update on public.profiles;

  execute format(
    'create policy profiles_anon_read_approved on public.profiles for select to anon using (status = %L)',
    approved_status
  );

  execute format(
    'create policy profiles_authenticated_read on public.profiles for select to authenticated using (status = %L or (select auth.uid()) = id or (select public.is_admin()))',
    approved_status
  );

  execute 'create policy profiles_authenticated_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id)';

  execute 'create policy profiles_authenticated_update on public.profiles for update to authenticated using ((select auth.uid()) = id or (select public.is_admin())) with check ((select auth.uid()) = id or (select public.is_admin()))';
end $$;

revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert on table public.profiles to authenticated;

grant update (
  email,
  handle,
  display_name,
  avatar,
  avatar_type,
  tagline,
  geek_creds,
  nerd_creds,
  pronouns,
  industry,
  secondary_industry,
  industries,
  niche_field,
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

-- Allow authenticated users to update their own notification/marketing preferences.
-- RLS still scopes updates to auth.uid() = profiles.id via profiles_authenticated_update.
do $$
declare
  required_columns constant text[] := array[
    'push_enabled',
    'email_notifications_enabled',
    'marketing_email_enabled',
    'marketing_opt_in',
    'marketing_opt_in_timestamp',
    'marketing_source',
    'marketing_product_updates',
    'marketing_events',
    'marketing_push_enabled',
    'consent_updated_at'
  ];
  present_columns_count int;
begin
  select count(*)
  into present_columns_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = any (required_columns);

  if present_columns_count = array_length(required_columns, 1) then
    execute $grant$
      grant update (
        push_enabled,
        email_notifications_enabled,
        marketing_email_enabled,
        marketing_opt_in,
        marketing_opt_in_timestamp,
        marketing_source,
        marketing_product_updates,
        marketing_events,
        marketing_push_enabled,
        consent_updated_at
      ) on table public.profiles to authenticated
    $grant$;
  end if;
end $$;

-- -----------------------------
-- portfolio_items: RLS
-- -----------------------------
alter table if exists public.portfolio_items enable row level security;

drop policy if exists portfolio_items_anon_read_public on public.portfolio_items;
drop policy if exists portfolio_items_authenticated_read on public.portfolio_items;
drop policy if exists portfolio_items_authenticated_insert on public.portfolio_items;
drop policy if exists portfolio_items_authenticated_update on public.portfolio_items;
drop policy if exists portfolio_items_authenticated_delete on public.portfolio_items;

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
alter table if exists public.generation_jobs enable row level security;

drop policy if exists "Users can manage own generation_jobs" on public.generation_jobs;

create policy "Users can manage own generation_jobs"
  on public.generation_jobs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------
-- weirdlings: RLS
-- -----------------------------
alter table if exists public.weirdlings enable row level security;

drop policy if exists "Users can manage own weirdlings" on public.weirdlings;

create policy "Users can manage own weirdlings"
  on public.weirdlings for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------
-- feed_connections: RLS
-- -----------------------------
alter table if exists public.feed_connections enable row level security;

-- Single permissive SELECT (avoids evaluating two policies per row; same semantics as OR of the old pair)
drop policy if exists "Users can read own connections" on public.feed_connections;
drop policy if exists "Users can read connections where they are connected_user" on public.feed_connections;
drop policy if exists "Members can read feed_connections they participate in"
  on public.feed_connections;
create policy "Members can read feed_connections they participate in"
  on public.feed_connections for select
  to authenticated
  using (
    (select auth.uid()) = feed_connections.user_id
    or (select auth.uid()) = feed_connections.connected_user_id
  );

drop policy if exists "Users can insert own connections" on public.feed_connections;
create policy "Users can insert own connections"
  on public.feed_connections for insert
  to authenticated
  with check ((select auth.uid()) = feed_connections.user_id);

drop policy if exists "Users can delete own connections" on public.feed_connections;
create policy "Users can delete own connections"
  on public.feed_connections for delete
  to authenticated
  using ((select auth.uid()) = feed_connections.user_id);

revoke all on table public.feed_connections from anon, authenticated;
grant select, insert, delete on table public.feed_connections to authenticated;

-- -----------------------------
-- connection_requests: RLS
-- -----------------------------
alter table if exists public.connection_requests enable row level security;

drop policy if exists connection_requests_participant_select on public.connection_requests;
drop policy if exists connection_requests_requester_insert on public.connection_requests;
drop policy if exists connection_requests_recipient_update on public.connection_requests;
drop policy if exists connection_requests_requester_delete_pending on public.connection_requests;

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

create policy connection_requests_requester_delete_pending
  on public.connection_requests for delete
  to authenticated
  using (
    (select auth.uid()) = requester_id
    and status = 'pending'
  );

revoke all on table public.connection_requests from anon;
grant select, insert, update, delete on table public.connection_requests to authenticated;

-- -----------------------------
-- feed_items: RLS
-- -----------------------------
alter table if exists public.feed_items enable row level security;

drop policy if exists "Users can read feed items from self or followees" on public.feed_items;
drop policy if exists "Users can insert own feed items" on public.feed_items;
drop policy if exists "Users can delete own feed items" on public.feed_items;

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
alter table if exists public.saved_feed_items enable row level security;

drop policy if exists "Users can manage own saved feed items" on public.saved_feed_items;

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

drop policy if exists "Authenticated can delete own project-images" on storage.objects;
create policy "Authenticated can delete own project-images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- portfolio-thumbnails: worker/authenticated upload, public read. Additive only: new policies for new bucket.
-- Does not modify portfolio_items or any other table RLS; no data touched.
drop policy if exists "Authenticated can upload portfolio-thumbnails" on storage.objects;
create policy "Authenticated can upload portfolio-thumbnails"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-thumbnails');

drop policy if exists "Public read portfolio-thumbnails" on storage.objects;
create policy "Public read portfolio-thumbnails"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio-thumbnails');

drop policy if exists "Authenticated can delete own portfolio-thumbnails" on storage.objects;
create policy "Authenticated can delete own portfolio-thumbnails"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- resumes: authenticated upload (own path), public read
do $$
declare
  resumes_bucket constant text := 'resumes';
begin
  execute 'drop policy if exists "Authenticated can upload resumes" on storage.objects';
  execute format(
    'create policy "Authenticated can upload resumes" on storage.objects for insert to authenticated with check (bucket_id = %L)',
    resumes_bucket
  );

  execute 'drop policy if exists "Authenticated can update resumes" on storage.objects';
  execute format(
    'create policy "Authenticated can update resumes" on storage.objects for update to authenticated using (bucket_id = %L)',
    resumes_bucket
  );

  execute 'drop policy if exists "Public read resumes" on storage.objects';
  execute format(
    'create policy "Public read resumes" on storage.objects for select to public using (bucket_id = %L)',
    resumes_bucket
  );
end $$;

-- -----------------------------
-- chat_rooms: RLS
-- -----------------------------
alter table if exists public.chat_rooms enable row level security;

drop policy if exists "Users can read rooms they are members of" on public.chat_rooms;
create policy "Users can read rooms they are members of"
  on public.chat_rooms for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_rooms.id and crm.user_id = (select auth.uid()) and crm.left_at is null
    )
  );

drop policy if exists "Authenticated can create rooms" on public.chat_rooms;
create policy "Authenticated can create rooms"
  on public.chat_rooms for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Admins can update room name (groups)" on public.chat_rooms;
create policy "Admins can update room name (groups)"
  on public.chat_rooms for update
  to authenticated
  using (public.chat_is_room_admin(chat_rooms.id))
  with check (public.chat_is_room_admin(chat_rooms.id));

-- -----------------------------
-- chat_room_members: RLS
-- -----------------------------
alter table if exists public.chat_room_members enable row level security;

drop policy if exists "Members can read room membership" on public.chat_room_members;
create policy "Members can read room membership"
  on public.chat_room_members for select
  to authenticated
  using (public.chat_is_room_member(chat_room_members.room_id));

drop policy if exists "Members can insert/invite room membership" on public.chat_room_members;
create policy "Members can insert/invite room membership"
  on public.chat_room_members for insert
  to authenticated
  with check (
    (
      public.chat_is_room_admin(chat_room_members.room_id)
      and (
        (select auth.uid()) = chat_room_members.user_id
        or (
          public.are_chat_connections(
            (select auth.uid()),
            chat_room_members.user_id
          )
          and not public.chat_blocked(
            (select auth.uid()),
            chat_room_members.user_id
          )
        )
      )
    )
    or (
      (select auth.uid()) = chat_room_members.user_id
      and exists (
        select 1 from public.chat_rooms r
        where r.id = chat_room_members.room_id
          and r.created_by = (select auth.uid())
      )
    )
  );

drop policy if exists "Members can update room membership" on public.chat_room_members;
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
alter table if exists public.chat_blocks enable row level security;

drop policy if exists "Users can manage own blocks" on public.chat_blocks;

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
alter table if exists public.chat_suspensions enable row level security;

drop policy if exists "Moderators can read own/manage chat suspensions" on public.chat_suspensions;
drop policy if exists "Moderators can insert chat suspensions" on public.chat_suspensions;
drop policy if exists "Moderators can update chat suspensions" on public.chat_suspensions;
drop policy if exists "Moderators can delete chat suspensions" on public.chat_suspensions;

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
alter table if exists public.chat_messages enable row level security;

drop policy if exists "Members can read room messages" on public.chat_messages;
create policy "Members can read room messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_messages.room_id and crm.user_id = (select auth.uid()) and crm.left_at is null
    )
  );

drop policy if exists "Members can insert messages" on public.chat_messages;
create policy "Members can insert messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and not exists (select 1 from public.chat_suspensions cs where cs.user_id = (select auth.uid()))
    and coalesce((select p.status from public.profiles p where p.id = (select auth.uid())), 'pending') != 'disabled'
    and public.chat_can_message_in_room(chat_messages.room_id, (select auth.uid()))
  );

drop policy if exists "Senders/admins can update messages (edit/delete/moderate)" on public.chat_messages;
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
alter table if exists public.chat_message_reactions enable row level security;

drop policy if exists "Members can manage reactions in own rooms" on public.chat_message_reactions;

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
alter table if exists public.chat_message_attachments enable row level security;

drop policy if exists "Members can read attachments in rooms" on public.chat_message_attachments;
drop policy if exists "Members can insert attachments for own messages" on public.chat_message_attachments;

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
alter table if exists public.chat_read_receipts enable row level security;

drop policy if exists "Members can manage receipts in rooms" on public.chat_read_receipts;

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
alter table if exists public.chat_reports enable row level security;

drop policy if exists "Users can insert reports" on public.chat_reports;
drop policy if exists "Admins can read all reports" on public.chat_reports;
drop policy if exists "Admins can update report status" on public.chat_reports;

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
-- feed_reports: RLS
-- -----------------------------
alter table if exists public.feed_reports enable row level security;

drop policy if exists "Users can insert reports" on public.feed_reports;
drop policy if exists "Admins can read all reports" on public.feed_reports;
drop policy if exists "Admins can update report status" on public.feed_reports;

create policy "Users can insert reports"
  on public.feed_reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy "Admins can read all reports"
  on public.feed_reports for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update report status"
  on public.feed_reports for update
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.feed_reports from anon, authenticated;
grant select, insert on table public.feed_reports to authenticated;
grant update on table public.feed_reports to authenticated;

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
alter table if exists public.chat_audit_log enable row level security;

-- chat_moderators: admin only
alter table if exists public.chat_moderators enable row level security;

drop policy if exists "Admins can manage chat_moderators" on public.chat_moderators;

create policy "Admins can manage chat_moderators"
  on public.chat_moderators for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on table public.chat_moderators from anon, authenticated;
grant select, insert, delete on table public.chat_moderators to authenticated;

-- -----------------------------
drop policy if exists "Admins can read audit log" on public.chat_audit_log;

create policy "Admins can read audit log"
  on public.chat_audit_log for select
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.chat_audit_log from anon, authenticated;
grant select on table public.chat_audit_log to authenticated;

-- -----------------------------
-- feed_advertisers: public read active; admin full access
-- -----------------------------
alter table if exists public.feed_advertisers enable row level security;

drop policy if exists feed_advertisers_public_read on public.feed_advertisers;
drop policy if exists feed_advertisers_admin_all on public.feed_advertisers;
drop policy if exists feed_advertisers_authenticated_read on public.feed_advertisers;
drop policy if exists feed_advertisers_admin_insert on public.feed_advertisers;
drop policy if exists feed_advertisers_admin_update on public.feed_advertisers;
drop policy if exists feed_advertisers_admin_delete on public.feed_advertisers;

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
alter table if exists public.feed_ad_events enable row level security;

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
alter table if exists public.community_partners enable row level security;

drop policy if exists community_partners_public_read on public.community_partners;
drop policy if exists community_partners_admin_all on public.community_partners;
drop policy if exists community_partners_authenticated_read on public.community_partners;
drop policy if exists community_partners_admin_insert on public.community_partners;
drop policy if exists community_partners_admin_update on public.community_partners;
drop policy if exists community_partners_admin_delete on public.community_partners;

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
alter table if exists public.notifications enable row level security;

drop policy if exists notifications_recipient_select on public.notifications;
drop policy if exists notifications_recipient_update on public.notifications;

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
alter table if exists public.events enable row level security;

drop policy if exists events_select on public.events;
drop policy if exists events_insert_own on public.events;
drop policy if exists events_update_own on public.events;

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
alter table if exists public.event_rsvps enable row level security;

drop policy if exists event_rsvps_select on public.event_rsvps;
drop policy if exists event_rsvps_insert_own on public.event_rsvps;
drop policy if exists event_rsvps_update_own on public.event_rsvps;
drop policy if exists event_rsvps_delete_own on public.event_rsvps;

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
-- hangman_words: read-only for authenticated (word list for Hangman)
-- -----------------------------
do $hangman_words_rls$
begin
  if to_regclass('public.hangman_words') is null then
    return;
  end if;
  alter table public.hangman_words enable row level security;
  drop policy if exists hangman_words_select on public.hangman_words;
  create policy hangman_words_select on public.hangman_words for select to authenticated using (true);
  revoke all on table public.hangman_words from anon, authenticated;
  grant select on table public.hangman_words to authenticated;
end $hangman_words_rls$;

-- -----------------------------
-- daily_puzzle_words: read-only for authenticated (word list for Daily Word puzzle)
-- -----------------------------
do $daily_puzzle_words_rls$
begin
  if to_regclass('public.daily_puzzle_words') is null then
    return;
  end if;
  alter table public.daily_puzzle_words enable row level security;
  drop policy if exists daily_puzzle_words_select on public.daily_puzzle_words;
  create policy daily_puzzle_words_select on public.daily_puzzle_words for select to authenticated using (true);
  revoke all on table public.daily_puzzle_words from anon, authenticated;
  grant select on table public.daily_puzzle_words to authenticated;
end $daily_puzzle_words_rls$;

-- -----------------------------
-- trivia_questions: read-only for authenticated (question bank for Trivia)
-- -----------------------------
do $trivia_questions_rls$
begin
  if to_regclass('public.trivia_questions') is null then
    return;
  end if;
  alter table public.trivia_questions enable row level security;
  drop policy if exists trivia_questions_select on public.trivia_questions;
  create policy trivia_questions_select on public.trivia_questions for select to authenticated using (true);
  revoke all on table public.trivia_questions from anon, authenticated;
  grant select on table public.trivia_questions to authenticated;
end $trivia_questions_rls$;

-- -----------------------------
-- would_you_rather_prompts: read-only for authenticated (prompt bank for Would You Rather)
-- -----------------------------
do $would_you_rather_prompts_rls$
begin
  if to_regclass('public.would_you_rather_prompts') is null then
    return;
  end if;
  alter table public.would_you_rather_prompts enable row level security;
  drop policy if exists would_you_rather_prompts_select on public.would_you_rather_prompts;
  create policy would_you_rather_prompts_select on public.would_you_rather_prompts for select to authenticated using (true);
  revoke all on table public.would_you_rather_prompts from anon, authenticated;
  grant select on table public.would_you_rather_prompts to authenticated;
end $would_you_rather_prompts_rls$;

-- -----------------------------
-- caption_game_images: read-only for authenticated (prompt images for Caption Game)
-- -----------------------------
do $caption_game_images_rls$
begin
  if to_regclass('public.caption_game_images') is null then
    return;
  end if;
  alter table public.caption_game_images enable row level security;
  drop policy if exists caption_game_images_select on public.caption_game_images;
  create policy caption_game_images_select on public.caption_game_images for select to authenticated using (true);
  revoke all on table public.caption_game_images from anon, authenticated;
  grant select on table public.caption_game_images to authenticated;
end $caption_game_images_rls$;

-- -----------------------------
-- Game Session Framework: RLS for game_definitions, game_sessions, participants, invitations, events
-- -----------------------------
alter table if exists public.game_definitions enable row level security;
alter table if exists public.game_sessions enable row level security;
alter table if exists public.game_session_participants enable row level security;
alter table if exists public.game_invitations enable row level security;
alter table if exists public.game_events enable row level security;

drop policy if exists game_definitions_select on public.game_definitions;
drop policy if exists game_sessions_select on public.game_sessions;
drop policy if exists game_sessions_insert on public.game_sessions;
drop policy if exists game_sessions_update on public.game_sessions;
drop policy if exists game_session_participants_select on public.game_session_participants;
drop policy if exists game_session_participants_insert on public.game_session_participants;
drop policy if exists game_session_participants_update on public.game_session_participants;
drop policy if exists game_invitations_select on public.game_invitations;
drop policy if exists game_invitations_insert on public.game_invitations;
drop policy if exists game_invitations_update on public.game_invitations;
drop policy if exists game_events_select on public.game_events;
drop policy if exists game_events_insert on public.game_events;

create policy game_definitions_select
  on public.game_definitions for select to authenticated using (true);

create policy game_sessions_select
  on public.game_sessions for select to authenticated
  using (
    (select auth.uid()) = created_by
    or exists (
      select 1 from public.game_session_participants p
      where p.session_id = id and p.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.game_invitations i
      where i.session_id = id and (i.recipient_id = (select auth.uid()) or i.sender_id = (select auth.uid()))
    )
  );

create policy game_sessions_insert
  on public.game_sessions for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy game_sessions_update
  on public.game_sessions for update to authenticated
  using (
    (select auth.uid()) = created_by
    or exists (select 1 from public.game_session_participants p where p.session_id = id and p.user_id = (select auth.uid()))
  );

create policy game_session_participants_select
  on public.game_session_participants for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.game_sessions s where s.id = session_id and s.created_by = (select auth.uid()))
    or exists (select 1 from public.game_invitations i where i.session_id = session_id and (i.recipient_id = (select auth.uid()) or i.sender_id = (select auth.uid())))
  );

create policy game_session_participants_insert
  on public.game_session_participants for insert to authenticated
  with check (
    exists (select 1 from public.game_sessions s where s.id = session_id and s.created_by = (select auth.uid()))
    or (select auth.uid()) = user_id
  );

create policy game_session_participants_update
  on public.game_session_participants for update to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.game_sessions s where s.id = session_id and s.created_by = (select auth.uid())));

create policy game_invitations_select
  on public.game_invitations for select to authenticated
  using (recipient_id = (select auth.uid()) or sender_id = (select auth.uid()));

create policy game_invitations_insert
  on public.game_invitations for insert to authenticated
  with check (sender_id = (select auth.uid()));

create policy game_invitations_update
  on public.game_invitations for update to authenticated
  using (recipient_id = (select auth.uid()) or sender_id = (select auth.uid()));

create policy game_events_select
  on public.game_events for select to authenticated
  using (
    exists (select 1 from public.game_sessions s where s.id = session_id and s.created_by = (select auth.uid()))
    or exists (select 1 from public.game_session_participants p where p.session_id = session_id and p.user_id = (select auth.uid()))
  );

create policy game_events_insert
  on public.game_events for insert to authenticated
  with check (
    exists (select 1 from public.game_session_participants p where p.session_id = session_id and p.user_id = (select auth.uid()))
  );

revoke all on table public.game_definitions from anon, authenticated;
grant select on table public.game_definitions to authenticated;
revoke all on table public.game_sessions from anon, authenticated;
grant select, insert, update on table public.game_sessions to authenticated;
revoke all on table public.game_session_participants from anon, authenticated;
grant select, insert, update on table public.game_session_participants to authenticated;
revoke all on table public.game_invitations from anon, authenticated;
grant select, insert, update on table public.game_invitations to authenticated;
revoke all on table public.game_events from anon, authenticated;
grant select, insert on table public.game_events to authenticated;

-- -----------------------------
-- content_submissions, playlists, playlist_items, audit_log
-- -----------------------------
alter table if exists public.content_submissions enable row level security;
alter table if exists public.playlists enable row level security;
alter table if exists public.playlist_items enable row level security;
alter table if exists public.audit_log enable row level security;

drop policy if exists content_submissions_authenticated_insert on public.content_submissions;
drop policy if exists content_submissions_authenticated_select on public.content_submissions;
drop policy if exists content_submissions_admin_update on public.content_submissions;
drop policy if exists content_submissions_admin_delete on public.content_submissions;
drop policy if exists playlists_select_public on public.playlists;
drop policy if exists playlists_select_authenticated on public.playlists;
drop policy if exists playlists_admin_insert on public.playlists;
drop policy if exists playlists_admin_update on public.playlists;
drop policy if exists playlists_admin_delete on public.playlists;
drop policy if exists playlist_items_select_public on public.playlist_items;
drop policy if exists playlist_items_select_authenticated on public.playlist_items;
drop policy if exists playlist_items_admin_insert on public.playlist_items;
drop policy if exists playlist_items_admin_update on public.playlist_items;
drop policy if exists playlist_items_admin_delete on public.playlist_items;
drop policy if exists audit_log_select_admin on public.audit_log;

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
    'feature_flags',
    'profanity_allowlist',
    'profanity_overrides',
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
    'chat_room_preferences',
    'chat_blocks',
    'chat_suspensions',
    'chat_messages',
    'chat_message_reactions',
    'chat_message_attachments',
    'chat_read_receipts',
    'chat_reports',
    'feed_reports',
    'chat_audit_log',
    'chat_moderators',
    'feed_advertisers',
    'feed_ad_events',
    'community_partners',
    'notifications',
    'events',
    'event_rsvps',
    'hangman_words',
    'daily_puzzle_words',
    'trivia_questions',
    'would_you_rather_prompts',
    'caption_game_images',
    'game_definitions',
    'game_sessions',
    'game_session_participants',
    'game_invitations',
    'game_events',
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
