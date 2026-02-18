-- Paste this into Supabase Dashboard → SQL Editor and run
-- Allows self-approval (no admin review) and backfills pending profiles

-- 1. Trigger: allow users to set own status pending → approved
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

  if auth.uid() = old.id and old.status = 'pending' and new.status = 'approved' then
    return new;
  end if;

  raise exception 'Users cannot change status';
end;
$$;

-- 2. One-time: set existing pending profiles to approved
update public.profiles set status = 'approved' where status = 'pending';
