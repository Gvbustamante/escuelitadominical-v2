-- Planeación con varios archivos (PDF, Word, PowerPoint, imágenes).
-- Requiere antes: actualizacion_planeacion_clase.sql y actualizacion_planeaciones_privado.sql
-- Pasa el PDF único anterior (planeacion_clase.pdf_path) a la nueva tabla. Idempotente.

create table if not exists public.planeacion_archivos (
  id uuid primary key default gen_random_uuid(),
  planeacion_id uuid not null references public.planeacion_clase(id) on delete cascade,
  storage_path text not null,
  nombre text not null,
  tipo text,
  tamano bigint,
  created_at timestamptz not null default now()
);
comment on table public.planeacion_archivos is 'Archivos de una planeación. Bucket privado planeaciones (rutas antiguas planeaciones/... están en actividades).';
create index if not exists planeacion_archivos_planeacion_idx on public.planeacion_archivos (planeacion_id);

alter table public.planeacion_archivos enable row level security;

drop policy if exists "leer planeacion_archivos" on public.planeacion_archivos;
create policy "leer planeacion_archivos" on public.planeacion_archivos for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente')));

drop policy if exists "gestionar planeacion_archivos" on public.planeacion_archivos;
create policy "gestionar planeacion_archivos" on public.planeacion_archivos for all to authenticated
  using (exists (
    select 1 from public.planeacion_clase pc where pc.id = planeacion_archivos.planeacion_id and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador'))
      or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = pc.nivel_id and dn.docente_id = auth.uid()))))
  with check (exists (
    select 1 from public.planeacion_clase pc where pc.id = planeacion_archivos.planeacion_id and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador'))
      or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = pc.nivel_id and dn.docente_id = auth.uid()))));

-- Más tipos de archivo en el bucket privado (máx. 20 MB).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/*'
]
where id = 'planeaciones';

-- Pasar el PDF único anterior a la nueva tabla.
insert into public.planeacion_archivos (planeacion_id, storage_path, nombre, tipo)
select pc.id, pc.pdf_path, coalesce(pc.pdf_nombre, 'Planeación.pdf'), 'application/pdf'
from public.planeacion_clase pc
where pc.pdf_path is not null
  and not exists (select 1 from public.planeacion_archivos pa where pa.storage_path = pc.pdf_path);
update public.planeacion_clase set pdf_path = null, pdf_nombre = null where pdf_path is not null;
