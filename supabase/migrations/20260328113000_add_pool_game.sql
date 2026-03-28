insert into public.game_definitions (
  game_type,
  name,
  min_players,
  max_players,
  is_solo_capable,
  is_multiplayer_capable
)
values ('pool', 'Pool', 1, 1, true, false)
on conflict (game_type) do nothing;
