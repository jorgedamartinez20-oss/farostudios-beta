-- Academy: asignación docente ↔ alumno (regla de vínculo).
-- Un docente solo ve a los alumnos que tiene asignados; el director (y quien tenga permiso "academy")
-- asigna, cambia o agrega docentes. Se puede correr varias veces. Requiere haber corrido equipo.sql.

create table if not exists public.ac_asignaciones (
  docente_id uuid not null references public.ac_docentes(id) on delete cascade,
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (docente_id, estudiante_id)
);
create index if not exists ac_asignaciones_est_idx on public.ac_asignaciones (estudiante_id);
alter table public.ac_asignaciones enable row level security;

drop policy if exists "admin todo" on public.ac_asignaciones;
create policy "admin todo" on public.ac_asignaciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists "equipo academy ac_asignaciones" on public.ac_asignaciones;
create policy "equipo academy ac_asignaciones" on public.ac_asignaciones for all to authenticated
  using (public.tiene_permiso('academy')) with check (public.tiene_permiso('academy'));
drop policy if exists "docente ve sus asignaciones" on public.ac_asignaciones;
create policy "docente ve sus asignaciones" on public.ac_asignaciones for select to authenticated
  using (exists (select 1 from public.ac_cuentas c
                  where c.user_id = auth.uid() and c.rol = 'docente' and c.activo and c.docente_id = ac_asignaciones.docente_id));

-- ¿la persona conectada es docente asignado a este alumno?
create or replace function public.ac_docente_de(p_est uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ac_cuentas c
                   join public.ac_docentes d on d.id = c.docente_id and d.activo
                   join public.ac_asignaciones a on a.docente_id = d.id
                  where c.user_id = auth.uid() and c.rol = 'docente' and c.activo and a.estudiante_id = p_est);
$$;
revoke execute on function public.ac_docente_de(uuid) from public, anon;
grant execute on function public.ac_docente_de(uuid) to authenticated;

-- la lista del docente: SOLO sus alumnos asignados
create or replace function public.ac_docente_alumnos()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.ac_es_docente() then coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'nombre', e.nombre, 'apodo', e.apodo, 'area', e.area, 'detalle', e.detalle) order by e.nombre)
      from public.ac_estudiantes e where e.activo and public.ac_docente_de(e.id)), '[]'::jsonb) else '[]'::jsonb end;
$$;

-- el docente ve el progreso de sus alumnos (solo lectura)
do $$
declare t text;
begin
  for t in select unnest(array['ac_estudiantes','ac_tareas','ac_evaluaciones','ac_habilidades','ac_logros','ac_recomendaciones','ac_clases','ac_diplomas']) loop
    execute format('drop policy if exists %I on public.%I', 'docente ve asignados', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ac_docente_de(%s))',
                   'docente ve asignados', t, case when t = 'ac_estudiantes' then 'id' else 'estudiante_id' end);
  end loop;
end $$;

-- para que nadie quede sin docente al estrenar la regla: los docentes actuales quedan con los alumnos activos actuales
insert into public.ac_asignaciones (docente_id, estudiante_id)
  select d.id, e.id from public.ac_docentes d cross join public.ac_estudiantes e
   where d.activo and e.activo
on conflict do nothing;
