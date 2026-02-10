-- Add resume_url to profiles for ResumeCard / uploadResume (align with frontend types)
alter table public.profiles
  add column if not exists resume_url text;

comment on column public.profiles.resume_url is
  'Public URL of the user resume (e.g. from storage bucket resumes)';
