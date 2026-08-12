-- ============================================================
-- Actualización: horarios (varios servicios el mismo día)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Requiere haber corrido antes actualizacion_dias_clase.sql
-- (usa la tabla cobertura_dia que ese archivo crea).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

-- ---------- HORARIOS ----------

create table if not exists public.horarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  hora time,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.horarios is 'Horarios/servicios del mismo día de clase (ej. "9:00 am", "11:00 am"). Toda iglesia arranca con uno solo ("Servicio único"); el admin agrega más si tiene varios servicios.';

alter table public.horarios enable row level security;

drop policy if exists "leer horarios" on public.horarios;
create policy "leer horarios" on public.horarios for select to authenticated using (true);

drop policy if exists "gestionar horarios" on public.horarios;
create policy "gestionar horarios" on public.horarios for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.horarios (nombre, orden)
select 'Servicio único', 1
where not exists (select 1 from public.horarios);

-- ---------- ASIGNACION_HORARIO ----------

create table if not exists public.asignacion_horario (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  horario_id uuid not null references public.horarios(id) on delete cascade,
  docente_id uuid references public.profiles(id) on delete set null,
  unique (nivel_id, horario_id)
);
comment on table public.asignacion_horario is 'Docente fijo que cubre cada clase en cada horario, para cuando hay más de un servicio el mismo día. Al asignarlo, la app también lo vincula en docentes_niveles si no lo estaba ya.';

alter table public.asignacion_horario enable row level security;

drop policy if exists "leer asignacion_horario" on public.asignacion_horario;
create policy "leer asignacion_horario" on public.asignacion_horario for select to authenticated using (true);

drop policy if exists "gestionar asignacion_horario" on public.asignacion_horario;
create policy "gestionar asignacion_horario" on public.asignacion_horario for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- ---------- COBERTURA_DIA: agregar horario_id ----------
-- (la tabla ya existe desde actualizacion_dias_clase.sql, con
-- unique(nivel_id, fecha) — hay que ampliarla a horario_id)

alter table public.cobertura_dia
  add column if not exists horario_id uuid references public.horarios(id) on delete cascade;

-- Las filas que ya existan (de antes de tener horarios) quedan en el
-- "Servicio único" por defecto.
update public.cobertura_dia
set horario_id = (select id from public.horarios order by orden limit 1)
where horario_id is null;

alter table public.cobertura_dia alter column horario_id set not null;

alter table public.cobertura_dia drop constraint if exists cobertura_dia_nivel_id_fecha_key;
alter table public.cobertura_dia drop constraint if exists cobertura_dia_nivel_id_horario_id_fecha_key;
alter table public.cobertura_dia add constraint cobertura_dia_nivel_id_horario_id_fecha_key unique (nivel_id, horario_id, fecha);

comment on table public.cobertura_dia is 'Quién cubre de verdad cada clase, en un horario y fecha puntual (ej. un suplente). Si no hay fila para ese nivel+horario+fecha, se asume el docente fijo de asignacion_horario.';
