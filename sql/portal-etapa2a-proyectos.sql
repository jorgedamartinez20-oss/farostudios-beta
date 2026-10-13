-- Faro · Portal etapa 2A — Proyectos por clase (estilo Padlet/Freeform).
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra ni cambia datos existentes.
-- El docente crea un proyecto por clase con su consigna; el alumno entrega foto / video / audio / documento
-- (se guardan en su carpeta "mis-archivos", así que no hace falta tocar el servicio de archivos);
-- el docente evalúa con XP y una insignia personalizada que aparece en los logros del alumno.

create table if not exists public.ac_proyectos (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  num_clase int,
  titulo text not null check (length(titulo) between 1 and 120),
  consigna text,
  tipos text[] not null default '{foto,video,audio,documento}',
  vence date,
  xp_max int not null default 30 check (xp_max between 0 and 100),
  estado text not null default 'abierto' check (estado in ('abierto','entregado','evaluado')),
  comentario text,
  xp int not null default 0,
  insignia_titulo text,
  insignia_icono text,
  creado_por text,
  evaluado_por text,
  evaluado_en timestamptz
);
create index if not exists ac_proyectos_est_idx on public.ac_proyectos (estudiante_id, num_clase, creado);

create table if not exists public.ac_proyecto_entregas (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  proyecto_id uuid not null references public.ac_proyectos(id) on delete cascade,
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  tipo text not null check (tipo in ('foto','video','audio','documento')),
  ruta text not null,
  nombre text,
  nota text
);
create index if not exists ac_proy_ent_idx on public.ac_proyecto_entregas (proyecto_id, creado);

alter table public.ac_proyectos enable row level security;
alter table public.ac_proyecto_entregas enable row level security;

drop policy if exists "ver proyectos" on public.ac_proyectos;
create policy "ver proyectos" on public.ac_proyectos for select to authenticated using (
  public.es_admin() or public.ac_ve(estudiante_id) or public.ac_docente_de(estudiante_id) or public.tiene_permiso('academy'));
drop policy if exists "ver entregas" on public.ac_proyecto_entregas;
create policy "ver entregas" on public.ac_proyecto_entregas for select to authenticated using (
  public.es_admin() or public.ac_ve(estudiante_id) or public.ac_docente_de(estudiante_id) or public.tiene_permiso('academy'));
grant select on public.ac_proyectos, public.ac_proyecto_entregas to authenticated;

-- Docente: crea el proyecto de una clase.
create or replace function public.ac_crear_proyecto(p_est uuid, p_num int, p_titulo text, p_consigna text, p_tipos text[], p_vence date, p_xp_max int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_quien text; v_tipos text[];
begin
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(p_est)) then raise exception 'permiso'; end if;
  if coalesce(trim(p_titulo),'') = '' then raise exception 'titulo'; end if;
  v_tipos := coalesce((select array_agg(t) from unnest(p_tipos) t where t in ('foto','video','audio','documento')), '{foto,video,audio,documento}');
  select coalesce((select d.nombre from public.ac_cuentas c join public.ac_docentes d on d.id = c.docente_id where c.user_id = auth.uid() and c.rol = 'docente' limit 1), 'Equipo Faro') into v_quien;
  insert into public.ac_proyectos (estudiante_id, num_clase, titulo, consigna, tipos, vence, xp_max, creado_por)
    values (p_est, p_num, left(trim(p_titulo),120), left(p_consigna,2000), v_tipos, p_vence, greatest(0, least(coalesce(p_xp_max,30),100)), v_quien)
    returning id into v_id;
  return v_id;
end $$;

-- Docente: borra un proyecto sin evaluar (uno evaluado ya dio XP; se conserva).
create or replace function public.ac_borrar_proyecto(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_estado text;
begin
  select estudiante_id, estado into v_est, v_estado from public.ac_proyectos where id = p_id;
  if v_est is null then return false; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if v_estado = 'evaluado' then raise exception 'evaluado'; end if;
  delete from public.ac_proyectos where id = p_id;
  return true;
end $$;

-- Alumno: agrega una entrega (el archivo ya se subió a su carpeta "mis-archivos").
create or replace function public.ac_entregar_proyecto(p_proy uuid, p_tipo text, p_ruta text, p_nombre text, p_nota text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_estado text; v_tipos text[]; v_carp text; v_id uuid;
begin
  select estudiante_id, estado, tipos into v_est, v_estado, v_tipos from public.ac_proyectos where id = p_proy;
  if v_est is null or not public.ac_es_alumno(v_est) then raise exception 'permiso'; end if;
  if v_estado = 'evaluado' then raise exception 'evaluado'; end if;
  if p_tipo is null or not (p_tipo = any(v_tipos)) then raise exception 'tipo'; end if;
  select carpeta into v_carp from public.ac_estudiantes where id = v_est;
  if v_carp is null or p_ruta is null or not starts_with(p_ruta, v_carp || 'mis-archivos/') or length(p_ruta) > 300 then raise exception 'ruta'; end if;
  if (select count(*) from public.ac_proyecto_entregas where proyecto_id = p_proy) >= 20 then raise exception 'limite'; end if;
  insert into public.ac_proyecto_entregas (proyecto_id, estudiante_id, tipo, ruta, nombre, nota)
    values (p_proy, v_est, p_tipo, p_ruta, left(p_nombre,120), left(p_nota,300)) returning id into v_id;
  update public.ac_proyectos set estado = 'entregado' where id = p_proy and estado = 'abierto';
  return v_id;
end $$;

-- Docente: evalúa con XP, comentario y una insignia propia (opcional). Se puede corregir después.
create or replace function public.ac_evaluar_proyecto(p_id uuid, p_xp int, p_comentario text, p_ins_titulo text, p_ins_icono text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_max int; v_old int; v_xp int; v_quien text; v_ico text; v_tit text := nullif(trim(coalesce(p_ins_titulo,'')),'');
begin
  select estudiante_id, xp_max, xp into v_est, v_max, v_old from public.ac_proyectos where id = p_id;
  if v_est is null then raise exception 'no existe'; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if not exists (select 1 from public.ac_proyecto_entregas where proyecto_id = p_id) then raise exception 'sin entrega'; end if;
  v_xp := greatest(0, least(coalesce(p_xp,0), v_max));
  v_ico := case when p_ins_icono in ('estrella','nota','fuego','trofeo','libro','microfono','corazon','rayo') then p_ins_icono else 'estrella' end;
  select coalesce((select d.nombre from public.ac_cuentas c join public.ac_docentes d on d.id = c.docente_id where c.user_id = auth.uid() and c.rol = 'docente' limit 1), 'Equipo Faro') into v_quien;
  update public.ac_proyectos set estado = 'evaluado', xp = v_xp, comentario = left(p_comentario,500),
         insignia_titulo = left(v_tit,60), insignia_icono = case when v_tit is null then null else v_ico end,
         evaluado_por = v_quien, evaluado_en = now() where id = p_id;
  update public.ac_estudiantes set xp = greatest(0, coalesce(xp,0) + v_xp - coalesce(v_old,0)) where id = v_est;
  delete from public.ac_logros where estudiante_id = v_est and clave = 'proy-' || p_id::text;
  if v_tit is not null then
    insert into public.ac_logros (estudiante_id, clave, titulo, icono, fecha)
      values (v_est, 'proy-' || p_id::text, left(v_tit,60), v_ico, (now() at time zone 'America/Guatemala')::date);
  end if;
  return jsonb_build_object('xp', v_xp);
end $$;

revoke all on function public.ac_crear_proyecto(uuid,int,text,text,text[],date,int) from public, anon;
revoke all on function public.ac_borrar_proyecto(uuid) from public, anon;
revoke all on function public.ac_entregar_proyecto(uuid,text,text,text,text) from public, anon;
revoke all on function public.ac_evaluar_proyecto(uuid,int,text,text,text) from public, anon;
grant execute on function public.ac_crear_proyecto(uuid,int,text,text,text[],date,int) to authenticated;
grant execute on function public.ac_borrar_proyecto(uuid) to authenticated;
grant execute on function public.ac_entregar_proyecto(uuid,text,text,text,text) to authenticated;
grant execute on function public.ac_evaluar_proyecto(uuid,int,text,text,text) to authenticated;
