-- ============================================================
-- Actualización: días de clase + cobertura por fecha puntual
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

-- ---------- DIAS_CLASE ----------

create table if not exists public.dias_clase (
  dia_semana int primary key check (dia_semana between 0 and 6),
  activo boolean not null default false
);
comment on table public.dias_clase is '0=domingo … 6=sábado. Qué días de la semana son día de clase — patrón recurrente, configurable por admin/coordinador en Ajustes.';

alter table public.dias_clase enable row level security;

drop policy if exists "leer dias_clase" on public.dias_clase;
create policy "leer dias_clase" on public.dias_clase for select to authenticated using (true);

drop policy if exists "gestionar dias_clase" on public.dias_clase;
create policy "gestionar dias_clase" on public.dias_clase for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.dias_clase (dia_semana, activo)
select * from (values
  (0, true), (1, false), (2, false), (3, false), (4, false), (5, false), (6, false)
) as v(dia_semana, activo)
where not exists (select 1 from public.dias_clase);

-- ---------- COBERTURA_DIA ----------

create table if not exists public.cobertura_dia (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  fecha date not null,
  docente_id uuid references public.profiles(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nivel_id, fecha)
);
comment on table public.cobertura_dia is 'Quién cubre de verdad cada clase en una fecha puntual (ej. un suplente). Si no hay fila para ese nivel+fecha, se asume el/los docente(s) fijo(s) de docentes_niveles.';

alter table public.cobertura_dia enable row level security;

drop policy if exists "leer cobertura_dia" on public.cobertura_dia;
create policy "leer cobertura_dia" on public.cobertura_dia for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));

drop policy if exists "gestionar cobertura_dia" on public.cobertura_dia;
create policy "gestionar cobertura_dia" on public.cobertura_dia for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));
