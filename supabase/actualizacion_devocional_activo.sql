-- ============================================================
-- Actualización: devocional activo (destacado del día/semana)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

alter table public.devocionales_ninos
  add column if not exists activo boolean not null default false;

comment on column public.devocionales_ninos.activo is 'true = es el devocional destacado del momento (del día/semana). Solo debería haber uno activo a la vez; la app se encarga de desmarcar los demás al activar uno nuevo.';
