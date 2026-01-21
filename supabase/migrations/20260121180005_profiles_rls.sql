-- supabase/migrations/20260121180005_profiles_rls.sql
-- RLS + policies for profiles

alter table public.profiles enable row level security;

-- Drop policies if they exist (safe for re-runs in dev)
drop policy if exists profiles_public_read_approved on public.profiles;
drop policy if exists profiles_user_read_own on public.profiles;
drop policy if exists profiles_user_insert_own on public.profiles;
drop policy if exists profiles_user_update_own on public.profiles;

-- Public can ONLY read approved profiles
create policy profiles_public_read_approved
on public.profiles
for select
using (status = 'approved');

-- Signed-in users can read their OWN profile even if pending/rejected
create policy profiles_user_read_own
on public.profiles
for select
using (auth.uid() = id);

-- Users can insert ONLY their own profile
create policy profiles_user_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

-- Users can update ONLY their own profile
-- (status changes are blocked by trigger and also blocked at privilege level below)
create policy profiles_user_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Privileges: prevent authenticated from updating status/review fields at the SQL layer too
revoke all on table public.profiles from anon, authenticated;

-- Everyone can SELECT (RLS filters rows)
grant select on table public.profiles to anon, authenticated;

-- Only authenticated can INSERT
grant insert on table public.profiles to authenticated;

-- Only allow authenticated to UPDATE safe columns
grant update (handle, geek_creds, nerd_creds, pronouns, socials) on table public.profiles to authenticated;
