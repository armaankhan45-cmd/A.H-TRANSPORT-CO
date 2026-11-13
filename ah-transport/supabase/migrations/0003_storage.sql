-- =====================================================================
-- Migration 0003 — Private storage buckets + policies
-- NEVER make Aadhaar / PAN / DL / salary documents public.
-- Buckets are PRIVATE; the app requests short-lived signed URLs.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-docs', 'vehicle-docs', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('driver-docs',  'driver-docs',  false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('receipts',     'receipts',     false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('invoices',     'invoices',     false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('photos',       'photos',       false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- vehicle-docs: staff read/write; driver only their own vehicle folder
-- Folder convention: vehicle-docs/<vehicle_id>/<file>
-- ---------------------------------------------------------------
drop policy if exists "vdocs staff all" on storage.objects;
create policy "vdocs staff all" on storage.objects
  for all using (
    bucket_id = 'vehicle-docs' and (public.is_admin() or public.has_permission('documents'))
  ) with check (
    bucket_id = 'vehicle-docs' and (public.is_admin() or public.has_permission('documents'))
  );

drop policy if exists "vdocs driver own vehicle read" on storage.objects;
create policy "vdocs driver own vehicle read" on storage.objects
  for select using (
    bucket_id = 'vehicle-docs'
    and exists (
      select 1 from public.vehicles v
      where v.id::text = (storage.foldername(name))[1]
        and v.current_driver_id = public.my_driver_id()
    )
  );

drop policy if exists "vdocs driver own vehicle upload" on storage.objects;
create policy "vdocs driver own vehicle upload" on storage.objects
  for insert with check (
    bucket_id = 'vehicle-docs'
    and exists (
      select 1 from public.vehicles v
      where v.id::text = (storage.foldername(name))[1]
        and v.current_driver_id = public.my_driver_id()
    )
  );

-- ---------------------------------------------------------------
-- driver-docs: admin only (drivers can read their own folder)
-- ---------------------------------------------------------------
drop policy if exists "ddocs admin all" on storage.objects;
create policy "ddocs admin all" on storage.objects
  for all using (bucket_id = 'driver-docs' and public.is_admin())
  with check (bucket_id = 'driver-docs' and public.is_admin());

drop policy if exists "ddocs driver self read" on storage.objects;
create policy "ddocs driver self read" on storage.objects
  for select using (
    bucket_id = 'driver-docs'
    and (storage.foldername(name))[1] = public.my_driver_id()::text
  );

-- ---------------------------------------------------------------
-- receipts / invoices / photos: accounts + admin + respective modules
-- ---------------------------------------------------------------
drop policy if exists "receipts accounts" on storage.objects;
create policy "receipts accounts" on storage.objects
  for all using (bucket_id = 'receipts' and (public.is_accounts() or public.has_permission('expenses')))
  with check (bucket_id = 'receipts' and (public.is_accounts() or public.has_permission('expenses')));

drop policy if exists "invoices maint" on storage.objects;
create policy "invoices maint" on storage.objects
  for all using (bucket_id = 'invoices' and (public.is_accounts() or public.has_permission('maintenance')))
  with check (bucket_id = 'invoices' and (public.is_accounts() or public.has_permission('maintenance')));

drop policy if exists "photos staff" on storage.objects;
create policy "photos staff" on storage.objects
  for all using (bucket_id = 'photos' and public.is_staff()) with check (bucket_id = 'photos' and public.is_staff());

-- Note: signed URL pattern in the app:
--   const { data } = await supabase.storage.from('vehicle-docs').createSignedUrl(path, 60);
