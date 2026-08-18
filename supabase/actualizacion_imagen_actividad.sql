-- ============================================================
-- Actividades: imagen principal (portada), igual que ya tienen
-- los devocionales (devocionales_ninos.imagen_url).
-- Para proyectos de Supabase que YA están en producción.
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

alter table public.actividades add column if not exists imagen_url text;
comment on column public.actividades.imagen_url is 'Imagen principal (portada) de la actividad, aparte de las fotos/archivos adjuntos en actividad_archivos.';
