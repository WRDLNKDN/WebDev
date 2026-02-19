-- Remove profile moderation: all new and existing profiles are auto-approved.
-- New users get immediate access. Admins no longer approve/reject signups.

-- 1. Backfill: set all pending profiles to approved
update public.profiles set status = 'approved' where status = 'pending';

-- 2. Change default for new profiles (future inserts from triggers/etc.)
alter table public.profiles
  alter column status set default 'approved';

comment on column public.profiles.status is
  'Legacy: was pending|approved|rejected|disabled. Now always approved on creation. Kept for compatibility.';
