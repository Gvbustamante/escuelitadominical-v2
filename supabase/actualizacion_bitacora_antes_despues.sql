-- ============================================================
-- Actualización: bitácora antes/después de clase
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

alter table public.bitacora_clase
  add column if not exists momento text not null default 'despues' check (momento in ('antes','despues'));

comment on column public.bitacora_clase.momento is '''antes'' = cómo se encontró el salón al llegar. ''despues'' = cómo se entrega el salón al terminar la clase (incluye refrigerio).';
comment on table public.bitacora_clase is 'Constancia por clase y fecha, una fila por momento (antes de clase / después de clase): estado del salón (con foto), refrigerio dado (con foto, solo aplica a "despues") y notas generales.';

-- Las bitácoras que ya existían no tenían momento — quedan como "despues"
-- por el default de arriba, que es lo más parecido a lo que ya se venía
-- registrando (estado del salón + refrigerio al terminar la clase).

alter table public.bitacora_clase
  drop constraint if exists bitacora_clase_nivel_id_fecha_key;
alter table public.bitacora_clase
  drop constraint if exists bitacora_clase_nivel_id_fecha_momento_key;
alter table public.bitacora_clase
  add constraint bitacora_clase_nivel_id_fecha_momento_key unique (nivel_id, fecha, momento);
