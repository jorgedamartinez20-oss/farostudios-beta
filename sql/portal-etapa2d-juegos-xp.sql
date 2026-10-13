-- Faro · Portal etapa 2D — XP de los juegos ("Aumentar XP"), del afinador y del metrónomo.
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra datos.
-- El navegador del alumno reporta lo que ganó; la base pone los topes para que no se pueda inflar:
--   juegos: 20 XP por juego al día · afinador y metrónomo: 10 XP al día cada uno · máximo 15 XP por envío · 90 XP al día entre todo.

create table if not exists public.ac_xp_log (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  fecha date not null default ((now() at time zone 'America/Guatemala')::date),
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  fuente text not null,
  xp int not null,
  puntaje int
);
create index if not exists ac_xp_log_idx on public.ac_xp_log (estudiante_id, fecha, fuente);
alter table public.ac_xp_log enable row level security;
drop policy if exists "ver mi xp" on public.ac_xp_log;
create policy "ver mi xp" on public.ac_xp_log for select to authenticated using (
  public.es_admin() or public.ac_ve(estudiante_id) or public.ac_docente_de(estudiante_id) or public.tiene_permiso('academy'));
grant select on public.ac_xp_log to authenticated;

create or replace function public.ac_ganar_xp(p_fuente text, p_xp int, p_puntaje int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_hoy date := (now() at time zone 'America/Guatemala')::date; v_tope int; v_usado int; v_total int; v_dar int; v_xp int;
begin
  select estudiante_id into v_est from public.ac_cuentas where user_id = auth.uid() and rol = 'alumno' and activo limit 1;
  if v_est is null then raise exception 'permiso'; end if;
  v_tope := case
    when p_fuente in ('ing-traductor','ing-escucha','ing-completar','ing-pronunciar','ing-escribir',
                      'mus-acordes','mus-compas','mus-ritmo','mus-mayormenor','mus-notas') then 20
    when p_fuente in ('afinador','metronomo') then 10
    else null end;
  if v_tope is null then raise exception 'fuente'; end if;
  select coalesce(sum(xp),0) into v_usado from public.ac_xp_log where estudiante_id = v_est and fecha = v_hoy and fuente = p_fuente;
  select coalesce(sum(xp),0) into v_total from public.ac_xp_log where estudiante_id = v_est and fecha = v_hoy;
  v_dar := greatest(0, least(coalesce(p_xp,0), 15, v_tope - v_usado, 90 - v_total));
  if v_dar > 0 then
    insert into public.ac_xp_log (estudiante_id, fuente, xp, puntaje) values (v_est, p_fuente, v_dar, p_puntaje);
    update public.ac_estudiantes set xp = coalesce(xp,0) + v_dar where id = v_est;
  end if;
  select coalesce(xp,0) into v_xp from public.ac_estudiantes where id = v_est;
  return jsonb_build_object('dado', v_dar, 'xp', v_xp, 'tope', v_dar < least(coalesce(p_xp,0),15));
end $$;
revoke all on function public.ac_ganar_xp(text,int,int) from public, anon;
grant execute on function public.ac_ganar_xp(text,int,int) to authenticated;
