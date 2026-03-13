drop policy if exists "Authenticated can upload project-sources" on storage.objects;
create policy "Authenticated can upload project-sources"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-sources');

drop policy if exists "Public read project-sources" on storage.objects;
create policy "Public read project-sources"
  on storage.objects for select
  to public
  using (bucket_id = 'project-sources');

drop policy if exists "Authenticated can delete own project-sources" on storage.objects;
create policy "Authenticated can delete own project-sources"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-sources'
    and owner = auth.uid()
  );
