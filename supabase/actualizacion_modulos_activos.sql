-- Agrega el campo de módulos activos a config_iglesia.
-- modulos_activos es un array JSON de claves, ej: ["devocionales","asistencia","foro"]
-- Cuando es null, todos los módulos están activos.
-- Seguro de correr varias veces (no borra nada).

alter table public.config_iglesia
  add column if not exists modulos_activos jsonb;
