-- ============================================================
-- Arreglo: "infinite recursion detected in policy for relation
-- ninos_padres" al vincular un padre/madre (nueva cuenta o cuenta ya
-- existente, ej. un admin o docente) a un niño/a.
-- Para proyectos de Supabase que YA están en producción
-- (no para proyectos nuevos — esos usan schema.sql completo, que ya
-- incluye este arreglo).
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run.
-- Es seguro correrlo más de una vez.
--
-- Causa: la política "leer ninos" (tabla ninos) consulta ninos_padres
-- para saber si eres padre/madre del niño, y la política "docente
-- vincula padres si tiene permiso" (tabla ninos_padres) consulta ninos
-- para saber si el niño es de la clase del docente. Como cada política
-- consulta directamente a la otra tabla, Postgres no puede armar el
-- plan de la consulta y falla con "infinite recursion" — pasa siempre
-- que se inserta en ninos_padres, sin importar quién lo hace (admin,
-- coordinador o docente), porque el ciclo está en el texto de las
-- políticas, no en los datos.
--
-- Arreglo: una función `es_padre_de(nino_id)` con `security definer`
-- que consulta ninos_padres sin volver a pasar por su RLS, y se usa
-- desde la política de "ninos" en vez de la consulta directa — así se
-- rompe el ciclo.
-- ============================================================

create or replace function public.es_padre_de(p_nino_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.ninos_padres np
    where np.nino_id = p_nino_id and np.padre_id = auth.uid()
  );
$$;
comment on function public.es_padre_de is 'Helper RLS: ¿el usuario actual está vinculado como padre/madre de este niño/a? security definer para evitar el ciclo de recursión ninos <-> ninos_padres (ver política "leer ninos").';

drop policy if exists "leer ninos" on public.ninos;
create policy "leer ninos" on public.ninos for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador','docente'))
    or public.es_padre_de(ninos.id)
  );
