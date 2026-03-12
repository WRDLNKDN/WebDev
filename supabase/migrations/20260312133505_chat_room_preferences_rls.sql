alter table public.chat_room_preferences enable row level security;

drop policy if exists "Users can manage own chat room preferences"
  on public.chat_room_preferences;
create policy "Users can manage own chat room preferences"
  on public.chat_room_preferences for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and public.chat_is_room_member(chat_room_preferences.room_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.chat_is_room_member(chat_room_preferences.room_id)
  );

revoke all on table public.chat_room_preferences from anon, authenticated;
grant select, insert, update, delete on table public.chat_room_preferences to authenticated;
