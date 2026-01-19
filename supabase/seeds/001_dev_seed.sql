-- 001_dev_seed.sql
-- Development helpers for testing profiles + RLS
--
-- IMPORTANT:
-- auth.users rows must exist before inserting into public.profiles.
-- Create users via Supabase Auth UI or your frontend app.

-- ============================================================
-- 1. Inspect existing users
-- ============================================================

-- View users (run as service role / SQL editor)
select id, email, created_at
from auth.users
order by created_at desc;

-- ============================================================
-- 2. Inspect profiles
-- ============================================================

select id, handle, status, created_at, reviewed_at
from public.profiles
order by created_at desc;

-- ============================================================
-- 3. Approve a profile (ADMIN ONLY)
-- Replace <USER_UUID> with a real auth.users.id
-- ============================================================

-- update public.profiles
-- set status = 'approved'
-- where id = '<USER_UUID>';

-- ============================================================
-- 4. Reject or disable a profile (ADMIN ONLY)
-- ============================================================

-- update public.profiles
-- set status = 'rejected'
-- where id = '<USER_UUID>';

-- update public.profiles
-- set status = 'disabled'
-- where id = '<USER_UUID>';

-- ============================================================
-- 5. Verify public visibility
-- ============================================================

-- This query should ONLY return approved profiles
select handle, status
from public.profiles
where status = 'approved';

-- ============================================================
-- Admin allowlist (dev)
-- ============================================================

insert into public.admin_allowlist (email)
values
  ('limeman@gmail.com'),
  ('wrdlnkdn@gmail.com')
on conflict (email) do nothing;