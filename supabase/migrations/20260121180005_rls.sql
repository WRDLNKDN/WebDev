-- supabase/migrations/20260121180005_rls.sql
-- All RLS policies and privileges (tables/functions defined in 20260121180000_tables.sql).

-- -----------------------------
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
-- admin_allowlist: privileges (no RLS)
-- -----------------------------
revoke all on table public.admin_allowlist from anon, authenticated;

-- -----------------------------
-- is_admin(): execute grant
-- -----------------------------
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------
-- get_feed_page(): execute grant
-- -----------------------------
revoke all on function public.get_feed_page(uuid, timestamptz, uuid, int) from public;
grant execute on function public.get_feed_page(uuid, timestamptz, uuid, int) to authenticated, service_role;

-- -----------------------------
-- profiles: RLS
-- -----------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_public_read_approved on public.profiles;
drop policy if exists profiles_user_read_own on public.profiles;
drop policy if exists profiles_admin_read_all on public.profiles;
drop policy if exists profiles_user_insert_own on public.profiles;
drop policy if exists profiles_user_update_own on public.profiles;
drop policy if exists profiles_admin_update_all on public.profiles;

create policy profiles_public_read_approved
  on public.profiles for select
  using (status = 'approved');

create policy profiles_user_read_own
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_admin_read_all
  on public.profiles for select
  using (public.is_admin());

create policy profiles_user_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

create policy profiles_user_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_update_all
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

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

create policy "Users can read own portfolio_items"
  on public.portfolio_items for select
  using (auth.uid() = owner_id);

create policy "Users can insert own portfolio_items"
  on public.portfolio_items for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own portfolio_items"
  on public.portfolio_items for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own portfolio_items"
  on public.portfolio_items for delete
  using (auth.uid() = owner_id);

-- Public read for portfolio items (so approved profiles' portfolios are visible)
create policy "Public can read portfolio_items"
  on public.portfolio_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = portfolio_items.owner_id and p.status = 'approved'
    )
  );

revoke all on table public.portfolio_items from anon, authenticated;
grant select on table public.portfolio_items to anon, authenticated;
grant insert, update, delete on table public.portfolio_items to authenticated;

-- -----------------------------
-- generation_jobs: RLS
-- -----------------------------
alter table public.generation_jobs enable row level security;

create policy "Users can manage own generation_jobs"
  on public.generation_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------
-- weirdlings: RLS
-- -----------------------------
alter table public.weirdlings enable row level security;

create policy "Users can manage own weirdlings"
  on public.weirdlings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------
-- feed_connections: RLS
-- -----------------------------
alter table public.feed_connections enable row level security;

create policy "Users can read own connections"
  on public.feed_connections for select
  to authenticated
  using (auth.uid() = feed_connections.user_id);

create policy "Users can insert own connections"
  on public.feed_connections for insert
  to authenticated
  with check (auth.uid() = feed_connections.user_id);

create policy "Users can delete own connections"
  on public.feed_connections for delete
  to authenticated
  using (auth.uid() = feed_connections.user_id);

revoke all on table public.feed_connections from anon, authenticated;
grant select, insert, delete on table public.feed_connections to authenticated;

-- -----------------------------
-- feed_items: RLS
-- -----------------------------
alter table public.feed_items enable row level security;

create policy "Users can read feed items from self or followees"
  on public.feed_items for select
  to authenticated
  using (
    auth.uid() = feed_items.user_id
    or exists (
      select 1 from public.feed_connections fc
      where fc.user_id = auth.uid() and fc.connected_user_id = feed_items.user_id
    )
  );

create policy "Users can insert own feed items"
  on public.feed_items for insert
  to authenticated
  with check (auth.uid() = feed_items.user_id);

create policy "Users can delete own feed items"
  on public.feed_items for delete
  to authenticated
  using (auth.uid() = feed_items.user_id);

revoke all on table public.feed_items from anon, authenticated;
grant select, insert, delete on table public.feed_items to authenticated;

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

-- project-images: authenticated upload, public read
create policy "Authenticated can upload project-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

create policy "Public read project-images"
  on storage.objects for select
  to public
  using (bucket_id = 'project-images');

-- resumes: authenticated upload (own path), public read
create policy "Authenticated can upload resumes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes');

create policy "Authenticated can update resumes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resumes');

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
      where crm.room_id = chat_rooms.id and crm.user_id = auth.uid() and crm.left_at is null
    )
  );

create policy "Authenticated can create rooms"
  on public.chat_rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Admins can update room name (groups)"
  on public.chat_rooms for update
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_rooms.id and crm.user_id = auth.uid()
        and crm.role = 'admin' and crm.left_at is null
    )
  )
  with check (true);

-- -----------------------------
-- chat_room_members: RLS
-- -----------------------------
alter table public.chat_room_members enable row level security;

create policy "Members can read room membership"
  on public.chat_room_members for select
  to authenticated
  using (public.chat_is_room_member(chat_room_members.room_id));

create policy "Admins can insert members (invite)"
  on public.chat_room_members for insert
  to authenticated
  with check (public.chat_is_room_admin(chat_room_members.room_id));

create policy "Creators can insert self as first member"
  on public.chat_room_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.chat_rooms r where r.id = room_id and r.created_by = auth.uid())
  );

create policy "Admins can update members (transfer, remove)"
  on public.chat_room_members for update
  to authenticated
  using (public.chat_is_room_admin(chat_room_members.room_id));

create policy "Users can leave (set left_at)"
  on public.chat_room_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

revoke all on table public.chat_blocks from anon, authenticated;
grant select, insert, delete on table public.chat_blocks to authenticated;

-- -----------------------------
-- chat_suspensions: RLS (admin only)
-- -----------------------------
alter table public.chat_suspensions enable row level security;

create policy "Moderators can manage chat suspensions"
  on public.chat_suspensions for all
  to authenticated
  using (public.is_chat_moderator())
  with check (public.is_chat_moderator());

create policy "Users can read own suspension"
  on public.chat_suspensions for select
  to authenticated
  using (auth.uid() = user_id);

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
      where crm.room_id = chat_messages.room_id and crm.user_id = auth.uid() and crm.left_at is null
    )
  );

create policy "Members can insert messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and not exists (select 1 from public.chat_suspensions cs where cs.user_id = auth.uid())
    and coalesce((select p.status from public.profiles p where p.id = auth.uid()), 'pending') != 'disabled'
    and public.chat_can_message_in_room(chat_messages.room_id, auth.uid())
  );

create policy "Senders can update own messages (edit, soft delete)"
  on public.chat_messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "Admins can delete messages (moderation)"
  on public.chat_messages for update
  to authenticated
  using (public.is_admin());

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
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = auth.uid() and crm.left_at is null
      where cm.id = chat_message_reactions.message_id
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = auth.uid() and crm.left_at is null
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
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = auth.uid() and crm.left_at is null
      where cm.id = chat_message_attachments.message_id
    )
  );

create policy "Members can insert attachments for own messages"
  on public.chat_message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chat_messages cm
      where cm.id = chat_message_attachments.message_id and cm.sender_id = auth.uid()
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
    auth.uid() = user_id
    or exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = auth.uid() and crm.left_at is null
      where cm.id = chat_read_receipts.message_id
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_messages cm
      join public.chat_room_members crm on crm.room_id = cm.room_id and crm.user_id = auth.uid() and crm.left_at is null
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
  with check (auth.uid() = reporter_id);

create policy "Admins can read all reports"
  on public.chat_reports for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update report status"
  on public.chat_reports for update
  to authenticated
  using (public.is_admin());

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
  to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on table public.chat_moderators from anon, authenticated;
grant select, insert, delete on table public.chat_moderators to authenticated;

-- -----------------------------
create policy "Admins can read audit log"
  on public.chat_audit_log for select
  to authenticated
  using (public.is_admin());

revoke all on table public.chat_audit_log from anon, authenticated;
grant select on table public.chat_audit_log to authenticated;

