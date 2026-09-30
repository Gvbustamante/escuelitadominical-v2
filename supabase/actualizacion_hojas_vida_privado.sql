-- Hojas de vida en bucket PRIVADO: solo admin, superadmin y coordinador las ven (enlace firmado 1 h).
-- profiles.hoja_vida_url ahora guarda la ruta del archivo (la app también entiende las URLs antiguas).
-- Idempotente.

update storage.buckets set public = false where id = 'hojas_vida';

drop policy if exists "Todos pueden ver hojas de vida" on storage.objects;
drop policy if exists "Staff puede subir hojas de vida" on storage.objects;
drop policy if exists "Staff puede borrar hojas de vida" on storage.objects;
drop policy if exists "admin lee hojas de vida" on storage.objects;
drop policy if exists "admin sube hojas de vida" on storage.objects;
drop policy if exists "admin borra hojas de vida" on storage.objects;

create policy "admin lee hojas de vida" on storage.objects for select to authenticated
  using (bucket_id = 'hojas_vida'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador')));
create policy "admin sube hojas de vida" on storage.objects for insert to authenticated
  with check (bucket_id = 'hojas_vida'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin')));
create policy "admin borra hojas de vida" on storage.objects for delete to authenticated
  using (bucket_id = 'hojas_vida'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin')));
