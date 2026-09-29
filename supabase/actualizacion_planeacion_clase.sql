-- Planeación de cada clase: por nivel y fecha, el docente escribe la planeación
-- (texto enriquecido) y/o sube un PDF. Una sola planeación por clase y día.
-- Seguro de correr varias veces.

create table if not exists public.planeacion_clase (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  fecha date not null,
  contenido text,
  pdf_path text,
  pdf_nombre text,
  autor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nivel_id, fecha)
);
comment on table public.planeacion_clase is 'Planeación escrita (HTML de RichTextEditor) y/o PDF de una clase (nivel) en una fecha. PDF en bucket actividades, carpeta planeaciones/.';

alter table public.planeacion_clase enable row level security;

drop policy if exists "leer planeacion_clase" on public.planeacion_clase;
create policy "leer planeacion_clase" on public.planeacion_clase for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador','docente')));

drop policy if exists "gestionar planeacion_clase" on public.planeacion_clase;
create policy "gestionar planeacion_clase" on public.planeacion_clase for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = planeacion_clase.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = planeacion_clase.nivel_id and dn.docente_id = auth.uid())
  );
