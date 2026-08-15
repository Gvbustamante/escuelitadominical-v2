-- ============================================================
-- Actualización: cada horario/servicio se puede asociar a un día de
-- la semana específico (ej. 3 servicios el domingo, 1 el sábado).
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo, que ya
-- incluye esta columna).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
--
-- Antes, "horarios" era una sola lista global (ej. 9:00am, 11:00am,
-- 1:00pm) que se mostraba igual en Planeación y en "Cobertura de hoy"
-- sin importar qué día de clase fuera — si esos 3 horarios eran los
-- del domingo, también aparecían (mal) en un sábado con un solo
-- servicio.
--
-- Ahora cada horario puede llevar un día de la semana (dia_semana,
-- 0=domingo…6=sábado). Los horarios que ya existían quedan con
-- dia_semana = NULL, que significa "aplica a todos los días de
-- clase" — o sea, ninguna iglesia que solo tenga un horario (o el
-- mismo horario todos los días) tiene que cambiar nada; el filtro
-- por día es opcional, solo para cuando de verdad varía.
-- ============================================================

alter table public.horarios add column if not exists dia_semana int references public.dias_clase(dia_semana);
comment on column public.horarios.dia_semana is 'A qué día de la semana aplica este horario (0=domingo…6=sábado). null = aplica a todos los días de clase — así una iglesia con el mismo horario todos los días no tiene que configurar nada. Sirve para el caso de, ej., 3 servicios el domingo pero solo 1 el sábado: los 3 de domingo llevan dia_semana=0, y el del sábado dia_semana=6, así Planeación y Cobertura de hoy no mezclan los de un día con los de otro.';
