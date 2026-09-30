-- PDFs de planeación en bucket PRIVADO 'planeaciones' (solo el equipo, con enlaces firmados).
-- Los PDFs antiguos (bucket 'actividades', ruta 'planeaciones/...') los mueve la app sola
-- la primera vez que un admin o coordinador abre Planeación.
-- Idempotente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planeaciones', 'planeaciones', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "equipo lee planeaciones" on storage.objects;
create policy "equipo lee planeaciones" on storage.objects for select to authenticated
  using (bucket_id = 'planeaciones'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente')));

drop policy if exists "equipo sube planeaciones" on storage.objects;
create policy "equipo sube planeaciones" on storage.objects for insert to authenticated
  with check (bucket_id = 'planeaciones'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente')));

drop policy if exists "equipo borra planeaciones" on storage.objects;
create policy "equipo borra planeaciones" on storage.objects for delete to authenticated
  using (bucket_id = 'planeaciones'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente')));
