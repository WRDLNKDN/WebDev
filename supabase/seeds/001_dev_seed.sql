-- ============================================================
-- Admin allowlist (dev)
-- ============================================================

insert into public.admin_allowlist (email)
values
  ('limeman@gmail.com'),
  ('wrdlnkdn@gmail.com')
on conflict (email) do nothing;