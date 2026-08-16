-- ============================================================
-- Drive: sistema de archivos compartido para el equipo
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo, que ya
-- incluye estas tablas).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- ============================================================

-- ---------- Carpetas ----------
create table if not exists public.carpetas_drive (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  padre_id uuid references public.carpetas_drive(id) on delete cascade,
  creado_por uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
comment on table public.carpetas_drive is 'Carpetas del Drive compartido del equipo. padre_id = null → carpeta raíz. Soporta anidamiento.';

-- ---------- Archivos ----------
create table if not exists public.archivos_drive (
  id uuid primary key default gen_random_uuid(),
  carpeta_id uuid references public.carpetas_drive(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  tipo text,
  tamano bigint,
  subido_por uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
comment on table public.archivos_drive is 'Archivos subidos al Drive compartido. carpeta_id = null → raíz. tipo = MIME type.';
comment on column public.archivos_drive.tamano is 'Tamaño del archivo en bytes.';

-- ---------- RLS ----------
alter table public.carpetas_drive enable row level security;
alter table public.archivos_drive enable row level security;

-- Carpetas: staff puede ver y gestionar
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'carpetas_drive' and policyname = 'leer carpetas drive') then
    create policy "leer carpetas drive" on public.carpetas_drive for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'carpetas_drive' and policyname = 'gestionar carpetas drive') then
    create policy "gestionar carpetas drive" on public.carpetas_drive for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));
  end if;
end $$;

-- Archivos: staff puede ver y gestionar
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'archivos_drive' and policyname = 'leer archivos drive') then
    create policy "leer archivos drive" on public.archivos_drive for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'archivos_drive' and policyname = 'gestionar archivos drive') then
    create policy "gestionar archivos drive" on public.archivos_drive for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente')));
  end if;
end $$;

-- ---------- Storage bucket ----------
insert into storage.buckets (id, name, public) values ('drive', 'drive', true)
on conflict (id) do nothing;

-- Storage policies para bucket drive
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'lectura publica de archivos drive') then
    create policy "lectura publica de archivos drive"
      on storage.objects for select to public
      using (bucket_id = 'drive');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff sube archivos drive') then
    create policy "staff sube archivos drive"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'drive'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'staff elimina archivos drive') then
    create policy "staff elimina archivos drive"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'drive'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
      );
  end if;
end $$;
