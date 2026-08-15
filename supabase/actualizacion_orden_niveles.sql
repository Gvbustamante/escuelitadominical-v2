-- ============================================================
-- Actualización: orden manual de las clases (niveles.orden)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo, que ya
-- incluye esta columna).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
--
-- Antes, las pantallas de Clases y Planeación mostraban las clases
-- ordenadas por edad mínima (edad_min). Ahora el admin/coordinador
-- puede reordenarlas a mano con las flechas ▲▼ en Clases, y ese orden
-- es el que se usa en las dos pantallas.
-- ============================================================

alter table public.niveles add column if not exists orden int not null default 0;
comment on column public.niveles.orden is 'Orden manual en que se muestran las clases (Clases, Planeación). Lo gestiona el admin con las flechas ↑/↓; no tiene que ver con edad_min/edad_max.';

-- Numera las clases que ya existían según su orden actual (por edad, luego
-- nombre) para que el cambio no las deje todas en 0 / desordenadas.
-- Solo toca las que todavía están en 0 (o sea, las que existían antes de
-- que esta columna se agregara) — si ya reordenaste algo a mano después
-- de correr esto una vez, no lo vuelve a pisar.
with numeradas as (
  select id, row_number() over (order by edad_min asc nulls last, nombre asc) as rn
  from public.niveles
  where orden = 0
)
update public.niveles n
set orden = numeradas.rn
from numeradas
where n.id = numeradas.id;
