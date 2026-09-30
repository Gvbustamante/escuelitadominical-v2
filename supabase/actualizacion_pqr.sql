-- PQR: peticiones, quejas, reclamos, sugerencias y felicitaciones, con evidencia.
-- Cualquier usuario envía y ve SOLO las suyas. Solo los "revisores" (Gisella) ven y responden todas.
-- Idempotente. Al final: agregar el id de Gisella en pqr_revisores (distinto en cada base).

create table if not exists public.pqr (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('peticion','queja','reclamo','sugerencia','felicitacion')),
  asunto text not null,
  descripcion text not null,
  estado text not null default 'nuevo' check (estado in ('nuevo','en_revision','respondido','cerrado')),
  respuesta text,
  respondido_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pqr_autor_idx on public.pqr (autor_id);
create index if not exists pqr_estado_idx on public.pqr (estado, created_at desc);

create table if not exists public.pqr_archivos (
  id uuid primary key default gen_random_uuid(),
  pqr_id uuid not null references public.pqr(id) on delete cascade,
  storage_path text not null,
  nombre text not null,
  tipo text,
  tamano bigint,
  created_at timestamptz not null default now()
);
create index if not exists pqr_archivos_pqr_idx on public.pqr_archivos (pqr_id);

create table if not exists public.pqr_revisores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.es_revisor_pqr()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pqr_revisores where user_id = auth.uid())
$$;

alter table public.pqr enable row level security;
alter table public.pqr_archivos enable row level security;
alter table public.pqr_revisores enable row level security;

drop policy if exists "pqr crear" on public.pqr;
create policy "pqr crear" on public.pqr for insert to authenticated
  with check (autor_id = auth.uid() and estado = 'nuevo' and respuesta is null);
drop policy if exists "pqr leer" on public.pqr;
create policy "pqr leer" on public.pqr for select to authenticated
  using (autor_id = auth.uid() or public.es_revisor_pqr());
drop policy if exists "pqr responder" on public.pqr;
create policy "pqr responder" on public.pqr for update to authenticated
  using (public.es_revisor_pqr()) with check (public.es_revisor_pqr());

drop policy if exists "pqr archivos crear" on public.pqr_archivos;
create policy "pqr archivos crear" on public.pqr_archivos for insert to authenticated
  with check (exists (select 1 from public.pqr p where p.id = pqr_id and p.autor_id = auth.uid()));
drop policy if exists "pqr archivos leer" on public.pqr_archivos;
create policy "pqr archivos leer" on public.pqr_archivos for select to authenticated
  using (exists (select 1 from public.pqr p where p.id = pqr_id and (p.autor_id = auth.uid() or public.es_revisor_pqr())));

drop policy if exists "pqr revisores leer propio" on public.pqr_revisores;
create policy "pqr revisores leer propio" on public.pqr_revisores for select to authenticated
  using (user_id = auth.uid());

-- Evidencias: bucket privado 'pqr', ruta <autor_id>/<pqr_id>/archivo
insert into storage.buckets (id, name, public, file_size_limit)
values ('pqr', 'pqr', false, 20971520)
on conflict (id) do update set public = false;

drop policy if exists "pqr evidencia subir" on storage.objects;
create policy "pqr evidencia subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'pqr' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pqr evidencia leer" on storage.objects;
create policy "pqr evidencia leer" on storage.objects for select to authenticated
  using (bucket_id = 'pqr' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_revisor_pqr()));
drop policy if exists "pqr evidencia borrar" on storage.objects;
create policy "pqr evidencia borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'pqr' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_revisor_pqr()));

-- Revisora (cambiar el id en cada base):
-- insert into public.pqr_revisores (user_id) values ('<id de Gisella>') on conflict do nothing;
