-- Faro · Portal etapa 2B — Programa de clases (día, hora, enlace en línea) y "finalizada" con asistencia + XP.
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra datos.

alter table public.ac_clases add column if not exists enlace text;                 -- enlace de la clase en línea (vacío = sin clase en línea)
alter table public.ac_clases add column if not exists xp int not null default 0;   -- XP que se dio al finalizarla (evita darlo dos veces)

-- Docente: programa una clase del estudiante.
create or replace function public.ac_programar_clase(p_est uuid, p_fecha date, p_hora time, p_titulo text, p_modalidad text, p_enlace text, p_nota text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(p_est)) then raise exception 'permiso'; end if;
  if p_fecha is null or coalesce(trim(p_titulo),'') = '' then raise exception 'datos'; end if;
  insert into public.ac_clases (estudiante_id, fecha, hora, titulo, modalidad, enlace, nota, estado)
    values (p_est, p_fecha, p_hora, left(trim(p_titulo),120),
            case when p_modalidad in ('online','presencial') then p_modalidad else 'presencial' end,
            nullif(left(trim(coalesce(p_enlace,'')),500),''), left(p_nota,300), 'programada')
    returning id into v_id;
  return v_id;
end $$;

-- Docente: cambia día, hora, título, enlace o estado (programada / reprogramada / cancelada).
create or replace function public.ac_actualizar_clase(p_id uuid, p_fecha date, p_hora time, p_titulo text, p_modalidad text, p_enlace text, p_estado text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_estado text;
begin
  select estudiante_id, estado into v_est, v_estado from public.ac_clases where id = p_id;
  if v_est is null then return false; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if v_estado = 'dada' then raise exception 'finalizada'; end if;
  update public.ac_clases set
    fecha = coalesce(p_fecha, fecha), hora = p_hora, titulo = coalesce(nullif(left(trim(p_titulo),120),''), titulo),
    modalidad = case when p_modalidad in ('online','presencial') then p_modalidad else modalidad end,
    enlace = nullif(left(trim(coalesce(p_enlace,'')),500),''),
    estado = case when p_estado in ('programada','reprogramada','cancelada') then p_estado else estado end
  where id = p_id;
  return true;
end $$;

-- Docente: marca la clase como finalizada (asistió) y le da XP al estudiante. Solo una vez.
create or replace function public.ac_finalizar_clase(p_id uuid, p_xp int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_estado text; v_xp int := greatest(0, least(coalesce(p_xp,0), 50));
begin
  select estudiante_id, estado into v_est, v_estado from public.ac_clases where id = p_id;
  if v_est is null then raise exception 'no existe'; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if v_estado = 'dada' then return jsonb_build_object('xp', 0, 'ya', true); end if;
  update public.ac_clases set estado = 'dada', xp = v_xp where id = p_id;
  update public.ac_estudiantes set xp = coalesce(xp,0) + v_xp where id = v_est;
  return jsonb_build_object('xp', v_xp);
end $$;

revoke all on function public.ac_programar_clase(uuid,date,time,text,text,text,text) from public, anon;
revoke all on function public.ac_actualizar_clase(uuid,date,time,text,text,text,text) from public, anon;
revoke all on function public.ac_finalizar_clase(uuid,int) from public, anon;
grant execute on function public.ac_programar_clase(uuid,date,time,text,text,text,text) to authenticated;
grant execute on function public.ac_actualizar_clase(uuid,date,time,text,text,text,text) to authenticated;
grant execute on function public.ac_finalizar_clase(uuid,int) to authenticated;
