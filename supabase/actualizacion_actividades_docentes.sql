-- ============================================================
-- Actualización: actividades para el equipo docente + editor de texto
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Requiere haber corrido antes actualizacion_tareas_estrellas.sql
-- (crea la tabla tarea_entregas que este archivo modifica).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

-- ---------- ACTIVIDADES: audiencia ----------
-- 'ninos' = actividad normal de una clase. 'docentes' = comunicado/tarea
-- para el equipo docente (sin nivel_id), la crea admin/coordinador y la
-- ve cualquier docente. No requiere cambios de RLS: "leer actividades" ya
-- deja leer cualquier fila a admin/coordinador/docente, y "gestionar
-- actividades" ya solo permite escribir a admin/coordinador cuando
-- nivel_id es null (un docente nunca calza con nivel_id = null).

alter table public.actividades
  add column if not exists audiencia text not null default 'ninos' check (audiencia in ('ninos','docentes'));

comment on column public.actividades.audiencia is '''ninos'' = actividad normal de una clase (nivel_id obligatorio en la práctica). ''docentes'' = comunicado/tarea para el equipo docente, sin nivel_id, la crea admin/coordinador y la ve cualquier docente.';
comment on column public.actividades.es_tarea is 'true = además de informativa, pide una entrega de cada niño del nivel (ver tarea_entregas). Si audiencia=docentes, cada docente marca su propia entrega en vez de cada niño.';

-- ---------- TAREA_ENTREGAS: una fila también puede ser de un docente ----------

alter table public.tarea_entregas
  alter column nino_id drop not null;

alter table public.tarea_entregas
  add column if not exists docente_id uuid references public.profiles(id) on delete cascade;

alter table public.tarea_entregas
  drop constraint if exists tarea_entregas_nino_o_docente_check;
alter table public.tarea_entregas
  add constraint tarea_entregas_nino_o_docente_check check (
    (nino_id is not null and docente_id is null) or (nino_id is null and docente_id is not null)
  );

alter table public.tarea_entregas
  drop constraint if exists tarea_entregas_actividad_id_docente_id_key;
alter table public.tarea_entregas
  add constraint tarea_entregas_actividad_id_docente_id_key unique (actividad_id, docente_id);

comment on table public.tarea_entregas is 'Una fila por niño (actividad audiencia=ninos) o por docente (audiencia=docentes) para cada actividad marcada como tarea (es_tarea=true). Exactamente uno de nino_id/docente_id va lleno. estado: pendiente (sin acción), pausada (el docente la puso en espera — solo aplica a niños), entregada (el padre subió evidencia, o el docente se marcó como hecho).';

drop policy if exists "leer tarea_entregas" on public.tarea_entregas;
create policy "leer tarea_entregas" on public.tarea_entregas for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or tarea_entregas.docente_id = auth.uid()
  );

drop policy if exists "padre entrega su tarea" on public.tarea_entregas;
create policy "padre entrega su tarea" on public.tarea_entregas for insert to authenticated
  with check (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or tarea_entregas.docente_id = auth.uid()
  );

drop policy if exists "actualizar tarea_entregas propia o staff" on public.tarea_entregas;
create policy "actualizar tarea_entregas propia o staff" on public.tarea_entregas for update to authenticated
  using (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or tarea_entregas.docente_id = auth.uid()
  )
  with check (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or tarea_entregas.docente_id = auth.uid()
  );
