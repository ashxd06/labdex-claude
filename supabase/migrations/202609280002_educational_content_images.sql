-- Imágenes y pistas de aprendizaje para fichas públicas de contenido.
alter table public.culture_media
  add column if not exists educational_image_path text,
  add column if not exists educational_image_caption text,
  add column if not exists educational_image_observation text;

alter table public.laboratory_tests
  add column if not exists educational_image_path text,
  add column if not exists educational_image_caption text,
  add column if not exists educational_image_observation text;

alter table public.procedures
  add column if not exists educational_image_path text,
  add column if not exists educational_image_caption text,
  add column if not exists educational_image_observation text;

alter table public.clinical_analyses
  add column if not exists educational_image_path text,
  add column if not exists educational_image_caption text,
  add column if not exists educational_image_observation text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('educational-images', 'educational-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "educational_images_public_read" on storage.objects;
create policy "educational_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'educational-images');

drop policy if exists "educational_images_admin_insert" on storage.objects;
create policy "educational_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'educational-images' and public.is_admin((select auth.uid())));

drop policy if exists "educational_images_admin_update" on storage.objects;
create policy "educational_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'educational-images' and public.is_admin((select auth.uid())))
  with check (bucket_id = 'educational-images' and public.is_admin((select auth.uid())));

drop policy if exists "educational_images_admin_delete" on storage.objects;
create policy "educational_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'educational-images' and public.is_admin((select auth.uid())));
