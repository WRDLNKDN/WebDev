-- supabase/migrations/20260121180005_profiles_rls.sql
-- RLS policies for profiles table

alter table public.profiles enable row level security;

-- Drop policies if they exist
drop policy if exists profiles_public_read_approved on public.profiles;
drop policy if exists profiles_user_read_own on public.profiles;
drop policy if exists profiles_admin_read_all on public.profiles;

drop policy if exists profiles_user_insert_own on public.profiles;

drop policy if exists profiles_user_update_own on public.profiles;
drop policy if exists profiles_admin_update_all on public.profiles;

-- -----------------------------
-- SELECT
-- -----------------------------

-- Anyone can read approved profiles
create policy profiles_public_read_approved
on public.profiles
for select
using (status = 'approved');

-- Signed-in user can read their own row
create policy profiles_user_read_own
on public.profiles
for select
using (auth.uid() = id);

-- Admin can read everything
create policy profiles_admin_read_all
on public.profiles
for select
using (public.is_admin());

-- -----------------------------
-- INSERT
-- -----------------------------
create policy profiles_user_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

-- -----------------------------
-- UPDATE
-- -----------------------------

-- User can update their own row (safe columns enforced by GRANT)
create policy profiles_user_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admin can update any row (including status; trigger still enforces)
create policy profiles_admin_update_all
on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());

-- -----------------------------
-- Privileges (SQL layer)
-- -----------------------------
revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert on table public.profiles to authenticated;

-- Safe editable fields (regular users)
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
  additional_context
) on table public.profiles to authenticated;

-- Admin-only fields (still granted to authenticated, but RLS + trigger gate it)
grant update (
  status,
  reviewed_at,
  reviewed_by,
  is_admin
) on table public.profiles to authenticated;