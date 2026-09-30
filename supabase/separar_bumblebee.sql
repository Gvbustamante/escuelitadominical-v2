-- SOLO base de prueba "Escuelita Dominical - v2" (Boston no tiene Bumblebee). Aplicado 30/sep.
-- Problema: el disparador de Bumblebee en auth.users creaba un perfil "padre" en Escuelita por cada
-- usuario nuevo. Eso rompía admin_create_invited_user (perfil duplicado → no se podían crear cuentas)
-- y metía cuentas de Bumblebee como "padres" en Equipo → Familias.

create or replace function public.handle_bumblebee_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email like '%@accesskids.local' or (new.raw_app_meta_data ? 'role') then
    return new; -- cuenta de Escuelita
  end if;
  insert into public.bumblebee_profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

delete from public.profiles p
using auth.users u
where u.id = p.id
  and p.role = 'padre'
  and p.cedula is null
  and exists (select 1 from public.bumblebee_profiles b where b.id = p.id)
  and not exists (select 1 from public.ninos_padres np where np.padre_id = p.id)
  and u.email not like '%@accesskids.local';

-- Pendiente (paso 3): cuando la app Bumblebee apunte a su nuevo proyecto, copiar allá
-- auth.users + auth.identities de sus 6 cuentas, bumblebee_profiles/attempts/garden/stars,
-- y luego borrar aquí: tablas bumblebee_*, bucket bumblebee-images, políticas bb_*,
-- disparador on_auth_user_created_bumblebee y función handle_bumblebee_new_user.
