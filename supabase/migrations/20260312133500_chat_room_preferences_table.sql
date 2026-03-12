create table if not exists public.chat_room_preferences (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_chat_room_preferences_user_id
  on public.chat_room_preferences(user_id);

create index if not exists idx_chat_room_preferences_user_favorite
  on public.chat_room_preferences(user_id, is_favorite)
  where is_favorite = true;

comment on table public.chat_room_preferences is
  'User-specific chat room preferences, such as favorites.';

drop trigger if exists trg_chat_room_preferences_updated_at
  on public.chat_room_preferences;
create trigger trg_chat_room_preferences_updated_at
before update on public.chat_room_preferences
for each row
execute function public.set_updated_at();
