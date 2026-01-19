-- Add admin flag to profiles
alter table public.profiles
add column if not exists is_admin boolean not null default false;