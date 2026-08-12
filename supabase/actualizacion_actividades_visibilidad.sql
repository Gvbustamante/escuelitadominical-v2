-- ============================================================
-- Actualización: visibilidad de actividades para padres/niños
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (no borra ni modifica datos
-- existentes). Las actividades que ya existen quedan "visibles"
-- (visible_padres=true), igual que se veían antes de este cambio.
-- ============================================================

alter table public.actividades add column if not exists visible_padres boolean not null default true;
comment on column public.actividades.visible_padres is 'false = solo la ve staff (admin/coordinador/docente); los padres/niños no la ven aunque sea de su clase y ya haya pasado.';

drop policy if exists "leer actividades" on public.actividades;
create policy "leer actividades" on public.actividades for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or (
      actividades.visible_padres
      and exists (
        select 1 from public.ninos_padres np join public.ninos n on n.id = np.nino_id
        where np.padre_id = auth.uid() and n.nivel_id = actividades.nivel_id
      )
    )
  );
