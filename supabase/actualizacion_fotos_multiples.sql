-- ============================================================
-- Actualización: varias fotos/archivos en Bitácora, Materiales y
-- evidencia de tarea (antes solo permitían una)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Requiere haber corrido antes actualizacion_actividades_docentes.sql
-- (usa la columna tarea_entregas.docente_id que ese archivo agrega).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
--
-- No se toca ni se borra nada de lo que ya existía: bitacora_clase.
-- salon_foto_url/refrigerio_foto_url, materiales.foto_url y
-- tarea_entregas.archivo_url se quedan como estaban (legacy, una sola
-- foto de antes de esta actualización) — las fotos nuevas se guardan
-- en las tablas nuevas de abajo, y la app muestra las dos juntas.
-- ============================================================

create table if not exists public.bitacora_fotos (
  id uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacora_clase(id) on delete cascade,
  tipo text not null check (tipo in ('salon','refrigerio')),
  storage_path text not null,
  nombre_archivo text,
  mime text,
  created_at timestamptz not null default now()
);
comment on table public.bitacora_fotos is 'Fotos adicionales de una bitácora (salón o refrigerio) — puede haber varias por bitácora. bitacora_clase.salon_foto_url/refrigerio_foto_url quedan como legacy (una sola foto, de antes de esta tabla).';

alter table public.bitacora_fotos enable row level security;

drop policy if exists "leer fotos de bitacora" on public.bitacora_fotos;
create policy "leer fotos de bitacora" on public.bitacora_fotos for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.bitacora_clase b join public.docentes_niveles dn on dn.nivel_id = b.nivel_id
      where b.id = bitacora_fotos.bitacora_id and dn.docente_id = auth.uid()
    )
  );

drop policy if exists "gestionar fotos de bitacora" on public.bitacora_fotos;
create policy "gestionar fotos de bitacora" on public.bitacora_fotos for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.bitacora_clase b join public.docentes_niveles dn on dn.nivel_id = b.nivel_id
      where b.id = bitacora_fotos.bitacora_id and dn.docente_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.bitacora_clase b join public.docentes_niveles dn on dn.nivel_id = b.nivel_id
      where b.id = bitacora_fotos.bitacora_id and dn.docente_id = auth.uid()
    )
  );

create table if not exists public.material_fotos (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiales(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  tipo text,
  created_at timestamptz not null default now()
);
comment on table public.material_fotos is 'Fotos adicionales de un material — puede haber varias por material. materiales.foto_url queda como legacy (una sola foto, de antes de esta tabla).';

alter table public.material_fotos enable row level security;

drop policy if exists "leer fotos de materiales" on public.material_fotos;
create policy "leer fotos de materiales" on public.material_fotos for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));

drop policy if exists "gestionar fotos de materiales" on public.material_fotos;
create policy "gestionar fotos de materiales" on public.material_fotos for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

create table if not exists public.tarea_entrega_archivos (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.tarea_entregas(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  tipo text,
  created_at timestamptz not null default now()
);
comment on table public.tarea_entrega_archivos is 'Archivos adicionales de una entrega de tarea — puede haber varios por entrega. tarea_entregas.archivo_url queda como legacy (un solo archivo, de antes de esta tabla).';

alter table public.tarea_entrega_archivos enable row level security;

drop policy if exists "leer archivos de entrega" on public.tarea_entrega_archivos;
create policy "leer archivos de entrega" on public.tarea_entrega_archivos for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.tarea_entregas te
      join public.actividades a on a.id = te.actividad_id
      join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where te.id = tarea_entrega_archivos.entrega_id and dn.docente_id = auth.uid()
    )
    or exists (
      select 1 from public.tarea_entregas te join public.ninos_padres np on np.nino_id = te.nino_id
      where te.id = tarea_entrega_archivos.entrega_id and np.padre_id = auth.uid()
    )
    or exists (select 1 from public.tarea_entregas te where te.id = tarea_entrega_archivos.entrega_id and te.docente_id = auth.uid())
  );

drop policy if exists "gestionar archivos de entrega" on public.tarea_entrega_archivos;
create policy "gestionar archivos de entrega" on public.tarea_entrega_archivos for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.tarea_entregas te
      join public.actividades a on a.id = te.actividad_id
      join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where te.id = tarea_entrega_archivos.entrega_id and dn.docente_id = auth.uid()
    )
    or exists (
      select 1 from public.tarea_entregas te join public.ninos_padres np on np.nino_id = te.nino_id
      where te.id = tarea_entrega_archivos.entrega_id and np.padre_id = auth.uid()
    )
    or exists (select 1 from public.tarea_entregas te where te.id = tarea_entrega_archivos.entrega_id and te.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.tarea_entregas te
      join public.actividades a on a.id = te.actividad_id
      join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where te.id = tarea_entrega_archivos.entrega_id and dn.docente_id = auth.uid()
    )
    or exists (
      select 1 from public.tarea_entregas te join public.ninos_padres np on np.nino_id = te.nino_id
      where te.id = tarea_entrega_archivos.entrega_id and np.padre_id = auth.uid()
    )
    or exists (select 1 from public.tarea_entregas te where te.id = tarea_entrega_archivos.entrega_id and te.docente_id = auth.uid())
  );
