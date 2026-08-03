-- ============================================================
-- Actualización: imagen en devocionales, bitácora de clase
-- (salón + refrigerio con foto) e inventario de materiales.
-- (El WhatsApp de contacto reutiliza la columna "telefono" que
-- ya existe en profiles — no necesita ningún cambio aquí.)
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (no borra ni modifica datos
-- existentes, solo agrega columnas/tablas nuevas si no existen).
-- ============================================================

-- ---------- DEVOCIONALES: imagen ----------

alter table public.devocionales_ninos add column if not exists imagen_url text;

-- ---------- BITÁCORA DE CLASE (salón + refrigerio) ----------

create table if not exists public.bitacora_clase (
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

drop policy if exists "leer bitacora" on public.bitacora_clase;
create policy "leer bitacora" on public.bitacora_clase for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = bitacora_clase.nivel_id and dn.docente_id = auth.uid())
  );

drop policy if exists "gestionar bitacora" on public.bitacora_clase;
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

create table if not exists public.materiales (
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

drop policy if exists "leer materiales" on public.materiales;
create policy "leer materiales" on public.materiales for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));

drop policy if exists "gestionar materiales" on public.materiales;
create policy "gestionar materiales" on public.materiales for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador')));

-- Las fotos (devocionales, bitácora, materiales) se guardan en el bucket
-- "actividades" que ya existe — no hace falta crear ningún bucket nuevo,
-- sus políticas de lectura pública y subida por staff ya aplican.
