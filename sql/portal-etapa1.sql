-- Faro · Portal etapa 1 (docente y alumno).
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra ni cambia datos.
-- Si no se corre, el portal funciona igual: el material queda sin número de clase
-- (se antepone "Clase N ·" al título) y el docente ve el personaje gris en lugar del avatar del alumno.

-- 1) Número de clase en el material (para que el alumno lo vea en orden de carga).
alter table public.ac_materiales add column if not exists num_clase int;

-- 2) Perfil (avatar y color). Si ya corriste perfil-avatar-tema.sql esto no cambia nada; si no, lo crea.
create table if not exists public.perfiles_ws (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar smallint,                       -- 0 a 12 = avatar elegido; -1 = personaje gris; vacío = todavía no eligió
  tema text,                             -- clave del color/tema elegido (ver perfil.js)
  actualizado timestamptz not null default now()
);
alter table public.perfiles_ws enable row level security;

-- cada persona lee y cambia solo su propia fila
drop policy if exists "mi perfil" on public.perfiles_ws;
create policy "mi perfil" on public.perfiles_ws
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- el director puede ver todos (para mostrar avatares del equipo más adelante)
drop policy if exists "director ve perfiles" on public.perfiles_ws;
create policy "director ve perfiles" on public.perfiles_ws
  for select to authenticated using (public.es_admin());

revoke all on public.perfiles_ws from anon;
grant select, insert, update on public.perfiles_ws to authenticated;

-- 3) El docente ve el avatar que eligió cada uno de SUS alumnos asignados (y nada más del perfil).
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
