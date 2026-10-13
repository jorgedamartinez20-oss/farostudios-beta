-- Faro · Portal etapa 1 (docente y alumno).
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra ni cambia datos.
-- Si no se corre, el portal funciona igual: el material queda sin número de clase
-- (se antepone "Clase N ·" al título) y el docente ve el personaje gris en lugar del avatar del alumno.

-- 1) Número de clase en el material (para que el alumno lo vea en orden de carga).
alter table public.ac_materiales add column if not exists num_clase int;

-- 2) El docente ve el avatar que eligió cada uno de SUS alumnos asignados (y nada más del perfil).
create or replace function public.ac_docente_avatares()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when public.ac_es_docente() then coalesce((
    select jsonb_object_agg(e.id::text, p.avatar)
      from public.ac_estudiantes e
      join public.ac_cuentas c on c.estudiante_id = e.id and c.activo
      join public.perfiles_ws p on p.user_id = c.user_id
     where e.activo and public.ac_docente_de(e.id) and p.avatar is not null
  ), '{}'::jsonb) else '{}'::jsonb end;
$$;
revoke all on function public.ac_docente_avatares() from public, anon;
grant execute on function public.ac_docente_avatares() to authenticated;
