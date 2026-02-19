-- Consolidated migration: ad image storage + remove profile moderation
-- Replaces 20260214120000 and 20260214130000

-- -----------------------------
-- feed_advertisers: image_url for 1200x400 banner (Supabase Storage)
-- -----------------------------
alter table public.feed_advertisers
  add column if not exists image_url text;

comment on column public.feed_advertisers.image_url is
  'Public URL of ad banner image (1200x400 recommended). Stored in feed-ad-images bucket.';

-- feed-ad-images bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-ad-images',
  'feed-ad-images',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for feed-ad-images
drop policy if exists "Public read feed-ad-images" on storage.objects;
create policy "Public read feed-ad-images"
  on storage.objects for select to public
  using (bucket_id = 'feed-ad-images');

drop policy if exists "Authenticated can upload feed-ad-images" on storage.objects;
create policy "Authenticated can upload feed-ad-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-ad-images');

-- -----------------------------
-- profiles: remove moderation, auto-approve all
-- -----------------------------
update public.profiles set status = 'approved' where status = 'pending';

alter table public.profiles
  alter column status set default 'approved';

comment on column public.profiles.status is
  'Legacy: was pending|approved|rejected|disabled. Now always approved on creation.';
