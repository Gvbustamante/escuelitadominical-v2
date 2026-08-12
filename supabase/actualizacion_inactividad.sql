-- ============================================================
-- Actualización: revisar inactividad (pausar niños y padres)
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Requiere haber corrido antes actualizacion_tareas_estrellas.sql
-- (usa la columna ninos.pausado que ese archivo agrega).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

-- ---------- PROFILES: pausado ----------

alter table public.profiles
  add column if not exists pausado boolean not null default false;

comment on column public.profiles.pausado is 'Marca visual, no bloquea el login. Para un padre: la cuenta lleva mucho tiempo sin entrar (ver revisar_inactividad()). Se limpia sola la próxima vez que esa persona entra.';

-- ---------- FUNCIÓN: revisar inactividad ----------

create or replace function public.revisar_inactividad()
returns table (ninos_pausados int, padres_pausados int)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role text;
  n_count int;
  p_count int;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role is null or caller_role not in ('admin','coordinador') then
    raise exception 'No autorizado';
  end if;

  with pausados_ninos as (
    update public.ninos n
    set pausado = true
    where n.pausado = false
      and n.activo = true
      and exists (select 1 from public.asistencia a where a.nino_id = n.id and a.presente = true)
      and not exists (
        select 1 from public.asistencia a
        where a.nino_id = n.id and a.presente = true and a.fecha >= (current_date - interval '3 months')
      )
    returning n.id
  )
  select count(*) into n_count from pausados_ninos;

  with pausados_padres as (
    update public.profiles p
    set pausado = true
    where p.role = 'padre'
      and p.activo = true
      and p.pausado = false
      and exists (
        select 1 from auth.users u
        where u.id = p.id
          and coalesce(u.last_sign_in_at, u.created_at) < (now() - interval '2 months')
      )
    returning p.id
  )
  select count(*) into p_count from pausados_padres;

  return query select n_count, p_count;
end;
$$;
