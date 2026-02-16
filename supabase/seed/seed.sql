-- ============================================================
-- Admin allowlist (dev)
-- ============================================================

insert into public.admin_allowlist (email)
values
  ('limeman@gmail.com'),
  ('info@wrdlnkdn.com'),
  ('aprillordrake@gmail.com'),
  ('jameshood118@gmail.com'),
  ('piorana@gmail.com'),
  ('christopher.s.carter01@gmail.com')
on conflict (email) do nothing;
