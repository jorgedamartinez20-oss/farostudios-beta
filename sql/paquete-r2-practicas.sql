-- Faro · Paquete 1: carpetas en R2 por persona, permisos de archivos, docentes acotados, grabadora de práctica.
-- Seguro de correr más de una vez. Los archivos viven en R2 (servicio "faro-archivos"); aquí solo se guardan los datos
-- y las reglas de quién puede leer, subir o borrar cada ruta (el servicio las consulta con archivo_permiso).

/* ───────── 1. Carpeta propia en R2 para cada alumno, docente y cliente ───────── */
create or replace function public.faro_slug(t text) returns text
language sql immutable set search_path = '' as $$
  select left(trim(both '-' from regexp_replace(lower(translate(coalesce(t,''),
    'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g')), 40)
$$;

alter table public.ac_estudiantes add column if not exists carpeta text;
alter table public.ac_docentes    add column if not exists carpeta text;
alter table public.cl_clientes    add column if not exists carpeta text;
create unique index if not exists ac_estudiantes_carpeta_uq on public.ac_estudiantes (carpeta) where carpeta is not null;
create unique index if not exists ac_docentes_carpeta_uq    on public.ac_docentes (carpeta)    where carpeta is not null;
create unique index if not exists cl_clientes_carpeta_uq    on public.cl_clientes (carpeta)    where carpeta is not null;

-- La carpeta la pone siempre el sistema (nombre + 8 letras del id) y nunca cambia, aunque renombres a la persona.
create or replace function public.faro_carpeta() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.carpeta is not null then new.carpeta := old.carpeta; return new; end if;
  new.carpeta := case tg_table_name
      when 'ac_estudiantes' then 'faro-academy/estudiantes/'
      when 'ac_docentes' then 'faro-academy/docentes/'
      else 'faro-studios/clientes/' end
    || coalesce(nullif(public.faro_slug(new.nombre), ''), 'sin-nombre') || '-' || left(new.id::text, 8) || '/';
  return new;
end $$;

drop trigger if exists faro_carpeta_est on public.ac_estudiantes;
create trigger faro_carpeta_est before insert or update on public.ac_estudiantes for each row execute function public.faro_carpeta();
drop trigger if exists faro_carpeta_doc on public.ac_docentes;
create trigger faro_carpeta_doc before insert or update on public.ac_docentes for each row execute function public.faro_carpeta();
drop trigger if exists faro_carpeta_cli on public.cl_clientes;
create trigger faro_carpeta_cli before insert or update on public.cl_clientes for each row execute function public.faro_carpeta();

update public.ac_estudiantes set nombre = nombre where carpeta is null;
update public.ac_docentes    set nombre = nombre where carpeta is null;
update public.cl_clientes    set nombre = nombre where carpeta is null;

/* ───────── 2. Quién puede leer / subir / borrar cada archivo de R2 ─────────
   El servicio de archivos llama a esta función con la sesión de la persona; la base decide.
   Estructura:  faro-academy/estudiantes/<carpeta>/<tipo>/<archivo>
                faro-academy/docentes/<carpeta>/<archivo>        (material "para todos mis alumnos")
                faro-studios/clientes/<carpeta>/<archivo>
   tipos de alumno: material · respuestas · practicas · mis-archivos · diplomas · facturas */
create or replace function public.archivo_permiso(p_key text, p_accion text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_carp text; v_resto text; v_tipo text; v_n int;
begin
  if p_key is null or p_accion not in ('leer','escribir','borrar') or length(p_key) > 400
     or p_key like '%..%' or p_key like '%//%' or position(E'\\' in p_key) > 0 or left(p_key,1) = '/' or right(p_key,1) = '/' then
    return false;
  end if;
  if public.es_admin() then return true; end if;

  -- carpeta de alumno
  select id, carpeta into v_id, v_carp from public.ac_estudiantes where carpeta is not null and starts_with(p_key, carpeta) limit 1;
  if v_id is not null then
    v_resto := substr(p_key, length(v_carp) + 1);
    v_n := array_length(string_to_array(v_resto, '/'), 1);
    v_tipo := split_part(v_resto, '/', 1);
    if v_n <> 2 or split_part(v_resto, '/', 2) = '' then return false; end if;
    if v_tipo = 'facturas' then
      return public.ac_ve_facturas(v_id) and p_accion = 'leer' or public.tiene_permiso('academy_facturas');
    end if;
    if v_tipo in ('material','respuestas') then
      if p_accion = 'leer' then return public.ac_ve(v_id) or public.ac_docente_de(v_id) or public.tiene_permiso('academy'); end if;
      return public.ac_docente_de(v_id) or public.tiene_permiso('academy');
    end if;
    if v_tipo in ('practicas','mis-archivos') then
      if p_accion = 'leer' then return public.ac_ve(v_id) or public.ac_docente_de(v_id) or public.tiene_permiso('academy'); end if;
      if p_accion = 'escribir' then return public.ac_es_alumno(v_id) or public.tiene_permiso('academy'); end if;
      return public.tiene_permiso('academy');            -- borrar: solo el equipo; alumnos y familias no borran
    end if;
    if v_tipo = 'diplomas' then
      if p_accion = 'leer' then return public.ac_ve(v_id) or public.ac_docente_de(v_id) or public.tiene_permiso('academy'); end if;
      return public.tiene_permiso('academy');
    end if;
    return false;
  end if;

  -- carpeta de docente
  select id, carpeta into v_id, v_carp from public.ac_docentes where carpeta is not null and starts_with(p_key, carpeta) limit 1;
  if v_id is not null then
    v_resto := substr(p_key, length(v_carp) + 1);
    if v_resto = '' or position('/' in v_resto) > 0 then return false; end if;
    if public.tiene_permiso('academy') then return true; end if;
    if exists (select 1 from public.ac_cuentas c where c.user_id = auth.uid() and c.rol = 'docente' and c.activo and c.docente_id = v_id) then
      return true;                                       -- el docente en su propia carpeta: ver, subir y borrar
    end if;
    return p_accion = 'leer' and exists (select 1 from public.ac_asignaciones a where a.docente_id = v_id and public.ac_ve(a.estudiante_id));
  end if;

  -- carpeta de cliente de Studios
  select id, carpeta into v_id, v_carp from public.cl_clientes where carpeta is not null and starts_with(p_key, carpeta) limit 1;
  if v_id is not null then
    v_resto := substr(p_key, length(v_carp) + 1);
    if v_resto = '' or position('/' in v_resto) > 0 then return false; end if;
    if p_accion = 'leer' then return public.cl_ve(v_id) or public.tiene_permiso('clientes'); end if;
    return public.tiene_permiso('clientes');
  end if;

  return false;
end $$;
revoke all on function public.archivo_permiso(text, text) from public, anon;
grant execute on function public.archivo_permiso(text, text) to authenticated;

/* ───────── 3. Docentes: solo sus alumnos y sus materiales ───────── */
-- ¿Quien subió el material es un docente? (la tabla de cuentas no es visible para todos, por eso va en una función)
create or replace function public.ac_subido_por_docente(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ac_cuentas c where c.user_id = p_uid and c.rol = 'docente');
$$;
-- Material "para todos mis alumnos": solo lo ven los alumnos y familias de ESE docente. El que sube el director lo ve toda la academia.
create or replace function public.ac_mat_general_visible(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not public.ac_subido_por_docente(p_uid)
      or exists (select 1 from public.ac_cuentas cd join public.ac_asignaciones a on a.docente_id = cd.docente_id
                  where cd.user_id = p_uid and cd.rol = 'docente' and public.ac_ve(a.estudiante_id));
$$;
revoke all on function public.ac_subido_por_docente(uuid) from public, anon;
revoke all on function public.ac_mat_general_visible(uuid) from public, anon;
grant execute on function public.ac_subido_por_docente(uuid) to authenticated;
grant execute on function public.ac_mat_general_visible(uuid) to authenticated;

drop policy if exists "docente ve material" on public.ac_materiales;
create policy "docente ve material" on public.ac_materiales for select to authenticated using (
  public.ac_es_docente() and (
    subido_uid = auth.uid()
    or (estudiante_id is not null and public.ac_docente_de(estudiante_id))
    or (estudiante_id is null and not public.ac_subido_por_docente(subido_uid))));

drop policy if exists "docente sube material" on public.ac_materiales;
create policy "docente sube material" on public.ac_materiales for insert to authenticated with check (
  public.ac_es_docente() and subido_por = 'academy' and subido_uid = auth.uid()
  and categoria = any (array['material','hoja','ejercicio','sesion'])
  and (estudiante_id is null or public.ac_docente_de(estudiante_id)));

drop policy if exists "ver material" on public.ac_materiales;
create policy "ver material" on public.ac_materiales for select to authenticated using (
  public.ac_ve(estudiante_id)
  or (estudiante_id is null and public.ac_es_miembro() and public.ac_mat_general_visible(subido_uid)));

drop policy if exists "alumno borra su material" on public.ac_materiales;   -- alumnos y familias no borran

/* ───────── 4. Grabadora de práctica (audio en R2) ───────── */
alter table public.ac_estudiantes add column if not exists ultima_practica date;

create table if not exists public.ac_practicas (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  instrumento text, herramienta text, bpm int,
  duracion_seg int not null check (duracion_seg between 5 and 900),
  ruta text not null,                          -- clave en R2: <carpeta del alumno>practicas/<archivo>
  nota_alumno text,
  estado text not null default 'pendiente' check (estado in ('pendiente','evaluada')),
  puntaje smallint check (puntaje between 1 and 10),
  comentario text,
  xp int not null default 0,
  evaluado_por text, evaluado_en timestamptz,
  resp_ruta text,                              -- respuesta en audio del docente: <carpeta del alumno>respuestas/<archivo>
  resp_dur int
);
alter table public.ac_practicas add column if not exists resp_ruta text;
alter table public.ac_practicas add column if not exists resp_dur int;
create index if not exists ac_practicas_est_idx  on public.ac_practicas (estudiante_id, creado desc);
create index if not exists ac_practicas_pend_idx on public.ac_practicas (estado, creado desc);

alter table public.ac_practicas enable row level security;
drop policy if exists "admin todo" on public.ac_practicas;
create policy "admin todo" on public.ac_practicas for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "ver propio" on public.ac_practicas;
create policy "ver propio" on public.ac_practicas for select to authenticated using (public.ac_ve(estudiante_id));
drop policy if exists "docente ve asignados" on public.ac_practicas;
create policy "docente ve asignados" on public.ac_practicas for select to authenticated using (public.ac_docente_de(estudiante_id));
drop policy if exists "equipo academy ac_practicas" on public.ac_practicas;
create policy "equipo academy ac_practicas" on public.ac_practicas for all to authenticated
  using (public.tiene_permiso('academy')) with check (public.tiene_permiso('academy'));
grant select, insert, update, delete on public.ac_practicas to authenticated;

-- Una práctica evaluada aparece también en el progreso del alumno (sus notas).
alter table public.ac_evaluaciones add column if not exists practica_id uuid references public.ac_practicas(id) on delete cascade;
create unique index if not exists ac_evaluaciones_practica_uq on public.ac_evaluaciones (practica_id) where practica_id is not null;

drop function if exists public.ac_registrar_practica(uuid,text,int,text,text,int,text);
create or replace function public.ac_registrar_practica(p_est uuid, p_ruta text, p_dur int, p_instr text, p_herr text, p_bpm int, p_nota text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hoy date := (now() at time zone 'America/Guatemala')::date; v_ult date; v_racha int; v_id uuid; v_carp text;
begin
  if not public.ac_es_alumno(p_est) then raise exception 'permiso'; end if;
  if p_dur is null or p_dur < 5 or p_dur > 900 then raise exception 'duracion'; end if;
  select carpeta into v_carp from public.ac_estudiantes where id = p_est;
  if v_carp is null or p_ruta is null or not starts_with(p_ruta, v_carp || 'practicas/') or length(p_ruta) > 300 then raise exception 'ruta'; end if;
  if (select count(*) from public.ac_practicas where estudiante_id = p_est and creado > now() - interval '1 day') >= 12 then raise exception 'limite'; end if;
  insert into public.ac_practicas (estudiante_id, instrumento, herramienta, bpm, duracion_seg, ruta, nota_alumno)
    values (p_est, left(p_instr,40), left(p_herr,40), p_bpm, p_dur, p_ruta, left(p_nota,300)) returning id into v_id;
  select ultima_practica, coalesce(racha,0) into v_ult, v_racha from public.ac_estudiantes where id = p_est;
  if v_ult is distinct from v_hoy then
    v_racha := case when v_ult = v_hoy - 1 or v_ult is null then v_racha + 1 else 1 end;
    update public.ac_estudiantes set racha = v_racha, ultima_practica = v_hoy where id = p_est;
  end if;
  return jsonb_build_object('id', v_id, 'racha', v_racha);
end $$;

drop function if exists public.ac_evaluar_practica(uuid,int,text,int);
create or replace function public.ac_evaluar_practica(p_id uuid, p_puntaje int, p_comentario text, p_xp int, p_resp_ruta text default null, p_resp_dur int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_old int; v_xp int := greatest(0, least(coalesce(p_xp,0), 50)); v_quien text; v_carp text; v_instr text;
begin
  select estudiante_id, xp, instrumento into v_est, v_old, v_instr from public.ac_practicas where id = p_id;
  if v_est is null then raise exception 'no existe'; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if p_puntaje is null or p_puntaje < 1 or p_puntaje > 10 then raise exception 'puntaje'; end if;
  select carpeta into v_carp from public.ac_estudiantes where id = v_est;
  if p_resp_ruta is not null and (v_carp is null or not starts_with(p_resp_ruta, v_carp || 'respuestas/') or length(p_resp_ruta) > 300) then raise exception 'ruta'; end if;
  select coalesce((select d.nombre from public.ac_cuentas c join public.ac_docentes d on d.id = c.docente_id where c.user_id = auth.uid() and c.rol = 'docente' limit 1), 'Equipo Faro') into v_quien;
  update public.ac_practicas set estado = 'evaluada', puntaje = p_puntaje, comentario = left(p_comentario,500), xp = v_xp,
         evaluado_por = v_quien, evaluado_en = now(),
         resp_ruta = coalesce(p_resp_ruta, resp_ruta), resp_dur = case when p_resp_ruta is not null then p_resp_dur else resp_dur end
   where id = p_id;
  update public.ac_estudiantes set xp = greatest(0, coalesce(xp,0) + v_xp - coalesce(v_old,0)) where id = v_est;
  insert into public.ac_evaluaciones (estudiante_id, fecha, titulo, puntos, maximo, comentario, practica_id)
    values (v_est, (now() at time zone 'America/Guatemala')::date, 'Práctica' || coalesce(': ' || nullif(v_instr,''), ''), p_puntaje, 10, left(p_comentario,500), p_id)
    on conflict (practica_id) where practica_id is not null do update
      set puntos = excluded.puntos, comentario = excluded.comentario, fecha = excluded.fecha;
  return jsonb_build_object('xp', v_xp, 'puntaje', p_puntaje);
end $$;

revoke all on function public.ac_registrar_practica(uuid,text,int,text,text,int,text) from public, anon;
revoke all on function public.ac_evaluar_practica(uuid,int,text,int,text,int) from public, anon;
grant execute on function public.ac_registrar_practica(uuid,text,int,text,text,int,text) to authenticated;
grant execute on function public.ac_evaluar_practica(uuid,int,text,int,text,int) to authenticated;

/* ───────── 5. Orden y seguridad ───────── */
drop table if exists public.reservas cascade;                                   -- tabla vieja: la real es "agenda"
revoke execute on function public.admin_chat_nombre() from public, anon;       -- solo la usa el chat del equipo
delete from auth.users where email = 'fran-8m3@acceso.farostudios.net';        -- usuario de prueba
