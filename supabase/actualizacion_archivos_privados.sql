-- Bitácora, materiales y tareas de los niños en bucket PRIVADO 'privado' (enlaces firmados 1 h).
-- Equipo: todo. Padres: solo las tareas de sus hijos (ruta tareas/<actividad>/<nino>/...).
-- Columna bucket en las tablas: null = archivo antiguo en 'actividades' (público).
-- Idempotente.

insert into storage.buckets (id, name, public, file_size_limit)
values ('privado', 'privado', false, 52428800)
on conflict (id) do update set public = false;

alter table public.bitacora_fotos add column if not exists bucket text;
alter table public.material_fotos add column if not exists bucket text;
alter table public.tarea_entrega_archivos add column if not exists bucket text;

drop policy if exists "privado leer" on storage.objects;
create policy "privado leer" on storage.objects for select to authenticated
  using (bucket_id = 'privado' and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente'))
    or ((storage.foldername(name))[1] = 'tareas'
        and exists (select 1 from public.ninos_padres np where np.padre_id = auth.uid() and np.nino_id::text = (storage.foldername(name))[3]))
  ));

drop policy if exists "privado subir" on storage.objects;
create policy "privado subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'privado' and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente'))
    or ((storage.foldername(name))[1] = 'tareas'
        and exists (select 1 from public.ninos_padres np where np.padre_id = auth.uid() and np.nino_id::text = (storage.foldername(name))[3]))
  ));

drop policy if exists "privado borrar" on storage.objects;
create policy "privado borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'privado' and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente'))
    or ((storage.foldername(name))[1] = 'tareas'
        and exists (select 1 from public.ninos_padres np where np.padre_id = auth.uid() and np.nino_id::text = (storage.foldername(name))[3]))
  ));
