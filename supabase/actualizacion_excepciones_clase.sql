-- ⚠️ PENDIENTE de aplicar en las dos bases (la app ya lo usa; sin la tabla funciona igual, sin excepciones).
-- Excepciones por fecha: "ese día no hay clase" para un nivel, o para toda la escuelita (nivel_id null).
-- Ej.: feriado (toda la escuelita) o retiro de Tweens (solo ese nivel). Idempotente.
create table if not exists public.excepciones_clase (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  nivel_id uuid references public.niveles(id) on delete cascade,
  motivo text,
  creado_por uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists excepciones_clase_unica on public.excepciones_clase (fecha, coalesce(nivel_id, '00000000-0000-0000-0000-000000000000'::uuid));
comment on table public.excepciones_clase is 'Días puntuales sin clase. nivel_id null = toda la escuelita.';

alter table public.excepciones_clase enable row level security;

drop policy if exists "leer excepciones_clase" on public.excepciones_clase;
create policy "leer excepciones_clase" on public.excepciones_clase for select to authenticated using (true);

drop policy if exists "gestionar excepciones_clase" on public.excepciones_clase;
create policy "gestionar excepciones_clase" on public.excepciones_clase for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin','admin','coordinador')));
