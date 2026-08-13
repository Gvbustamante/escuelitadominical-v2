-- ============================================================
-- Actualización: página extendida de devocional (archivos + reacciones)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

create table if not exists public.devocional_archivos (
  id uuid primary key default gen_random_uuid(),
  devocional_id uuid references public.devocionales_ninos(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  tipo text,
  created_at timestamptz not null default now()
);
comment on table public.devocional_archivos is 'Archivos descargables de un devocional (guías, hojas de actividad, etc.), aparte de la imagen principal (devocionales_ninos.imagen_url).';

alter table public.devocional_archivos enable row level security;

drop policy if exists "leer archivos de devocional" on public.devocional_archivos;
create policy "leer archivos de devocional" on public.devocional_archivos for select to authenticated using (true);

drop policy if exists "gestionar archivos de devocional" on public.devocional_archivos;
create policy "gestionar archivos de devocional" on public.devocional_archivos for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));

create table if not exists public.devocional_reacciones (
  id uuid primary key default gen_random_uuid(),
  devocional_id uuid references public.devocionales_ninos(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete cascade,
  tipo text not null default '❤️',
  created_at timestamptz not null default now(),
  unique (devocional_id, usuario_id)
);

alter table public.devocional_reacciones enable row level security;

drop policy if exists "leer reacciones de devocional" on public.devocional_reacciones;
create policy "leer reacciones de devocional" on public.devocional_reacciones for select to authenticated using (true);

drop policy if exists "gestionar propia reaccion de devocional" on public.devocional_reacciones;
create policy "gestionar propia reaccion de devocional" on public.devocional_reacciones for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- No hace falta storage nuevo: los archivos de devocional se guardan en el
-- mismo bucket público "actividades" (prefijo devocionales-archivos/...),
-- que ya deja subir/leer/borrar a cualquier staff (admin/coordinador/docente).
