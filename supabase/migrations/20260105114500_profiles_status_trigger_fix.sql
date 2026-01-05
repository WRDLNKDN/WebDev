-- Fix trigger: allow service_role to change status, block everyone else

create or replace function public.profiles_block_status_change()
returns trigger
language plpgsql
as $$
declare
  claims jsonb;
  jwt_role text;
begin
  -- If status didn't change, allow
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- PostgREST provides the whole JWT claims JSON here
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  jwt_role := coalesce(claims->>'role', '');

  -- Allow service_role (and optionally supabase_admin if present in your setup)
  if jwt_role in ('service_role', 'supabase_admin') then
    return new;
  end if;

  raise exception 'Users cannot change status';
end;
$$;

drop trigger if exists trg_profiles_block_status_change on public.profiles;

create trigger trg_profiles_block_status_change
before update of status on public.profiles
for each row
execute function public.profiles_block_status_change();