-- ============================================================
-- Actualización: la contraseña por defecto pasa de "usuario." a "usuario@"
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (create or replace function).
--
-- IMPORTANTE: esto solo cambia lo que generan estas dos funciones de
-- ahora en adelante — no toca las contraseñas de las cuentas que ya
-- existen. Una cuenta ya creada sigue entrando con "usuario." hasta
-- que alguien la restablezca (Equipo → Ver detalle → "Restablecer a
-- la contraseña por defecto"), momento en el que pasa a "usuario@".
-- ============================================================

create or replace function public.admin_create_invited_user(
  p_cedula text,
  p_role text,
  p_nombre_completo text,
  p_nino_id uuid default null,
  p_parentesco text default null
)
returns table (id uuid, password text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role text;
  new_user_id uuid;
  v_cedula text := trim(p_cedula);
  v_email text;
  v_password text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();

  if caller_role is null or caller_role not in ('admin','coordinador','docente') then
    raise exception 'No autorizado';
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
    jsonb_build_object('provider','email','providers', array['email']),
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), new_user_id::text, new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', v_email),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, role, nombre_completo, cedula)
  values (new_user_id, p_role, p_nombre_completo, v_cedula);

  if p_role = 'padre' then
    insert into public.ninos_padres (nino_id, padre_id, parentesco)
    values (p_nino_id, new_user_id, p_parentesco);
  end if;

  return query select new_user_id, v_password;
end;
$$;

create or replace function public.admin_reset_password(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role text;
  target_role text;
  target_cedula text;
  v_password text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role not in ('admin','coordinador') then
    raise exception 'No autorizado';
  end if;

  select p.role, p.cedula into target_role, target_cedula from public.profiles p where p.id = p_user_id;
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
end;
$$;
comment on function public.admin_reset_password is 'Regenera la contraseña de una cuenta a "usuario@" (el valor por defecto del sistema). Mismas reglas de quién puede tocar a quién que admin_create_invited_user.';
