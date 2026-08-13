-- ============================================================
-- Actualización: permiso para que el docente elija su propia clase
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Requiere haber corrido antes actualizacion_permisos.sql
-- (usa la tabla permisos_rol y la función tiene_permiso que ese
-- archivo crea).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

insert into public.permisos_rol (rol, permiso, activo) values
  ('docente', 'elegir_clase', false)
on conflict (rol, permiso) do nothing;

drop policy if exists "docente elige su clase si tiene permiso" on public.docentes_niveles;
create policy "docente elige su clase si tiene permiso" on public.docentes_niveles for insert to authenticated
  with check (docente_id = auth.uid() and public.tiene_permiso('docente', 'elegir_clase'));

drop policy if exists "docente sale de su clase si tiene permiso" on public.docentes_niveles;
create policy "docente sale de su clase si tiene permiso" on public.docentes_niveles for delete to authenticated
  using (docente_id = auth.uid() and public.tiene_permiso('docente', 'elegir_clase'));
