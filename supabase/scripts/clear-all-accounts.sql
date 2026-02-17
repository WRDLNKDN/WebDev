-- Clear all auth accounts (local dev / UAT only; DESTRUCTIVE)
-- Run from project root: npx supabase db execute -f supabase/scripts/clear-all-accounts.sql
-- Or paste into Supabase Dashboard → SQL Editor (use service_role connection)

-- 1. Delete storage objects (avatars, project-images, resumes, chat-attachments)
--    Storage ownership can block auth.users delete; clear first.
delete from storage.objects
where bucket_id in ('avatars', 'project-images', 'resumes', 'chat-attachments');

-- 2. Delete all auth users (cascades to profiles and other user-linked tables)
delete from auth.users;
