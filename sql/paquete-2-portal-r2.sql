-- Faro · Paquete 2: el portal recibe la carpeta R2 del docente y de sus alumnos.
-- Pegar en Supabase → SQL Editor → Run. Seguro de repetir.
create or replace function public.ac_mi_perfil()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce((
    select jsonb_build_object(
      'rol', c.rol, 'usuario', c.usuario,
      'alumno', (select jsonb_build_object('id', e.id, 'nombre', e.nombre, 'apodo', e.apodo) from public.ac_estudiantes e where e.id = c.estudiante_id),
      'hijos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'area', e.area) order by e.nombre)
                           from public.ac_vinculos v join public.ac_estudiantes e on e.id = v.estudiante_id
                          where v.encargado_id = c.encargado_id and e.activo), '[]'::jsonb),
      'docente', (select jsonb_build_object('id', d.id, 'nombre', d.nombre, 'carpeta', d.carpeta) from public.ac_docentes d where d.id = c.docente_id),
      'cliente', (select jsonb_build_object('id', k.id, 'nombre', k.nombre, 'proyecto', k.proyecto, 'correo', k.correo) from public.cl_clientes k where k.id = c.cliente_id))
    from public.ac_cuentas c where c.user_id = auth.uid() and c.activo limit 1), '{}'::jsonb);
$$;

create or replace function public.ac_docente_alumnos()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when public.ac_es_docente() then coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'area', e.area, 'detalle', e.detalle, 'carpeta', e.carpeta) order by e.nombre)
      from public.ac_estudiantes e where e.activo and public.ac_docente_de(e.id)), '[]'::jsonb) else '[]'::jsonb end;
$$;

-- Los permisos de estas funciones no cambian (siguen cerradas al público anónimo).
revoke all on function public.ac_mi_perfil() from public, anon;
revoke all on function public.ac_docente_alumnos() from public, anon;
grant execute on function public.ac_mi_perfil() to authenticated;
grant execute on function public.ac_docente_alumnos() to authenticated;
