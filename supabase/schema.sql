-- ============================================================
-- KidsMin — esquema completo de base de datos
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run
-- Se ejecuta UNA sola vez, en un proyecto de Supabase nuevo/vacío.
-- ============================================================

-- ---------- TABLAS ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','coordinador','docente','padre')),
  nombre_completo text not null,
  cedula text unique,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.niveles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad_min int,
  edad_max int,
  color text default 'sky',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.docentes_niveles (
  docente_id uuid references public.profiles(id) on delete cascade,
  nivel_id uuid references public.niveles(id) on delete cascade,
  primary key (docente_id, nivel_id)
);

create table public.ninos (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  fecha_nacimiento date,
  nivel_id uuid references public.niveles(id) on delete set null,
  alergias text,
  notas text,
  activo boolean not null default true,
  pausado boolean not null default false,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
comment on column public.ninos.pausado is 'true = el niño está temporalmente inactivo (ej. no está asistiendo). Se muestra en gris; sus tareas pendientes dejan de contar como pendientes.';

create table public.ninos_padres (
  nino_id uuid references public.ninos(id) on delete cascade,
  padre_id uuid references public.profiles(id) on delete cascade,
  parentesco text,
  created_at timestamptz not null default now(),
  primary key (nino_id, padre_id)
);

create table public.asistencia (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid references public.ninos(id) on delete cascade,
  nivel_id uuid references public.niveles(id),
  fecha date not null default current_date,
  presente boolean not null default true,
  tomada_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (nino_id, fecha)
);

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid references public.niveles(id) on delete cascade,
  docente_id uuid references public.profiles(id),
  titulo text not null,
  descripcion text,
  fecha date not null default current_date,
  versiculo_clave text,
  historia_biblica text,
  visible_padres boolean not null default true,
  es_tarea boolean not null default false,
  enlace_externo text,
  created_at timestamptz not null default now()
);
comment on column public.actividades.visible_padres is 'false = solo la ve staff (admin/coordinador/docente); los padres/niños no la ven aunque sea de su clase y ya haya pasado.';
comment on column public.actividades.es_tarea is 'true = además de informativa, pide una entrega de cada niño del nivel (ver tarea_entregas).';
comment on column public.actividades.enlace_externo is 'Link opcional si la tarea/actividad ocurre fuera de la plataforma (video, formulario, etc.).';

create table public.actividad_archivos (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid references public.actividades(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  tipo text,
  created_at timestamptz not null default now()
);

create table public.actividad_reacciones (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid references public.actividades(id) on delete cascade,
  padre_id uuid references public.profiles(id) on delete cascade,
  tipo text not null default '❤️',
  created_at timestamptz not null default now(),
  unique (actividad_id, padre_id)
);

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid references public.niveles(id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha date not null,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.progreso_notas (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid references public.ninos(id) on delete cascade,
  nivel_id uuid references public.niveles(id),
  docente_id uuid references public.profiles(id),
  fecha date not null default current_date,
  comportamiento text,
  emocion text,
  logros text,
  created_at timestamptz not null default now()
);

create table public.devocionales_ninos (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid references public.niveles(id) on delete set null,
  titulo text not null,
  versiculo text,
  contenido text not null,
  imagen_url text,
  fecha date not null default current_date,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.citas_biblicas (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  referencia text not null,
  activo boolean not null default true,
  fecha_mostrar date unique,
  created_at timestamptz not null default now()
);
comment on column public.citas_biblicas.fecha_mostrar is 'Fecha calendario en la que esta cita se muestra como "cita del día". Null = no programada, queda disponible en el pool.';

-- ---------- SEGURIDAD (RLS) ----------

alter table public.profiles enable row level security;
alter table public.niveles enable row level security;
alter table public.docentes_niveles enable row level security;
alter table public.ninos enable row level security;
alter table public.ninos_padres enable row level security;
alter table public.asistencia enable row level security;
alter table public.actividades enable row level security;
alter table public.actividad_archivos enable row level security;
alter table public.actividad_reacciones enable row level security;
alter table public.agenda enable row level security;
alter table public.progreso_notas enable row level security;
alter table public.devocionales_ninos enable row level security;
alter table public.citas_biblicas enable row level security;

-- PROFILES
create policy "leer perfiles" on public.profiles for select to authenticated using (true);
create policy "crear propio perfil" on public.profiles for insert to authenticated
  with check (
    auth.uid() = id
    and (
      not exists (select 1 from public.profiles)
      or role = (auth.jwt() -> 'app_metadata' ->> 'role')
    )
  );
create policy "actualizar perfiles" on public.profiles for update to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

-- NIVELES
create policy "leer niveles" on public.niveles for select to authenticated using (true);
create policy "gestionar niveles" on public.niveles for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- DOCENTES_NIVELES
create policy "leer asignaciones" on public.docentes_niveles for select to authenticated using (true);
create policy "gestionar asignaciones" on public.docentes_niveles for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- NINOS
create policy "leer ninos" on public.ninos for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or exists (select 1 from public.ninos_padres np where np.nino_id = ninos.id and np.padre_id = auth.uid())
  );
create policy "gestionar ninos" on public.ninos for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));
create policy "docente actualiza ninos de su nivel" on public.ninos for update to authenticated
  using (exists (select 1 from public.docentes_niveles dn where dn.nivel_id = ninos.nivel_id and dn.docente_id = auth.uid()));

-- NINOS_PADRES
create policy "leer vinculos" on public.ninos_padres for select to authenticated
  using (
    padre_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );
create policy "gestionar vinculos" on public.ninos_padres for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- ASISTENCIA
create policy "leer asistencia" on public.asistencia for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or exists (select 1 from public.ninos_padres np where np.nino_id = asistencia.nino_id and np.padre_id = auth.uid())
  );
create policy "gestionar asistencia" on public.asistencia for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = asistencia.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = asistencia.nivel_id and dn.docente_id = auth.uid())
  );

-- ACTIVIDADES
create policy "leer actividades" on public.actividades for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or (
      actividades.visible_padres
      and exists (
        select 1 from public.ninos_padres np join public.ninos n on n.id = np.nino_id
        where np.padre_id = auth.uid() and n.nivel_id = actividades.nivel_id
      )
    )
  );
create policy "gestionar actividades" on public.actividades for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = actividades.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = actividades.nivel_id and dn.docente_id = auth.uid())
  );

-- ACTIVIDAD_ARCHIVOS
create policy "leer archivos" on public.actividad_archivos for select to authenticated
  using (exists (select 1 from public.actividades a where a.id = actividad_archivos.actividad_id));
create policy "gestionar archivos" on public.actividad_archivos for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = actividad_archivos.actividad_id and dn.docente_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = actividad_archivos.actividad_id and dn.docente_id = auth.uid()
    )
  );

-- ACTIVIDAD_REACCIONES
create policy "leer reacciones" on public.actividad_reacciones for select to authenticated using (true);
create policy "gestionar propia reaccion" on public.actividad_reacciones for all to authenticated
  using (padre_id = auth.uid()) with check (padre_id = auth.uid());

-- AGENDA
create policy "leer agenda" on public.agenda for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or agenda.nivel_id is null
    or exists (
      select 1 from public.ninos_padres np join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid() and n.nivel_id = agenda.nivel_id
    )
  );
create policy "gestionar agenda" on public.agenda for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = agenda.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = agenda.nivel_id and dn.docente_id = auth.uid())
  );

-- PROGRESO_NOTAS
create policy "leer progreso" on public.progreso_notas for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or exists (select 1 from public.ninos_padres np where np.nino_id = progreso_notas.nino_id and np.padre_id = auth.uid())
  );
create policy "gestionar progreso" on public.progreso_notas for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = progreso_notas.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = progreso_notas.nivel_id and dn.docente_id = auth.uid())
  );

-- DEVOCIONALES_NINOS
create policy "leer devocionales ninos" on public.devocionales_ninos for select to authenticated using (true);
create policy "gestionar devocionales ninos" on public.devocionales_ninos for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));

-- CITAS_BIBLICAS
create policy "leer citas biblicas" on public.citas_biblicas for select to authenticated using (true);
create policy "gestionar citas biblicas" on public.citas_biblicas for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- ---------- STORAGE (archivos de actividades) ----------

insert into storage.buckets (id, name, public)
values ('actividades', 'actividades', true)
on conflict (id) do nothing;

create policy "lectura publica de archivos de actividades"
  on storage.objects for select
  using (bucket_id = 'actividades');

create policy "staff sube archivos de actividades"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'actividades'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );

create policy "staff elimina archivos de actividades"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'actividades'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );

-- ---------- FUNCIÓN: crear usuarios con cédula (admin/coordinador) ----------

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

  if caller_role is null or caller_role not in ('admin','coordinador') then
    raise exception 'No autorizado';
  end if;

  if p_role not in ('admin','coordinador','docente','padre') then
    raise exception 'Rol invalido';
  end if;

  if caller_role = 'coordinador' and p_role not in ('docente','padre') then
    raise exception 'Un coordinador solo puede invitar docentes o padres';
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

-- ---------- CITAS BÍBLICAS (contenido inicial) ----------

insert into public.citas_biblicas (texto, referencia) values
('Todo lo puedo en Cristo que me fortalece.', 'Filipenses 4:13'),
('El Señor es mi pastor, nada me faltará.', 'Salmos 23:1'),
('Confía en el Señor de todo corazón, y no te apoyes en tu propia prudencia.', 'Proverbios 3:5'),
('Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.', 'Juan 3:16'),
('Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora.', 'Eclesiastés 3:1'),
('Encomienda al Señor tu camino, y confía en él; y él hará.', 'Salmos 37:5'),
('Sean fuertes y valientes. No teman ni se asusten... porque el Señor tu Dios te acompañará.', 'Deuteronomio 31:6'),
('Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros.', '1 Tesalonicenses 5:18'),
('El amor es paciente, es bondadoso. El amor no es envidioso ni jactancioso.', '1 Corintios 13:4'),
('Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.', 'Proverbios 22:6'),
('Amarás al Señor tu Dios con todo tu corazón, con toda tu alma y con toda tu mente.', 'Mateo 22:37'),
('Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.', 'Salmos 46:1'),
('Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.', 'Romanos 8:28'),
('No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.', 'Isaías 41:10'),
('Dejad que los niños vengan a mí, y no se lo impidáis; porque de los tales es el reino de los cielos.', 'Mateo 19:14');

-- ---------- FORO ----------

create table public.foros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'general' check (categoria in ('general','evento')),
  evento_id uuid references public.agenda(id) on delete set null,
  privado boolean not null default false,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
comment on column public.foros.privado is 'true = solo lo ve staff (admin/coordinador/docente) y quien lo creó. false = toda la comunidad, incluidos padres.';

create table public.foro_mensajes (
  id uuid primary key default gen_random_uuid(),
  foro_id uuid references public.foros(id) on delete cascade,
  autor_id uuid references public.profiles(id),
  mensaje text not null,
  created_at timestamptz not null default now()
);

alter table public.foros enable row level security;
alter table public.foro_mensajes enable row level security;

create policy "leer foros" on public.foros for select to authenticated
  using (
    privado = false
    or creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );
create policy "crear foro" on public.foros for insert to authenticated
  with check (creado_por = auth.uid());
create policy "cambiar privacidad propio o staff" on public.foros for update to authenticated
  using (
    creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  )
  with check (
    creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );
create policy "borrar foro propio o staff" on public.foros for delete to authenticated
  using (
    creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

create policy "leer mensajes" on public.foro_mensajes for select to authenticated
  using (
    exists (
      select 1 from public.foros f
      where f.id = foro_mensajes.foro_id
      and (
        f.privado = false
        or f.creado_por = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
      )
    )
  );
create policy "crear mensaje" on public.foro_mensajes for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.foros f
      where f.id = foro_mensajes.foro_id
      and (
        f.privado = false
        or f.creado_por = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
      )
    )
  );
create policy "borrar mensaje propio o staff" on public.foro_mensajes for delete to authenticated
  using (
    autor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

-- ---------- RECONOCIMIENTOS (estrellas de gamificación) ----------

create table public.reconocimientos (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid references public.ninos(id) on delete cascade,
  nivel_id uuid references public.niveles(id),
  tipo text not null default 'estrella' check (tipo = 'estrella'),
  motivo text,
  otorgado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
comment on table public.reconocimientos is 'Estrellas que un docente/admin otorga a un niño. Capa de gamificación, no reemplaza progreso_notas.';

alter table public.reconocimientos enable row level security;

create policy "leer reconocimientos" on public.reconocimientos for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or exists (select 1 from public.ninos_padres np where np.nino_id = reconocimientos.nino_id and np.padre_id = auth.uid())
  );
create policy "otorgar reconocimientos" on public.reconocimientos for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = reconocimientos.nivel_id and dn.docente_id = auth.uid())
  );
create policy "borrar reconocimiento propio o staff" on public.reconocimientos for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or otorgado_por = auth.uid()
  );

-- ---------- PETICIONES DE ORACIÓN ----------

create table public.peticiones_oracion (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles(id),
  texto text not null,
  privado boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.peticiones_oracion is 'Peticiones de oración de docentes/padres. privado=true visible solo para staff y el autor; privado=false visible para toda la comunidad.';

alter table public.peticiones_oracion enable row level security;

create policy "leer peticiones" on public.peticiones_oracion for select to authenticated
  using (
    privado = false
    or autor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );
create policy "crear peticion propia" on public.peticiones_oracion for insert to authenticated
  with check (autor_id = auth.uid());
create policy "actualizar peticion propia o staff" on public.peticiones_oracion for update to authenticated
  using (
    autor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  )
  with check (
    autor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );
create policy "borrar peticion propia o staff" on public.peticiones_oracion for delete to authenticated
  using (
    autor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

-- ---------- CONFIG_IGLESIA (logo y nombre personalizables) ----------

create table public.config_iglesia (
  id uuid primary key default gen_random_uuid(),
  nombre_iglesia text,
  logo_url text,
  updated_at timestamptz not null default now()
);
comment on table public.config_iglesia is 'Configuracion general de la iglesia/escuelita (una sola fila). Logo personalizable por el admin.';

alter table public.config_iglesia enable row level security;

create policy "lectura publica de config_iglesia" on public.config_iglesia for select to anon, authenticated using (true);
create policy "staff administra config_iglesia" on public.config_iglesia for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "lectura publica de logos" on storage.objects for select
  using (bucket_id = 'logos');

create policy "staff sube logos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

create policy "staff actualiza logos" on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

create policy "staff elimina logos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

-- ---------- BITÁCORA DE CLASE (salón + refrigerio) ----------

create table public.bitacora_clase (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid references public.niveles(id) on delete cascade,
  fecha date not null default current_date,
  docente_id uuid references public.profiles(id),
  salon_ok boolean,
  salon_foto_url text,
  refrigerio_detalle text,
  refrigerio_foto_url text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nivel_id, fecha)
);
comment on table public.bitacora_clase is 'Constancia por clase y fecha: estado del salón (con foto) y refrigerio dado (con foto).';

alter table public.bitacora_clase enable row level security;

create policy "leer bitacora" on public.bitacora_clase for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = bitacora_clase.nivel_id and dn.docente_id = auth.uid())
  );
create policy "gestionar bitacora" on public.bitacora_clase for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = bitacora_clase.nivel_id and dn.docente_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = bitacora_clase.nivel_id and dn.docente_id = auth.uid())
  );

-- ---------- MATERIALES (inventario) ----------

create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default 'general' check (categoria in ('general','ninos','clase')),
  nivel_id uuid references public.niveles(id) on delete set null,
  cantidad int not null default 0,
  foto_url text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.materiales is 'Inventario de materiales disponibles, generales o para una clase específica.';

alter table public.materiales enable row level security;

create policy "leer materiales" on public.materiales for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));
create policy "gestionar materiales" on public.materiales for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- ---------- TAREA_ENTREGAS (entregas de tareas de actividades) ----------

create table public.tarea_entregas (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  nino_id uuid not null references public.ninos(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','pausada','entregada')),
  archivo_url text,
  comentario_padre text,
  nota_docente text,
  entregado_por uuid references public.profiles(id),
  entregado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actividad_id, nino_id)
);
comment on table public.tarea_entregas is 'Una fila por niño para cada actividad marcada como tarea (es_tarea=true). estado: pendiente (sin acción), pausada (el docente la puso en espera), entregada (el padre subió evidencia).';

alter table public.tarea_entregas enable row level security;

create policy "leer tarea_entregas" on public.tarea_entregas for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
  );
create policy "padre entrega su tarea" on public.tarea_entregas for insert to authenticated
  with check (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
  );
create policy "actualizar tarea_entregas propia o staff" on public.tarea_entregas for update to authenticated
  using (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
  );

-- ---------- MOTIVOS_RECONOCIMIENTO (catálogo configurable de motivos de estrella) ----------

create table public.motivos_reconocimiento (
  id uuid primary key default gen_random_uuid(),
  emoji text,
  texto text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.motivos_reconocimiento is 'Catálogo editable por admin/coordinador de motivos rápidos para dar una estrella. El docente también puede escribir uno libre.';

alter table public.motivos_reconocimiento enable row level security;

create policy "leer motivos_reconocimiento" on public.motivos_reconocimiento for select to authenticated using (true);
create policy "gestionar motivos_reconocimiento" on public.motivos_reconocimiento for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.motivos_reconocimiento (emoji, texto, orden) values
('🌟', 'Buen comportamiento', 1),
('📖', 'Memorizó el versículo', 2),
('🤝', 'Ayudó a un compañero', 3),
('🙌', 'Participó con entusiasmo', 4),
('🎨', 'Terminó su actividad', 5),
('💛', 'Buena actitud', 6);

-- ---------- NIVELES_ESTRELLA (insignias configurables de gamificación) ----------

create table public.niveles_estrella (
  id uuid primary key default gen_random_uuid(),
  min_estrellas int not null,
  emoji text,
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.niveles_estrella is 'Insignias configurables por admin/coordinador: a partir de cuántas estrellas un niño alcanza cada nivel.';

alter table public.niveles_estrella enable row level security;

create policy "leer niveles_estrella" on public.niveles_estrella for select to authenticated using (true);
create policy "gestionar niveles_estrella" on public.niveles_estrella for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.niveles_estrella (min_estrellas, emoji, nombre, orden) values
(0, '🐣', 'Explorador nuevo', 1),
(3, '🦊', 'Curioso', 2),
(6, '🦁', 'Valiente', 3),
(10, '🦋', 'Brillante', 4),
(15, '🌟', 'Estrella de la Biblia', 5),
(20, '👑', 'Campeón de fe', 6);

-- ---------- STORAGE (evidencias de tareas — reusa el bucket de actividades) ----------

create policy "padre sube evidencia de tarea"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'actividades'
    and (storage.foldername(name))[1] = 'tareas'
  );
