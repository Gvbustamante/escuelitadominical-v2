-- PRUEBA DE AISLAMIENTO (multi-tenant fase 1). Correr DESPUÉS de multitenant_fase1.sql, en la base de PRUEBAS.
-- No deja nada guardado: al final se deshace todo a propósito.
-- Resultado: se muestra como "ERROR" (así se deshace). Lee el texto:
--   ✅ PRUEBA OK …   → todo bien.
--   ❌ FALLAS …      → copia el mensaje y pásaselo a Claude.
do $$
declare
  sharat constant uuid := 'a0000000-0000-4000-8000-000000000001';
  b uuid;
  adm_s uuid;
  duena uuid;
  adm_b uuid := gen_random_uuid();
  nivel_b uuid;
  nivel_nuevo uuid;
  t text;
  n int;
  i int;
  ok int := 0;
  fallas text[] := '{}';
  tablas text[];
  sufijo text := substr(md5(random()::text), 1, 6);
begin
  select array_agg(distinct tablename order by tablename) into tablas
    from pg_policies where schemaname = 'public' and policyname = 'aislamiento iglesia';
  if coalesce(array_length(tablas, 1), 0) < 41 then
    fallas := fallas || format('solo %s tablas con aislamiento (esperado 41)', coalesce(array_length(tablas, 1), 0));
  end if;

  select p.id into adm_s from public.profiles p
   where p.iglesia_id = sharat and p.role in ('admin','superadmin')
     and p.id not in (select user_id from public.plataforma_admins) limit 1;
  select user_id into duena from public.plataforma_admins limit 1;

  -- Iglesia B (plan gratis) con su admin, un nivel y un niño.
  insert into public.iglesias (nombre, plan_id, estado) values ('Prueba B ' || sufijo, 'gratis', 'demo') returning id into b;
  perform public.sembrar_iglesia(b);
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data)
  values ('00000000-0000-0000-0000-000000000000', adm_b, 'authenticated', 'authenticated',
          'pruebab' || sufijo || '@accesskids.local', '{"role":"admin"}');
  insert into public.profiles (id, role, nombre_completo, iglesia_id) values (adm_b, 'admin', 'Admin B', b);
  insert into public.niveles (nombre, iglesia_id) values ('Nivel B', b) returning id into nivel_b;
  insert into public.ninos (nombre_completo, nivel_id, iglesia_id) values ('Niño B', nivel_b, b);

  -- ===== Como ADMIN DE B =====
  perform set_config('request.jwt.claims', json_build_object('sub', adm_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  foreach t in array tablas loop
    execute format('select count(*) from public.%I where iglesia_id is distinct from %L and %s', t, b,
                   case when t = 'profiles' then format('id <> %L', adm_b) else 'true' end) into n;
    if n = 0 then ok := ok + 1; else fallas := fallas || format('B ve %s filas ajenas en %s', n, t); end if;
  end loop;

  select count(*) into n from public.ninos;
  if n = 1 then ok := ok + 1; else fallas := fallas || format('B ve %s niños (esperado 1)', n); end if;

  update public.ninos set notas = 'hack' where iglesia_id = sharat;
  get diagnostics n = row_count;
  if n = 0 then ok := ok + 1; else fallas := fallas || 'B pudo editar niños de Sharat'::text; end if;

  delete from public.niveles where iglesia_id = sharat;
  get diagnostics n = row_count;
  if n = 0 then ok := ok + 1; else fallas := fallas || 'B pudo borrar niveles de Sharat'::text; end if;

  begin
    insert into public.ninos (nombre_completo, iglesia_id) values ('Intruso', sharat);
    fallas := fallas || 'B pudo crear un niño en Sharat'::text;
  exception when others then ok := ok + 1;
  end;

  insert into public.niveles (nombre) values ('Nivel B2') returning id into nivel_nuevo;
  select count(*) into n from public.niveles where id = nivel_nuevo and iglesia_id = b;
  if n = 1 then ok := ok + 1; else fallas := fallas || 'la iglesia no se puso sola al guardar'::text; end if;

  update public.dias_clase set activo = true where dia_semana = 3;
  get diagnostics n = row_count;
  if n = 1 then ok := ok + 1; else fallas := fallas || format('dias_clase: B cambió %s filas (esperado 1)', n); end if;

  if public.tiene_permiso('docente', 'agregar_ninos') then ok := ok + 1; else fallas := fallas || 'tiene_permiso no lee la iglesia B'::text; end if;

  if adm_s is not null then
    begin
      perform public.admin_reset_password(adm_s);
      fallas := fallas || 'B pudo cambiar la contraseña de alguien de Sharat'::text;
    exception when others then ok := ok + 1;
    end;
  end if;

  begin
    perform public.resumen_iglesias();
    fallas := fallas || 'B pudo ver el resumen de todas las iglesias'::text;
  exception when others then ok := ok + 1;
  end;

  -- Límite de niños (plan gratis = 25; ya hay 1).
  begin
    for i in 1..24 loop
      insert into public.ninos (nombre_completo, nivel_id) values ('Niño B ' || i, nivel_b);
    end loop;
    ok := ok + 1;
  exception when others then fallas := fallas || ('no dejó llegar a 25 niños: ' || sqlerrm);
  end;
  begin
    insert into public.ninos (nombre_completo, nivel_id) values ('Niño 26', nivel_b);
    fallas := fallas || 'dejó crear el niño 26 en plan gratis'::text;
  exception when others then
    if sqlerrm like 'LIMITE_PLAN%' then ok := ok + 1; else fallas := fallas || ('niño 26: ' || sqlerrm); end if;
  end;

  -- Límite de docentes (plan gratis = 2) con la función real de invitar.
  begin
    perform public.admin_create_invited_user('mt1' || sufijo, 'docente', 'Docente B1');
    perform public.admin_create_invited_user('mt2' || sufijo, 'coordinador', 'Coordinadora B2');
    ok := ok + 1;
  exception when others then fallas := fallas || ('no dejó crear 2 docentes: ' || sqlerrm);
  end;
  begin
    perform public.admin_create_invited_user('mt3' || sufijo, 'docente', 'Docente B3');
    fallas := fallas || 'dejó crear el docente 3 en plan gratis'::text;
  exception when others then
    if sqlerrm like 'LIMITE_PLAN%' then ok := ok + 1; else fallas := fallas || ('docente 3: ' || sqlerrm); end if;
  end;
  select count(*) into n from public.profiles where cedula like 'mt_' || sufijo and iglesia_id = b;
  if n = 2 then ok := ok + 1; else fallas := fallas || format('docentes invitados en B: %s (esperado 2)', n); end if;

  execute 'reset role';

  -- ===== Como ADMIN DE SHARAT =====
  if adm_s is null then
    fallas := fallas || 'no hay admin en Sharat para probar'::text;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', adm_s, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    foreach t in array tablas loop
      execute format('select count(*) from public.%I where iglesia_id is distinct from %L and %s', t, sharat,
                     case when t = 'profiles' then format('id <> %L', adm_s) else 'true' end) into n;
      if n = 0 then ok := ok + 1; else fallas := fallas || format('Sharat ve %s filas ajenas en %s', n, t); end if;
    end loop;
    select count(*) into n from public.ninos where nombre_completo like 'Niño B%';
    if n = 0 then ok := ok + 1; else fallas := fallas || 'Sharat ve niños de B'::text; end if;
    execute 'reset role';
  end if;

  -- ===== Como DUEÑA: entrar a B y volver =====
  if duena is null then
    fallas := fallas || 'no hay dueña en plataforma_admins'::text;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', duena, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.resumen_iglesias();
    if n >= 2 then ok := ok + 1; else fallas := fallas || 'la dueña no ve todas las iglesias'::text; end if;
    perform public.entrar_iglesia(b);
    select count(*) into n from public.ninos;
    if n = 25 then ok := ok + 1; else fallas := fallas || format('dueña dentro de B ve %s niños (esperado 25)', n); end if;
    perform public.entrar_iglesia(null);
    select count(*) into n from public.ninos where iglesia_id = b;
    if n = 0 then ok := ok + 1; else fallas := fallas || 'la dueña no volvió a su iglesia'::text; end if;
    execute 'reset role';
  end if;

  if array_length(fallas, 1) is null then
    raise exception '✅ PRUEBA OK: % comprobaciones correctas, 0 fallas (no se guardó nada)', ok;
  else
    raise exception '❌ FALLAS (%): %  |  correctas: %', array_length(fallas, 1), array_to_string(fallas, ' · '), ok;
  end if;
end $$;
