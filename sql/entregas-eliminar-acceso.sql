-- Eliminar el acceso de un cliente de Entregas (usuario, cuenta, proyectos y registros) desde el Workspace.
-- Solo el administrador puede usarla. Correrla una sola vez en Supabase > SQL Editor.
create or replace function en_eliminar_cuenta(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not es_admin() then raise exception 'Solo el administrador'; end if;
  if not exists (select 1 from en_cuentas where user_id = p_user) then raise exception 'No es una cuenta de Entregas'; end if;
  if exists (select 1 from admin_equipo where user_id = p_user) then raise exception 'Ese usuario es del equipo, no un cliente'; end if;
  delete from en_comentarios where user_id = p_user;
  delete from en_favoritos   where user_id = p_user;
  delete from en_listas      where user_id = p_user;
  delete from en_resenas     where user_id = p_user;
  delete from en_solicitudes where user_id = p_user;
  delete from en_cuentas     where user_id = p_user;   -- borra en cascada proyectos, archivos y rondas
  delete from auth.users     where id = p_user;
end $$;
revoke all on function en_eliminar_cuenta(uuid) from public;
grant execute on function en_eliminar_cuenta(uuid) to authenticated;
