-- Add image_url to feed_advertisers for 1200x400 banner (stored in Supabase Storage)
alter table public.feed_advertisers
  add column if not exists image_url text;

comment on column public.feed_advertisers.image_url is
  'Public URL of ad banner image (1200x400 recommended). Stored in feed-ad-images bucket.';

-- feed-ad-images bucket: public read, admin upload via signed URL from backend
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

-- Storage policies: public read; authenticated can insert (backend issues signed URLs to admins only)
drop policy if exists "Public read feed-ad-images" on storage.objects;
create policy "Public read feed-ad-images"
  on storage.objects for select to public
  using (bucket_id = 'feed-ad-images');

drop policy if exists "Authenticated can upload feed-ad-images" on storage.objects;
create policy "Authenticated can upload feed-ad-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-ad-images');
