-- Performance-focused additive indexes for common Supabase reads.
-- Safe to run repeatedly; no destructive schema changes.

-- Directory sorting: approved profiles are the dominant read path.
create index if not exists idx_profiles_approved_recent_activity
  on public.profiles ((coalesce(last_active_at, created_at)) desc, id desc)
  where status = 'approved';

create index if not exists idx_profiles_approved_created_at
  on public.profiles (created_at desc, id desc)
  where status = 'approved';

create index if not exists idx_profiles_approved_display_name_handle
  on public.profiles ((coalesce(display_name, handle)), id)
  where status = 'approved';

-- Directory search hits these fields with lower(... ) like '%term%'.
create index if not exists idx_profiles_secondary_industry_trgm
  on public.profiles using gin (lower(secondary_industry) extensions.gin_trgm_ops)
  where secondary_industry is not null;

create index if not exists idx_profiles_niche_field_trgm
  on public.profiles using gin (lower(niche_field) extensions.gin_trgm_ops)
  where niche_field is not null;

-- Chat loaders almost always ask for "my active memberships".
create index if not exists idx_chat_room_members_user_active_room
  on public.chat_room_members(user_id, room_id)
  where left_at is null;

-- Unread counts and room summaries exclude deleted/system-null sender rows.
create index if not exists idx_chat_messages_room_unread
  on public.chat_messages(room_id, created_at desc)
  where sender_id is not null and is_deleted = false;
