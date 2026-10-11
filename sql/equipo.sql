-- Equipo del administrador: personas con permisos que elige el director.
-- Solo SUMA: no cambia es_admin() ni borra ninguna política. El director
-- (reservas@farostudios.net) sigue pudiendo todo; esto da acceso extra, por casillas, a otras personas.
-- Se puede correr varias veces sin problema.

create table if not exists public.admin_equipo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null,
  nombre text not null,
  etiqueta text,                         -- "Docente", "Fotógrafo"… (solo para mostrar)
  permisos text[] not null default '{}', -- claves de permiso (ver tiene_permiso)
  enlace_subida text,                    -- enlace personal "Solicitar archivos" de OneDrive
  activo boolean not null default true,
  creado timestamptz not null default now(),
  ultimo_acceso timestamptz,
  ultima_actividad text,                 -- resumen corto de lo último que cambió
  ultima_actividad_en timestamptz
);
create unique index if not exists admin_equipo_usuario_idx on public.admin_equipo (lower(usuario));
alter table public.admin_equipo enable row level security;

drop policy if exists "director equipo" on public.admin_equipo;
create policy "director equipo" on public.admin_equipo
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- cada persona puede leer solo su propia fila (nunca cambiarla: así nadie se sube los permisos)
drop policy if exists "ver mi fila" on public.admin_equipo;
create policy "ver mi fila" on public.admin_equipo
  for select to authenticated using (user_id = auth.uid());

-- ¿la persona conectada tiene este permiso? (el director siempre sí)
create or replace function public.tiene_permiso(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin() or exists (
    select 1 from public.admin_equipo e
     where e.user_id = auth.uid() and e.activo and p = any(e.permisos));
$$;

-- registra conexión y, si se manda, un resumen corto de la última acción
create or replace function public.equipo_registrar(p_actividad text default null)
returns void language sql security definer set search_path = public as $$
  update public.admin_equipo
     set ultimo_acceso = now(),
         ultima_actividad = coalesce(left(nullif(trim(p_actividad), ''), 40), ultima_actividad),
         ultima_actividad_en = case when nullif(trim(p_actividad), '') is null then ultima_actividad_en else now() end
   where user_id = auth.uid() and activo;
$$;

revoke execute on function public.tiene_permiso(text) from public, anon;
revoke execute on function public.equipo_registrar(text) from public, anon;
grant execute on function public.tiene_permiso(text) to authenticated;
grant execute on function public.equipo_registrar(text) to authenticated;

-- Permisos → tablas (acceso total a esas tablas para quien tenga el permiso)
--   agenda           Agenda y reservas
--   contenido        Planificación de contenido
--   clientes         Clientes, cotizaciones y avisos
--   academy          Alumnos, encargados, docentes, clases, tareas, progreso y mensajes
--   academy_accesos  Crear usuario y contraseña del portal
--   academy_facturas Facturas y pagos de Academy
--   metricas         Estadísticas y redes
--   subir_material   Solo ve su enlace de subida (no necesita tablas)
-- Solo el director: usuarios y permisos, recordatorios, materiales (R2), sitio web, reglas y config.
do $$
declare m record;
begin
  for m in select * from (values
    ('agenda','agenda'),('agenda','bloqueos'),('agenda','bloqueos_semanales'),('agenda','reservas'),
    ('contenido','contenido'),('contenido','contenido_sesiones'),('contenido','contenido_material'),
    ('clientes','cl_clientes'),('clientes','cl_documentos'),('clientes','cl_mensajes'),
    ('clientes','cotizaciones'),('clientes','avisos_clientes'),
    ('academy','ac_estudiantes'),('academy','ac_encargados'),('academy','ac_docentes'),('academy','ac_vinculos'),
    ('academy','ac_clases'),('academy','ac_materiales'),('academy','ac_tareas'),('academy','ac_evaluaciones'),
    ('academy','ac_habilidades'),('academy','ac_logros'),('academy','ac_recomendaciones'),
    ('academy','ac_diplomas'),('academy','ac_mensajes'),
    ('academy_accesos','ac_cuentas'),
    ('academy_facturas','ac_facturas'),
    ('metricas','redes_stats')
  ) as t(p, tbl) loop
    execute format('drop policy if exists %I on public.%I', 'equipo ' || m.p || ' ' || m.tbl, m.tbl);
    execute format('create policy %I on public.%I for all to authenticated using (public.tiene_permiso(%L)) with check (public.tiene_permiso(%L))',
                   'equipo ' || m.p || ' ' || m.tbl, m.tbl, m.p, m.p);
  end loop;
end $$;

-- solo lectura
drop policy if exists "equipo agenda config" on public.config;
create policy "equipo agenda config" on public.config for select to authenticated using (public.tiene_permiso('agenda'));
drop policy if exists "equipo metricas visitas" on public.visitas;
create policy "equipo metricas visitas" on public.visitas for select to authenticated using (public.tiene_permiso('metricas'));
