-- ============================================================
-- Actualización: Tareas en actividades + estrellas configurables
-- + niños pausados
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (usa "if not exists").
-- ============================================================

-- ---------- ACTIVIDADES: nuevas columnas ----------

alter table public.actividades
  add column if not exists es_tarea boolean not null default false,
  add column if not exists enlace_externo text;

comment on column public.actividades.es_tarea is 'true = además de informativa, pide una entrega de cada niño del nivel (ver tarea_entregas).';
comment on column public.actividades.enlace_externo is 'Link opcional si la tarea/actividad ocurre fuera de la plataforma (video, formulario, etc.).';

-- ---------- NINOS: pausado ----------

alter table public.ninos
  add column if not exists pausado boolean not null default false;

comment on column public.ninos.pausado is 'true = el niño está temporalmente inactivo (ej. no está asistiendo). Se muestra en gris; sus tareas pendientes dejan de contar como pendientes.';

-- ---------- TAREA_ENTREGAS ----------

create table if not exists public.tarea_entregas (
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

drop policy if exists "leer tarea_entregas" on public.tarea_entregas;
create policy "leer tarea_entregas" on public.tarea_entregas for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
    or exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
  );

drop policy if exists "padre entrega su tarea" on public.tarea_entregas;
create policy "padre entrega su tarea" on public.tarea_entregas for insert to authenticated
  with check (
    exists (select 1 from public.ninos_padres np where np.nino_id = tarea_entregas.nino_id and np.padre_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (
      select 1 from public.actividades a join public.docentes_niveles dn on dn.nivel_id = a.nivel_id
      where a.id = tarea_entregas.actividad_id and dn.docente_id = auth.uid()
    )
  );

drop policy if exists "actualizar tarea_entregas propia o staff" on public.tarea_entregas;
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

-- ---------- MOTIVOS_RECONOCIMIENTO ----------

create table if not exists public.motivos_reconocimiento (
  id uuid primary key default gen_random_uuid(),
  emoji text,
  texto text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.motivos_reconocimiento is 'Catálogo editable por admin/coordinador de motivos rápidos para dar una estrella. El docente también puede escribir uno libre.';

alter table public.motivos_reconocimiento enable row level security;

drop policy if exists "leer motivos_reconocimiento" on public.motivos_reconocimiento;
create policy "leer motivos_reconocimiento" on public.motivos_reconocimiento for select to authenticated using (true);

drop policy if exists "gestionar motivos_reconocimiento" on public.motivos_reconocimiento;
create policy "gestionar motivos_reconocimiento" on public.motivos_reconocimiento for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.motivos_reconocimiento (emoji, texto, orden)
select * from (values
  ('🌟', 'Buen comportamiento', 1),
  ('📖', 'Memorizó el versículo', 2),
  ('🤝', 'Ayudó a un compañero', 3),
  ('🙌', 'Participó con entusiasmo', 4),
  ('🎨', 'Terminó su actividad', 5),
  ('💛', 'Buena actitud', 6)
) as v(emoji, texto, orden)
where not exists (select 1 from public.motivos_reconocimiento);

-- ---------- NIVELES_ESTRELLA ----------

create table if not exists public.niveles_estrella (
  id uuid primary key default gen_random_uuid(),
  min_estrellas int not null,
  emoji text,
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.niveles_estrella is 'Insignias configurables por admin/coordinador: a partir de cuántas estrellas un niño alcanza cada nivel.';

alter table public.niveles_estrella enable row level security;

drop policy if exists "leer niveles_estrella" on public.niveles_estrella;
create policy "leer niveles_estrella" on public.niveles_estrella for select to authenticated using (true);

drop policy if exists "gestionar niveles_estrella" on public.niveles_estrella;
create policy "gestionar niveles_estrella" on public.niveles_estrella for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

insert into public.niveles_estrella (min_estrellas, emoji, nombre, orden)
select * from (values
  (0, '🐣', 'Explorador nuevo', 1),
  (3, '🦊', 'Curioso', 2),
  (6, '🦁', 'Valiente', 3),
  (10, '🦋', 'Brillante', 4),
  (15, '🌟', 'Estrella de la Biblia', 5),
  (20, '👑', 'Campeón de fe', 6)
) as v(min_estrellas, emoji, nombre, orden)
where not exists (select 1 from public.niveles_estrella);

-- ---------- STORAGE: padres suben evidencia de tarea ----------

drop policy if exists "padre sube evidencia de tarea" on storage.objects;
create policy "padre sube evidencia de tarea"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'actividades'
    and (storage.foldername(name))[1] = 'tareas'
  );
