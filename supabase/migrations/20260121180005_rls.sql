-- supabase/migrations/20260121180005_rls.sql
-- All RLS policies and table privileges.

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

