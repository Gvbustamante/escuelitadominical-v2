-- ============================================================
-- Drive: papelera (soft-delete) — agregar columna eliminado_at
-- Para proyectos que YA tienen las tablas carpetas_drive y archivos_drive.
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.carpetas_drive
  ADD COLUMN IF NOT EXISTS eliminado_at timestamptz;

COMMENT ON COLUMN public.carpetas_drive.eliminado_at IS
  'Soft-delete: si tiene valor, la carpeta está en la papelera.';

ALTER TABLE public.archivos_drive
  ADD COLUMN IF NOT EXISTS eliminado_at timestamptz;

COMMENT ON COLUMN public.archivos_drive.eliminado_at IS
  'Soft-delete: si tiene valor, el archivo está en la papelera.';
