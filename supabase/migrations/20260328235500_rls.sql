create or replace function public.chat_create_group(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_room_id uuid;
  v_member_ids uuid[];
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(array_length(p_member_ids, 1), 0) > 99 then
    raise exception 'Max 99 members';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Group name is required';
  end if;

  select coalesce(array_agg(member_id), '{}'::uuid[])
    into v_member_ids
  from (
    select distinct member_id
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) as member_id
    where member_id is not null and member_id <> v_uid
  ) deduped_members;

  if exists (
    select 1
    from unnest(v_member_ids) as member_id
    where not public.are_chat_connections(v_uid, member_id)
       or public.chat_blocked(v_uid, member_id)
  ) then
    raise exception 'You can only add Connections to a group.';
  end if;

  insert into public.chat_rooms (room_type, name, created_by)
  values ('group', trim(p_name), v_uid)
  returning id into v_room_id;

  if v_room_id is null then
    raise exception 'Could not create room';
  end if;

  insert into public.chat_room_members (room_id, user_id, role)
  values (v_room_id, v_uid, 'admin');

  if coalesce(array_length(v_member_ids, 1), 0) > 0 then
    insert into public.chat_room_members (room_id, user_id, role)
    select v_room_id, member_id, 'member'
    from unnest(v_member_ids) as member_id;
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.chat_create_group(text, uuid[]) from public;
grant execute on function public.chat_create_group(text, uuid[]) to authenticated;
