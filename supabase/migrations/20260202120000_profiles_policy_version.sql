-- Add policy_version to track which Terms/Guidelines version the user accepted at signup
alter table public.profiles
  add column if not exists policy_version text;

comment on column public.profiles.policy_version is
  'Version of Terms and Community Guidelines accepted at registration (e.g. v2026.02)';
