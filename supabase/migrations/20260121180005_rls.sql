-- supabase/migrations/20260121180005_rls.sql
-- All RLS policies and table privileges.

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
  resume_url
) on table public.profiles to authenticated;

grant update (
  status,
  reviewed_at,
  reviewed_by,
  is_admin
) on table public.profiles to authenticated;

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
