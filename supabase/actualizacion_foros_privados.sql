-- ============================================================
-- Actualización: foros públicos o privados
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez (no borra ni modifica datos
-- existentes, solo agrega una columna nueva y reemplaza políticas).
-- Los foros que ya existen quedan como "públicos" (privado=false),
-- igual que se veían antes de este cambio.
-- ============================================================

alter table public.foros add column if not exists privado boolean not null default false;
comment on column public.foros.privado is 'true = solo lo ve staff (admin/coordinador/docente) y quien lo creó. false = toda la comunidad, incluidos padres.';

drop policy if exists "leer foros" on public.foros;
create policy "leer foros" on public.foros for select to authenticated
  using (
    privado = false
    or creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
  );

drop policy if exists "cambiar privacidad propio o staff" on public.foros;
create policy "cambiar privacidad propio o staff" on public.foros for update to authenticated
  using (
    creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  )
  with check (
    creado_por = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
  );

drop policy if exists "leer mensajes" on public.foro_mensajes;
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

drop policy if exists "crear mensaje" on public.foro_mensajes;
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
