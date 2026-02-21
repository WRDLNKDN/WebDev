-- ============================================================
-- Admin allowlist (dev)
-- ============================================================

insert into public.admin_allowlist (email)
values
  ('anickclark@gmail.com'),
  ('wrdlnkdn@gmail.com'),
  ('aprillordrake@gmail.com'),
  ('piorana@gmail.com'),
  ('christopher.s.carter01@gmail.com')
on conflict (email) do nothing;
