-- OPCIONAL · Hace OBLIGATORIO el código del teléfono en la base de datos.
-- Sin esto, la pantalla de entrada ya pide el código, pero alguien con tu contraseña podría
-- saltarse la pantalla y hablar directo con la base. Con esto, a quien tenga el código activado,
-- la base solo le da permisos si inició sesión con el código (aal2).
--
-- ANTES DE CORRERLO: activa el código en Preferencias > Seguridad en 2 pasos con TU cuenta y
-- comprueba que entras bien. Quien NO tenga código activado sigue funcionando como hasta ahora.
-- Para deshacerlo: vuelve a correr el original  create or replace function public.es_admin() ... (ver abajo).

create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f
                      where f.user_id = auth.uid() and f.status = 'verified' and f.factor_type = 'totp');
$$;
revoke execute on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;

create or replace function public.es_admin()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'reservas@farostudios.net' and public.mfa_ok()
$$;

create or replace function public.tiene_permiso(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin() or (public.mfa_ok() and exists (
    select 1 from public.admin_equipo e
     where e.user_id = auth.uid() and e.activo and p = any(e.permisos)));
$$;

-- Para deshacer (volver a como estaba):
--   create or replace function public.es_admin() returns boolean language sql stable set search_path = ''
--     as $$ select coalesce(auth.jwt() ->> 'email','') = 'reservas@farostudios.net' $$;
