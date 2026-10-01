-- Días de clase por nivel: qué días de la semana tiene clase cada nivel (0 = domingo … 6 = sábado).
-- null o vacío = todos los días de clase activos de la escuelita. Idempotente.
alter table public.niveles add column if not exists dias_semana smallint[];
comment on column public.niveles.dias_semana is 'Días (0=dom..6=sáb) en que el nivel tiene clase. null = todos los días activos de dias_clase.';
