-- Agrega campo para la estructura de menú categorizada
-- menu_estructura es un array JSON de categorías, cada una con nombre, icono e items (rutas)
-- Ejemplo: [{"nombre":"Contenido","icon":"📚","items":["/devocionales","/actividades"]}]
-- Cuando es null, el menú se muestra plano (sin categorías)

alter table public.config_iglesia
  add column if not exists menu_estructura jsonb;
