-- Drive privado: los archivos del Drive solo se abren con enlace firmado (caduca en 1 hora).
-- Lee: equipo (superadmin, admin, coordinador, docente).
-- Padres: solo los archivos del Drive que el equipo adjuntó a una actividad o devocional que ellos pueden ver.
-- Idempotente: se puede correr más de una vez.

update storage.buckets set public = false where id = 'drive';

drop policy if exists "lectura publica de archivos drive" on storage.objects;
drop policy if exists "leer archivos drive privado" on storage.objects;
create policy "leer archivos drive privado" on storage.objects for select to authenticated
  using (
    bucket_id = 'drive'
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente'))
      or exists (select 1 from public.actividad_archivos aa where aa.bucket = 'drive' and aa.storage_path = storage.objects.name)
      or exists (select 1 from public.devocional_archivos da where da.bucket = 'drive' and da.storage_path = storage.objects.name)
    )
  );

create index if not exists actividad_archivos_drive_path_idx on public.actividad_archivos (storage_path) where bucket = 'drive';
create index if not exists devocional_archivos_drive_path_idx on public.devocional_archivos (storage_path) where bucket = 'drive';
