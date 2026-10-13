-- Faro · Portal etapa 2E — Chat docente ↔ alumno / familia, campana de notificaciones, buzón de sugerencias e insignias ocultas.
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra datos.

/* ───────── 1. Chat: el docente lee y responde en los chats de SUS estudiantes (alumno y familia) ─────────
   Sus mensajes se guardan con de = 'docente' y ya marcados como leídos para el panel de administración (no le cuentan como pendiente). */
drop policy if exists "docente ve chat" on public.ac_mensajes;
create policy "docente ve chat" on public.ac_mensajes for select to authenticated using (public.ac_docente_de(estudiante_id));
drop policy if exists "docente escribe chat" on public.ac_mensajes;
create policy "docente escribe chat" on public.ac_mensajes for insert to authenticated with check (
  de = 'docente' and canal in ('alumno','encargado') and leido_admin = true and public.ac_docente_de(estudiante_id));

/* ───────── 2. Campana: cuándo abrió cada persona su campana por última vez ───────── */
create table if not exists public.ac_visto (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clave text not null,
  visto timestamptz not null default now(),
  primary key (user_id, clave)
);
alter table public.ac_visto enable row level security;
drop policy if exists "mi visto" on public.ac_visto;
create policy "mi visto" on public.ac_visto for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.ac_visto to authenticated;

/* ───────── 3. Buzón de sugerencias (docentes, alumnos y familias) ───────── */
create table if not exists public.ac_sugerencias (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rol text,
  nombre text,
  tipo text not null default 'idea' check (tipo in ('idea','problema','otro')),
  mensaje text not null check (length(mensaje) between 3 and 1500),
  leida boolean not null default false
);
alter table public.ac_sugerencias enable row level security;
drop policy if exists "enviar sugerencia" on public.ac_sugerencias;
create policy "enviar sugerencia" on public.ac_sugerencias for insert to authenticated with check (user_id = auth.uid() and leida = false);
drop policy if exists "ver mis sugerencias" on public.ac_sugerencias;
create policy "ver mis sugerencias" on public.ac_sugerencias for select to authenticated using (user_id = auth.uid());
drop policy if exists "equipo gestiona sugerencias" on public.ac_sugerencias;
create policy "equipo gestiona sugerencias" on public.ac_sugerencias for all to authenticated
  using (public.es_admin() or public.tiene_permiso('academy')) with check (public.es_admin() or public.tiene_permiso('academy'));
grant select, insert, update on public.ac_sugerencias to authenticated;

/* ───────── 4. Insignias ocultas ─────────
   El alumno no ve cómo se ganan: solo aparecen cuando se desbloquean. Se revisan al entrar y al ganar XP. */
create or replace function public.ac_revisar_insignias()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_hora int := extract(hour from (now() at time zone 'America/Guatemala'));
        v_xp int; v_racha int; v_nuevas jsonb := '[]'::jsonb; r record;
begin
  select estudiante_id into v_est from public.ac_cuentas where user_id = auth.uid() and rol = 'alumno' and activo limit 1;
  if v_est is null then return v_nuevas; end if;
  select coalesce(xp,0), coalesce(racha,0) into v_xp, v_racha from public.ac_estudiantes where id = v_est;
  for r in
    select * from (values
      ('oculta-madrugador','Madrugador','estrella', v_hora < 6),
      ('oculta-noctambulo','Noctámbulo','nota', v_hora >= 22),
      ('oculta-constante','Constante','fuego', v_racha >= 7),
      ('oculta-medio-millar','Medio millar','trofeo', v_xp >= 500),
      ('oculta-jugador','Jugador','rayo', (select count(*) from public.ac_xp_log where estudiante_id = v_est and (fuente like 'ing-%' or fuente like 'mus-%')) >= 10),
      ('oculta-impecable','Impecable','corazon', exists (select 1 from public.ac_xp_log where estudiante_id = v_est and puntaje >= 8
          and fuente in ('ing-traductor','ing-escucha','ing-completar','mus-acordes','mus-compas','mus-mayormenor'))),
      ('oculta-todoterreno','Todoterreno','libro', (select count(distinct fuente) from public.ac_xp_log where estudiante_id = v_est and fuente like 'ing-%') >= 5
          or (select count(distinct fuente) from public.ac_xp_log where estudiante_id = v_est and fuente like 'mus-%') >= 5),
      ('oculta-creador','Creador','microfono', (select count(*) from public.ac_proyectos where estudiante_id = v_est and estado = 'evaluado') >= 3)
    ) as t(clave, titulo, icono, cumple)
  loop
    if r.cumple and not exists (select 1 from public.ac_logros where estudiante_id = v_est and clave = r.clave) then
      insert into public.ac_logros (estudiante_id, clave, titulo, icono, fecha)
        values (v_est, r.clave, r.titulo, r.icono, (now() at time zone 'America/Guatemala')::date);
      v_nuevas := v_nuevas || jsonb_build_object('clave', r.clave, 'titulo', r.titulo, 'icono', r.icono);
    end if;
  end loop;
  return v_nuevas;
end $$;
revoke all on function public.ac_revisar_insignias() from public, anon;
grant execute on function public.ac_revisar_insignias() to authenticated;
