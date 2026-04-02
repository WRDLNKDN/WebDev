alter table if exists public.media_assets enable row level security;
revoke all on table public.media_assets from anon, authenticated;

alter table if exists public.media_asset_events enable row level security;
revoke all on table public.media_asset_events from anon, authenticated;
