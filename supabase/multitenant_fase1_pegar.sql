-- MULTI-TENANT FASE 1 · ÚLTIMA PARTE (base de PRUEBAS). Pegar en el SQL Editor y Run.
-- Lo demás ya lo aplicó Claude el 2/oct. Esta parte cambia llaves (borra la regla vieja "un solo
-- día/permiso en toda la base" y la pone por iglesia); el conector no deja que Claude la corra.
alter table public.horarios drop constraint if exists horarios_dia_semana_fkey;
alter table public.dias_clase drop constraint if exists dias_clase_pkey;
alter table public.dias_clase add constraint dias_clase_pkey primary key (iglesia_id, dia_semana);
alter table public.horarios add constraint horarios_dia_semana_fkey
  foreign key (iglesia_id, dia_semana) references public.dias_clase (iglesia_id, dia_semana);

alter table public.citas_biblicas drop constraint if exists citas_biblicas_fecha_mostrar_key;
create unique index if not exists citas_biblicas_iglesia_fecha_key on public.citas_biblicas (iglesia_id, fecha_mostrar);

alter table public.permisos_rol drop constraint if exists permisos_rol_rol_permiso_key;
create unique index if not exists permisos_rol_iglesia_rol_permiso_key on public.permisos_rol (iglesia_id, rol, permiso);

drop index if exists public.excepciones_clase_unica;
create unique index excepciones_clase_unica on public.excepciones_clase (iglesia_id, fecha, coalesce(nivel_id, '00000000-0000-0000-0000-000000000000'::uuid));

create unique index if not exists config_iglesia_una_por_iglesia on public.config_iglesia (iglesia_id);

select 'Listo ✅' as resultado;
