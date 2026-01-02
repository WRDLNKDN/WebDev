-- supabase/migrations/20260102152500_profiles_rls_fixes.sql

-- 1) Ensure profiles has a status column with sane defaults (skip if you already have it)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'status'
  ) then
    alter table public.profiles
      add column status text not null default 'pending';
  end if;
end $$;

-- Optional: constrain status values
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- 2) Enable RLS
alter table public.profiles enable row level security;

-- 3) Drop policies if they already exist (safe reset)
drop policy if exists "Profiles: public can read approved" on public.profiles;
drop policy if exists "Profiles: user can read own" on public.profiles;
drop policy if exists "Profiles: user can insert own" on public.profiles;
drop policy if exists "Profiles: user can update own" on public.profiles;

-- 4) Public can read ONLY approved rows
create policy "Profiles: public can read approved"
  on public.profiles
  for select
  using (status = 'approved');

-- 5) Logged-in users can read their OWN row (even if pending)
create policy "Profiles: user can read own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 6) Logged-in users can insert their OWN row
create policy "Profiles: user can insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 7) Logged-in users can update their OWN row (field-level restrictions handled by trigger below)
create policy "Profiles: user can update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 8) Trigger to block self-approval: users cannot change status themselves
--    Service role is allowed (admin operations).
create or replace function public.prevent_user_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act if status actually changes
  if new.status is distinct from old.status then
    -- Supabase sets role in JWT. Service role bypass is typically "service_role".
    if auth.role() <> 'service_role' then
      raise exception 'Users cannot change status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_user_status_change on public.profiles;

create trigger trg_prevent_user_status_change
before update on public.profiles
for each row
execute function public.prevent_user_status_change();