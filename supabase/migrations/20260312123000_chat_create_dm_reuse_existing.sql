create or replace function public.chat_create_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid;
  v_room_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_other_user_id is null or p_other_user_id = v_uid then
    raise exception 'Invalid other user for DM';
  end if;
  if not public.are_chat_connections(v_uid, p_other_user_id) then
    raise exception 'You can only start 1:1 chats with Connections.';
  end if;
  if public.chat_blocked(v_uid, p_other_user_id) then
    raise exception 'You cannot message this member.';
  end if;

  select r.id
    into v_room_id
  from public.chat_rooms r
  join public.chat_room_members mine
    on mine.room_id = r.id
   and mine.user_id = v_uid
  join public.chat_room_members other_member
    on other_member.room_id = r.id
   and other_member.user_id = p_other_user_id
  where r.room_type = 'dm'
  order by coalesce(
             (
               select max(m.created_at)
               from public.chat_messages m
               where m.room_id = r.id
             ),
             r.updated_at,
             r.created_at
           ) desc,
           r.created_at asc,
           r.id asc
  limit 1;

  if v_room_id is not null then
    insert into public.chat_room_members (room_id, user_id, role, left_at)
    values
      (v_room_id, v_uid, 'admin', null),
      (v_room_id, p_other_user_id, 'member', null)
    on conflict (room_id, user_id)
    do update
      set role = excluded.role,
          left_at = null;

    return v_room_id;
  end if;

  insert into public.chat_rooms (room_type, name, created_by)
  values ('dm', null, v_uid)
  returning id into v_room_id;

  if v_room_id is null then
    raise exception 'Could not create room';
  end if;

  insert into public.chat_room_members (room_id, user_id, role)
  values (v_room_id, v_uid, 'admin'), (v_room_id, p_other_user_id, 'member');

  return v_room_id;
end;
$$;

revoke all on function public.chat_create_dm(uuid) from public;
grant execute on function public.chat_create_dm(uuid) to authenticated;
