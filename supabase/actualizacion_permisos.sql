-- ============================================================
-- Actualización: permisos_rol + pantalla de Usuarios
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
-- ============================================================

-- ---------- PERMISOS_ROL ----------

create table if not exists public.permisos_rol (
  id uuid primary key default gen_random_uuid(),
  rol text not null check (rol in ('admin','coordinador','docente','padre')),
  permiso text not null,
  activo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (rol, permiso)
);
comment on table public.permisos_rol is 'Interruptores de permisos extra por rol, configurables en Usuarios → Roles y permisos (solo admin). Si no hay fila para un rol+permiso, se asume "no permitido".';

alter table public.permisos_rol enable row level security;

drop policy if exists "leer permisos_rol" on public.permisos_rol;
create policy "leer permisos_rol" on public.permisos_rol for select to authenticated using (true);

drop policy if exists "gestionar permisos_rol" on public.permisos_rol;
create policy "gestionar permisos_rol" on public.permisos_rol for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create or replace function public.tiene_permiso(p_rol text, p_permiso text)
returns boolean
language sql
stable
as $$
  select coalesce((select activo from public.permisos_rol where rol = p_rol and permiso = p_permiso), false);
$$;
comment on function public.tiene_permiso is 'Helper usado dentro de políticas RLS para chequear un permiso_rol configurable. Por defecto (sin fila) es false — hay que activarlo explícitamente.';

insert into public.permisos_rol (rol, permiso, activo) values
  ('docente', 'editar_ninos', true),
  ('docente', 'agregar_ninos', false),
  ('docente', 'vincular_padres', false)
on conflict (rol, permiso) do nothing;

-- ---------- NINOS: el docente ya podía editar niños de su nivel sin
-- condición — ahora respeta el interruptor "editar_ninos" ----------

drop policy if exists "docente actualiza ninos de su nivel" on public.ninos;
create policy "docente actualiza ninos de su nivel" on public.ninos for update to authenticated
  using (
    public.tiene_permiso('docente', 'editar_ninos')
    and exists (select 1 from public.docentes_niveles dn where dn.nivel_id = ninos.nivel_id and dn.docente_id = auth.uid())
  );

drop policy if exists "docente agrega ninos si tiene permiso" on public.ninos;
create policy "docente agrega ninos si tiene permiso" on public.ninos for insert to authenticated
  with check (
    public.tiene_permiso('docente', 'agregar_ninos')
    and (
      nivel_id is null
      or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = ninos.nivel_id and dn.docente_id = auth.uid())
    )
  );

drop policy if exists "docente vincula padres si tiene permiso" on public.ninos_padres;
create policy "docente vincula padres si tiene permiso" on public.ninos_padres for insert to authenticated
  with check (
    public.tiene_permiso('docente', 'vincular_padres')
    and exists (
      select 1 from public.docentes_niveles dn
      join public.ninos n on n.nivel_id = dn.nivel_id
      where n.id = ninos_padres.nino_id and dn.docente_id = auth.uid()
    )
  );

-- ---------- admin_create_invited_user: ahora un docente con permiso
-- "vincular_padres" también puede invitar padres de sus propios niños ----------

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
  v_password := v_cedula || '.';
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

-- ---------- FUNCIÓN NUEVA: restablecer contraseña (admin/coordinador) ----------

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

  v_password := target_cedula || '.';
  update auth.users set encrypted_password = crypt(v_password, gen_salt('bf')), updated_at = now() where id = p_user_id;

  return v_password;
end;
$$;
comment on function public.admin_reset_password is 'Regenera la contraseña de una cuenta a "cédula." (el valor por defecto del sistema). Mismas reglas de quién puede tocar a quién que admin_create_invited_user.';
