-- MULTI-TENANT · FASE 1 (base de datos) — SOLO en la base de PRUEBAS (vzcwporahatctqddphto).
-- Correr completo en el SQL Editor. Idempotente: se puede volver a correr.
-- Qué hace:
--   1. Respaldo de todas las tablas (schema respaldo_mt_fase1).
--   2. Tablas planes, iglesias, plataforma_admins.
--   3. iglesia_id en 41 tablas. Los datos actuales quedan en la iglesia "Sharat".
--   4. Aislamiento: política RESTRICTIVA por tabla (iglesia_id = mi_iglesia()). Las políticas actuales no se tocan.
--   5. Únicos por iglesia (dias_clase, citas_biblicas, permisos_rol, excepciones_clase, config_iglesia).
--   6. Funciones de cuentas filtradas por iglesia + límites del plan (gratis: 2 docentes, 25 niños).
--   7. Dueña de la plataforma: ver todas las iglesias y "entrar" a cualquiera.
-- Bumblebee (bumblebee_*) y pqr_revisores no se tocan.

begin;

-- ---------- 1. RESPALDO ----------
create schema if not exists respaldo_mt_fase1;
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'bumblebee_%'
  loop
    if to_regclass('respaldo_mt_fase1.' || quote_ident(t)) is null then
      execute format('create table respaldo_mt_fase1.%I as table public.%I', t, t);
    end if;
  end loop;
end $$;
revoke all on schema respaldo_mt_fase1 from anon, authenticated;

-- ---------- 2. PLANES, IGLESIAS, DUEÑA ----------
create table if not exists public.planes (
  id text primary key,
  nombre text not null,
  max_docentes int,            -- null = sin límite
  max_ninos int,               -- null = sin límite
  modulos text[],              -- null = todos
  orden int default 0,
  activo boolean not null default true
);
insert into public.planes (id, nombre, max_docentes, max_ninos, modulos, orden) values
  ('gratis', 'Gratis', 2, 25, array['asistencia','devocionales','actividades','agenda','progreso'], 1),
  ('completo', 'Completo', null, null, null, 9)
on conflict (id) do nothing;
comment on table public.planes is 'Planes. max_docentes cuenta docentes + coordinadores activos. Precios: pendiente de decidir.';

create table if not exists public.iglesias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  estado text not null default 'demo' check (estado in ('demo','activa','suspendida')),
  plan_id text not null default 'gratis' references public.planes(id),
  demo_hasta date,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.plataforma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  viendo_iglesia uuid references public.iglesias(id) on delete set null, -- iglesia que está revisando (null = la suya)
  created_at timestamptz not null default now()
);

-- Iglesia de los datos actuales.
insert into public.iglesias (id, nombre, estado, plan_id)
values ('a0000000-0000-4000-8000-000000000001',
        coalesce((select nullif(trim(nombre_iglesia), '') from public.config_iglesia limit 1), 'Sharat'),
        'activa', 'completo')
on conflict (id) do nothing;

-- Gisella = dueña de la plataforma.
insert into public.plataforma_admins (user_id)
select '31762d99-3f07-4022-bd9a-a112f1fd0c08' where exists (select 1 from auth.users where id = '31762d99-3f07-4022-bd9a-a112f1fd0c08')
on conflict do nothing;

-- ---------- 3. FUNCIONES BASE ----------
-- Necesitan profiles.iglesia_id: se crea aquí (el resto de tablas, en el paso 4).
alter table public.profiles add column if not exists iglesia_id uuid references public.iglesias(id) on delete restrict;

create or replace function public.es_plataforma_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plataforma_admins where user_id = auth.uid());
$$;

-- Iglesia del perfil (la real, sin "entrar a revisar").
create or replace function public.iglesia_de_perfil() returns uuid
language sql stable security definer set search_path = public as $$
  select iglesia_id from public.profiles where id = auth.uid();
$$;

-- Iglesia con la que trabaja el usuario: la suya, o la que la dueña está revisando.
create or replace function public.mi_iglesia() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select viendo_iglesia from public.plataforma_admins where user_id = auth.uid()),
    (select iglesia_id from public.profiles where id = auth.uid())
  );
$$;

-- ---------- 4. iglesia_id EN CADA TABLA + AISLAMIENTO ----------
do $$
declare
  t text;
  sharat constant uuid := 'a0000000-0000-4000-8000-000000000001';
  tablas text[] := array[
    'actividad_archivos','actividad_reacciones','actividades','agenda','archivos_drive','asignacion_horario',
    'asistencia','bitacora_clase','bitacora_fotos','carpetas_drive','citas_biblicas','cobertura_dia',
    'config_iglesia','devocional_archivos','devocional_reacciones','devocionales_ninos','dias_clase',
    'docentes_niveles','excepciones_clase','foro_mensajes','foros','horarios','material_fotos','materiales',
    'motivos_reconocimiento','ninos','ninos_padres','niveles','niveles_estrella','permisos_rol',
    'peticiones_oracion','planeacion_archivos','planeacion_clase','pqr','pqr_archivos','profiles',
    'progreso_notas','reconocimientos','solicitudes_reset','tarea_entrega_archivos','tarea_entregas'];
begin
  foreach t in array tablas loop
    execute format('alter table public.%I add column if not exists iglesia_id uuid references public.iglesias(id) on delete restrict', t);
    execute format('update public.%I set iglesia_id = %L where iglesia_id is null', t, sharat);
    execute format('create index if not exists %I on public.%I (iglesia_id)', t || '_iglesia_idx', t);
    if t not in ('profiles', 'solicitudes_reset') then
      execute format('alter table public.%I alter column iglesia_id set default public.mi_iglesia()', t);
      execute format('alter table public.%I alter column iglesia_id set not null', t);
    end if;
    execute format('drop policy if exists "aislamiento iglesia" on public.%I', t);
    if t in ('pqr', 'pqr_archivos') then
      -- Las revisoras de PQR ven las de todas las iglesias.
      execute format('create policy "aislamiento iglesia" on public.%I as restrictive for all to authenticated
        using (iglesia_id = (select public.mi_iglesia()) or (select public.es_revisor_pqr()))
        with check (iglesia_id = (select public.mi_iglesia()) or (select public.es_revisor_pqr()))', t);
    elsif t = 'profiles' then
      -- Cada quien ve su propio perfil (aunque aún no tenga iglesia) y no puede cambiarse de iglesia.
      execute 'create policy "aislamiento iglesia" on public.profiles as restrictive for all to authenticated
        using (id = auth.uid() or iglesia_id = (select public.mi_iglesia()))
        with check ((id = auth.uid() and iglesia_id is not distinct from (select public.iglesia_de_perfil()))
                    or iglesia_id = (select public.mi_iglesia()))';
    else
      execute format('create policy "aislamiento iglesia" on public.%I as restrictive for all to authenticated
        using (iglesia_id = (select public.mi_iglesia()))
        with check (iglesia_id = (select public.mi_iglesia()))', t);
    end if;
  end loop;
end $$;

-- ---------- 5. ÚNICOS POR IGLESIA ----------
alter table public.horarios drop constraint if exists horarios_dia_semana_fkey;
alter table public.dias_clase drop constraint if exists dias_clase_pkey;
alter table public.dias_clase add constraint dias_clase_pkey primary key (iglesia_id, dia_semana);
alter table public.horarios add constraint horarios_dia_semana_fkey
  foreign key (iglesia_id, dia_semana) references public.dias_clase (iglesia_id, dia_semana);

alter table public.citas_biblicas drop constraint if exists citas_biblicas_fecha_mostrar_key;
drop index if exists public.citas_biblicas_iglesia_fecha_key;
create unique index citas_biblicas_iglesia_fecha_key on public.citas_biblicas (iglesia_id, fecha_mostrar);

alter table public.permisos_rol drop constraint if exists permisos_rol_rol_permiso_key;
drop index if exists public.permisos_rol_iglesia_rol_permiso_key;
create unique index permisos_rol_iglesia_rol_permiso_key on public.permisos_rol (iglesia_id, rol, permiso);

drop index if exists public.excepciones_clase_unica;
create unique index excepciones_clase_unica on public.excepciones_clase (iglesia_id, fecha, coalesce(nivel_id, '00000000-0000-0000-0000-000000000000'::uuid));

drop index if exists public.config_iglesia_una_por_iglesia;
create unique index config_iglesia_una_por_iglesia on public.config_iglesia (iglesia_id);

-- ---------- 6. SOLICITUDES DE CONTRASEÑA (las crea alguien sin sesión) ----------
create or replace function public.solicitud_reset_iglesia() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  -- Siempre se calcula aquí (no se confía en lo que mande el formulario).
  new.iglesia_id := (select p.iglesia_id from public.profiles p join auth.users u on u.id = p.id
                     where lower(u.email) = lower(new.email) limit 1);
  return new;
end $$;
drop trigger if exists solicitud_reset_iglesia on public.solicitudes_reset;
create trigger solicitud_reset_iglesia before insert on public.solicitudes_reset
  for each row execute function public.solicitud_reset_iglesia();

-- ---------- 7. FUNCIONES EXISTENTES, AHORA POR IGLESIA ----------
create or replace function public.tiene_permiso(p_rol text, p_permiso text) returns boolean
language sql stable as $$
  select coalesce((select activo from public.permisos_rol
                   where rol = p_rol and permiso = p_permiso and iglesia_id = public.mi_iglesia()), false);
$$;

create or replace function public.admin_create_invited_user(p_cedula text, p_role text, p_nombre_completo text, p_nino_id uuid default null, p_parentesco text default null)
returns table(id uuid, password text)
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  caller_role text;
  v_iglesia uuid := public.mi_iglesia();
  new_user_id uuid;
  v_cedula text := trim(p_cedula);
  v_email text;
  v_password text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if public.es_plataforma_admin() then caller_role := 'admin'; end if;

  if caller_role is null or caller_role not in ('superadmin','admin','coordinador','docente') then
    raise exception 'No autorizado';
  end if;
  if v_iglesia is null then
    raise exception 'Tu cuenta no tiene iglesia';
  end if;
  if p_role not in ('admin','coordinador','docente','padre') then
    raise exception 'Rol invalido';
  end if;
  if caller_role = 'coordinador' and p_role not in ('docente','padre') then
    raise exception 'Un coordinador solo puede invitar docentes o padres';
  end if;
  if caller_role = 'docente' then
    if p_role <> 'padre' then
      raise exception 'Un docente solo puede invitar padres';
    end if;
    if not public.tiene_permiso('docente', 'vincular_padres') then
      raise exception 'No tienes permiso para vincular padres';
    end if;
    if p_nino_id is null or not exists (
      select 1 from public.ninos n
      join public.docentes_niveles dn on dn.nivel_id = n.nivel_id
      where n.id = p_nino_id and dn.docente_id = auth.uid()
    ) then
      raise exception 'Ese niño/a no es de tu clase';
    end if;
  end if;
  if p_role = 'padre' and p_nino_id is null then
    raise exception 'Falta nino_id para invitar a un padre';
  end if;
  if p_nino_id is not null and not exists (select 1 from public.ninos n where n.id = p_nino_id and n.iglesia_id = v_iglesia) then
    raise exception 'Ese niño/a no es de tu iglesia';
  end if;
  if v_cedula is null or v_cedula = '' then
    raise exception 'Falta la cedula';
  end if;
  if exists (select 1 from public.profiles p where p.cedula = v_cedula) then
    raise exception 'Ya existe una cuenta con esa cedula';
  end if;

  v_email := lower(regexp_replace(v_cedula, '[^a-zA-Z0-9]', '', 'g')) || '@accesskids.local';
  v_password := v_cedula || '@';
  new_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', array['email'], 'role', p_role),
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), new_user_id::text, new_user_id,
          jsonb_build_object('sub', new_user_id::text, 'email', v_email), 'email', now(), now(), now());

  insert into public.profiles (id, role, nombre_completo, cedula, iglesia_id)
  values (new_user_id, p_role, p_nombre_completo, v_cedula, v_iglesia);

  if p_role = 'padre' then
    insert into public.ninos_padres (nino_id, padre_id, parentesco, iglesia_id)
    values (p_nino_id, new_user_id, p_parentesco, v_iglesia);
  end if;

  return query select new_user_id, v_password;
end $$;

create or replace function public.admin_reset_password(p_user_id uuid) returns text
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  caller_role text;
  target_role text;
  target_cedula text;
  v_password text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if public.es_plataforma_admin() then caller_role := 'admin'; end if;
  if caller_role is null or caller_role not in ('superadmin','admin','coordinador') then
    raise exception 'No autorizado';
  end if;

  select p.role, p.cedula into target_role, target_cedula from public.profiles p
  where p.id = p_user_id and p.iglesia_id = public.mi_iglesia();
  if target_role is null then
    raise exception 'Usuario no encontrado';
  end if;
  if caller_role = 'coordinador' and target_role not in ('docente','padre') then
    raise exception 'Un coordinador solo puede restablecer contraseñas de docentes o padres';
  end if;
  if target_cedula is null or target_cedula = '' then
    raise exception 'Esta cuenta no tiene cédula registrada';
  end if;

  v_password := target_cedula || '@';
  update auth.users set encrypted_password = crypt(v_password, gen_salt('bf')), updated_at = now() where id = p_user_id;
  return v_password;
end $$;

create or replace function public.revisar_inactividad() returns table(ninos_pausados integer, padres_pausados integer)
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  caller_role text;
  v_iglesia uuid := public.mi_iglesia();
  n_count int;
  p_count int;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if public.es_plataforma_admin() then caller_role := 'admin'; end if;
  if caller_role is null or caller_role not in ('superadmin','admin','coordinador') or v_iglesia is null then
    raise exception 'No autorizado';
  end if;

  with pausados_ninos as (
    update public.ninos n set pausado = true
    where n.iglesia_id = v_iglesia and n.pausado = false and n.activo = true
      and exists (select 1 from public.asistencia a where a.nino_id = n.id and a.presente = true)
      and not exists (select 1 from public.asistencia a where a.nino_id = n.id and a.presente = true
                      and a.fecha >= (current_date - interval '3 months'))
    returning n.id
  ) select count(*) into n_count from pausados_ninos;

  with pausados_padres as (
    update public.profiles p set pausado = true
    where p.iglesia_id = v_iglesia and p.role = 'padre' and p.activo = true and p.pausado = false
      and exists (select 1 from auth.users u where u.id = p.id
                  and coalesce(u.last_sign_in_at, u.created_at) < (now() - interval '2 months'))
    returning p.id
  ) select count(*) into p_count from pausados_padres;

  return query select n_count, p_count;
end $$;

-- ---------- 8. LÍMITES DEL PLAN ----------
create or replace function public.verificar_limite_plan() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan public.planes;
  v_usados int;
begin
  if new.iglesia_id is null or coalesce(new.activo, true) = false then return new; end if;
  select pl.* into v_plan from public.iglesias i join public.planes pl on pl.id = i.plan_id where i.id = new.iglesia_id;
  if not found then return new; end if;

  if tg_table_name = 'ninos' then
    if v_plan.max_ninos is null then return new; end if;
    select count(*) into v_usados from public.ninos
      where iglesia_id = new.iglesia_id and coalesce(activo, true) and id <> new.id;
    if v_usados >= v_plan.max_ninos then
      raise exception 'LIMITE_PLAN: tu plan % permite máximo % niños activos', v_plan.nombre, v_plan.max_ninos;
    end if;
  elsif tg_table_name = 'profiles' then
    if new.role not in ('docente','coordinador') or v_plan.max_docentes is null then return new; end if;
    select count(*) into v_usados from public.profiles
      where iglesia_id = new.iglesia_id and role in ('docente','coordinador') and coalesce(activo, true) and id <> new.id;
    if v_usados >= v_plan.max_docentes then
      raise exception 'LIMITE_PLAN: tu plan % permite máximo % docentes', v_plan.nombre, v_plan.max_docentes;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists limite_plan on public.ninos;
create trigger limite_plan before insert or update of activo, iglesia_id on public.ninos
  for each row execute function public.verificar_limite_plan();
drop trigger if exists limite_plan on public.profiles;
create trigger limite_plan before insert or update of role, activo, iglesia_id on public.profiles
  for each row execute function public.verificar_limite_plan();

-- ---------- 9. IGLESIA NUEVA: datos iniciales ----------
create or replace function public.sembrar_iglesia(p_iglesia uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.dias_clase (iglesia_id, dia_semana, activo)
    select p_iglesia, d, d = 0 from generate_series(0, 6) d
    on conflict do nothing;
  insert into public.permisos_rol (iglesia_id, rol, permiso, activo)
    select p_iglesia, 'docente', x, true from unnest(array['editar_ninos','agregar_ninos','vincular_padres','elegir_clase']) x
    on conflict do nothing;
  if not exists (select 1 from public.niveles_estrella where iglesia_id = p_iglesia) then
    insert into public.niveles_estrella (iglesia_id, min_estrellas, emoji, nombre, orden) values
      (p_iglesia, 0, '🐣', 'Semilla plantada', 0), (p_iglesia, 3, '🌱', 'Brote de fe', 3),
      (p_iglesia, 7, '📖', 'Aprendiz bíblico', 7), (p_iglesia, 12, '🦁', 'Valiente de Dios', 12),
      (p_iglesia, 18, '🌟', 'Estrella bíblica', 18), (p_iglesia, 25, '👑', 'Campeón de fe', 25);
  end if;
  if not exists (select 1 from public.motivos_reconocimiento where iglesia_id = p_iglesia) then
    insert into public.motivos_reconocimiento (iglesia_id, emoji, texto, activo, orden) values
      (p_iglesia, '🌟', 'Buen comportamiento', true, 1), (p_iglesia, '📖', 'Memorizó el versículo', true, 2),
      (p_iglesia, '🤝', 'Ayudó a un compañero', true, 3), (p_iglesia, '🙌', 'Participó con entusiasmo', true, 4),
      (p_iglesia, '🎨', 'Terminó su actividad', true, 5), (p_iglesia, '💛', 'Buena actitud', true, 6);
  end if;
  if not exists (select 1 from public.horarios where iglesia_id = p_iglesia) then
    insert into public.horarios (iglesia_id, nombre, activo, orden) values (p_iglesia, 'Servicio único', true, 1);
  end if;
  insert into public.config_iglesia (iglesia_id, nombre_iglesia)
    select p_iglesia, i.nombre from public.iglesias i where i.id = p_iglesia
    on conflict do nothing;
end $$;
revoke execute on function public.sembrar_iglesia(uuid) from public, anon, authenticated;

-- ---------- 10. PANEL DE LA DUEÑA ----------
-- Crear iglesia (la cuenta admin se crea en la fase 2 con el registro).
create or replace function public.crear_iglesia(p_nombre text, p_plan text default 'gratis', p_dias_demo int default 30) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.es_plataforma_admin() then raise exception 'No autorizado'; end if;
  insert into public.iglesias (nombre, plan_id, estado, demo_hasta)
  values (trim(p_nombre), p_plan, 'demo', current_date + p_dias_demo)
  returning id into v_id;
  perform public.sembrar_iglesia(v_id);
  return v_id;
end $$;

-- Entrar a revisar una iglesia (null = volver a la propia). Toda la app pasa a mostrar esa iglesia.
create or replace function public.entrar_iglesia(p_iglesia uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_plataforma_admin() then raise exception 'No autorizado'; end if;
  if p_iglesia is not null and not exists (select 1 from public.iglesias where id = p_iglesia) then
    raise exception 'Iglesia no encontrada';
  end if;
  update public.plataforma_admins
     set viendo_iglesia = case when p_iglesia = public.iglesia_de_perfil() then null else p_iglesia end
   where user_id = auth.uid();
end $$;

-- Resumen de todas las iglesias.
create or replace function public.resumen_iglesias()
returns table(id uuid, nombre text, estado text, plan_id text, plan_nombre text, demo_hasta date, created_at timestamptz,
              ninos bigint, docentes bigint, padres bigint, admins bigint, ultimo_acceso timestamptz,
              max_ninos int, max_docentes int)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.es_plataforma_admin() then raise exception 'No autorizado'; end if;
  return query
  select i.id, i.nombre, i.estado, i.plan_id, pl.nombre, i.demo_hasta, i.created_at,
    (select count(*) from public.ninos n where n.iglesia_id = i.id and coalesce(n.activo, true)),
    (select count(*) from public.profiles p where p.iglesia_id = i.id and p.role in ('docente','coordinador') and coalesce(p.activo, true)),
    (select count(*) from public.profiles p where p.iglesia_id = i.id and p.role = 'padre' and coalesce(p.activo, true)),
    (select count(*) from public.profiles p where p.iglesia_id = i.id and p.role in ('admin','superadmin')),
    (select max(u.last_sign_in_at) from auth.users u join public.profiles p on p.id = u.id where p.iglesia_id = i.id),
    pl.max_ninos, pl.max_docentes
  from public.iglesias i join public.planes pl on pl.id = i.plan_id
  order by i.created_at;
end $$;

-- ---------- 11. PERMISOS DE LAS TABLAS NUEVAS ----------
alter table public.planes enable row level security;
alter table public.iglesias enable row level security;
alter table public.plataforma_admins enable row level security;

drop policy if exists "leer planes" on public.planes;
create policy "leer planes" on public.planes for select to anon, authenticated using (true);
drop policy if exists "dueña gestiona planes" on public.planes;
create policy "dueña gestiona planes" on public.planes for all to authenticated
  using ((select public.es_plataforma_admin())) with check ((select public.es_plataforma_admin()));

drop policy if exists "leer mi iglesia" on public.iglesias;
create policy "leer mi iglesia" on public.iglesias for select to authenticated
  using (id = (select public.mi_iglesia()) or (select public.es_plataforma_admin()));
drop policy if exists "dueña gestiona iglesias" on public.iglesias;
create policy "dueña gestiona iglesias" on public.iglesias for all to authenticated
  using ((select public.es_plataforma_admin())) with check ((select public.es_plataforma_admin()));

drop policy if exists "dueña se ve" on public.plataforma_admins;
create policy "dueña se ve" on public.plataforma_admins for select to authenticated using (user_id = auth.uid());

commit;

-- Verificación rápida (debe dar 0 filas sin iglesia y 41 políticas de aislamiento):
select
  (select count(*) from pg_policies where schemaname = 'public' and policyname = 'aislamiento iglesia') as politicas_aislamiento,
  (select count(*) from public.ninos where iglesia_id is null) as ninos_sin_iglesia,
  (select count(*) from public.profiles where iglesia_id is null) as perfiles_sin_iglesia,
  (select nombre from public.iglesias where id = 'a0000000-0000-4000-8000-000000000001') as iglesia_actual;
