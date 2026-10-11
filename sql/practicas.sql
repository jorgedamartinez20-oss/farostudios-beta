-- Faro Academy · grabadora de práctica
-- El alumno graba su ejercicio, queda en "ac_practicas" para que el docente/admin lo evalúe.
-- La racha sube sola con la práctica diaria; los XP los otorga quien evalúa. Seguro de correr más de una vez.

alter table public.ac_estudiantes add column if not exists ultima_practica date;

create table if not exists public.ac_practicas (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  instrumento text,
  herramienta text,
  bpm int,
  duracion_seg int not null check (duracion_seg between 5 and 900),
  ruta text not null,                       -- ruta en el bucket "academy": <estudiante>/practica/<archivo>
  nota_alumno text,
  estado text not null default 'pendiente' check (estado in ('pendiente','evaluada')),
  puntaje smallint check (puntaje between 1 and 10),
  comentario text,
  xp int not null default 0,
  evaluado_por text,
  evaluado_en timestamptz
);
create index if not exists ac_practicas_est_idx on public.ac_practicas (estudiante_id, creado desc);
create index if not exists ac_practicas_pend_idx on public.ac_practicas (estado, creado desc);

alter table public.ac_practicas enable row level security;
drop policy if exists "admin todo" on public.ac_practicas;
create policy "admin todo" on public.ac_practicas for all using (es_admin()) with check (es_admin());
drop policy if exists "ver propio" on public.ac_practicas;
create policy "ver propio" on public.ac_practicas for select using (ac_ve(estudiante_id));
drop policy if exists "docente ve asignados" on public.ac_practicas;
create policy "docente ve asignados" on public.ac_practicas for select using (ac_docente_de(estudiante_id));
drop policy if exists "equipo academy ac_practicas" on public.ac_practicas;
create policy "equipo academy ac_practicas" on public.ac_practicas for all using (tiene_permiso('academy')) with check (tiene_permiso('academy'));

-- Audios: mismo bucket "academy", carpeta <estudiante>/practica/
drop policy if exists "academy alumno graba practica" on storage.objects;
create policy "academy alumno graba practica" on storage.objects for insert with check (
  bucket_id = 'academy' and ac_uuid_seguro((storage.foldername(name))[1]) is not null
  and (storage.foldername(name))[2] = 'practica' and ac_es_alumno(ac_uuid_seguro((storage.foldername(name))[1])));
drop policy if exists "academy leer practica" on storage.objects;
create policy "academy leer practica" on storage.objects for select using (
  bucket_id = 'academy' and ac_uuid_seguro((storage.foldername(name))[1]) is not null
  and (storage.foldername(name))[2] = 'practica'
  and (ac_ve(ac_uuid_seguro((storage.foldername(name))[1])) or ac_docente_de(ac_uuid_seguro((storage.foldername(name))[1])) or tiene_permiso('academy')));

-- El alumno registra su práctica (no puede darse XP ni nota). Sube la racha una vez por día (hora de Guatemala).
create or replace function public.ac_registrar_practica(p_est uuid, p_ruta text, p_dur int, p_instr text, p_herr text, p_bpm int, p_nota text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_hoy date := (now() at time zone 'America/Guatemala')::date; v_ult date; v_racha int; v_id uuid;
begin
  if not public.ac_es_alumno(p_est) then raise exception 'permiso'; end if;
  if p_dur is null or p_dur < 20 or p_dur > 900 then raise exception 'duracion'; end if;
  if p_ruta is null or split_part(p_ruta,'/',1) <> p_est::text or split_part(p_ruta,'/',2) <> 'practica' then raise exception 'ruta'; end if;
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

-- Quien evalúa pone nota (1 a 10), comentario y XP. Si se re-evalúa, solo se ajusta la diferencia de XP.
create or replace function public.ac_evaluar_practica(p_id uuid, p_puntaje int, p_comentario text, p_xp int)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_est uuid; v_old int; v_xp int := greatest(0, least(coalesce(p_xp,0), 50)); v_quien text;
begin
  select estudiante_id, xp into v_est, v_old from public.ac_practicas where id = p_id;
  if v_est is null then raise exception 'no existe'; end if;
  if not (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(v_est)) then raise exception 'permiso'; end if;
  if p_puntaje is null or p_puntaje < 1 or p_puntaje > 10 then raise exception 'puntaje'; end if;
  select coalesce((select d.nombre from public.ac_cuentas c join public.ac_docentes d on d.id = c.docente_id where c.user_id = auth.uid() and c.rol = 'docente' limit 1), 'Equipo Faro') into v_quien;
  update public.ac_practicas set estado='evaluada', puntaje=p_puntaje, comentario=left(p_comentario,500), xp=v_xp, evaluado_por=v_quien, evaluado_en=now() where id = p_id;
  update public.ac_estudiantes set xp = greatest(0, coalesce(xp,0) + v_xp - coalesce(v_old,0)) where id = v_est;
  return jsonb_build_object('xp', v_xp, 'puntaje', p_puntaje);
end $$;

revoke all on function public.ac_registrar_practica(uuid,text,int,text,text,int,text) from public, anon;
revoke all on function public.ac_evaluar_practica(uuid,int,text,int) from public, anon;
grant execute on function public.ac_registrar_practica(uuid,text,int,text,text,int,text) to authenticated;
grant execute on function public.ac_evaluar_practica(uuid,int,text,int) to authenticated;
