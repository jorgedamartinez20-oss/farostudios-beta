-- Faro · Portal etapa 2C — Biblioteca privada del docente, Planificaciones (moodboard) y XP por entrar / merma por inactividad.
-- Pegar en Supabase → SQL Editor → Run. Es seguro repetirlo: solo SUMA, no borra datos.

/* ───────── 1. Biblioteca privada del docente ("Mis archivos") ─────────
   Solo el docente dueño (y el equipo) la ve. Los alumnos no tienen ninguna política: no ven ni las carpetas ni los nombres.
   Los archivos viven en la carpeta propia del docente en R2; aquí solo se guarda cómo los ordena. */
create table if not exists public.ac_biblioteca (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  docente_id uuid not null references public.ac_docentes(id) on delete cascade,
  carpeta text not null default 'General' check (length(carpeta) between 1 and 60),
  nombre text not null check (length(nombre) between 1 and 160),
  ruta text not null,
  tipo text,
  tags text[] not null default '{}',
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);
create index if not exists ac_biblioteca_doc_idx on public.ac_biblioteca (docente_id, carpeta, creado desc);
alter table public.ac_biblioteca enable row level security;

create or replace function public.ac_mi_docente_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.docente_id from public.ac_cuentas c join public.ac_docentes d on d.id = c.docente_id and d.activo
   where c.user_id = auth.uid() and c.rol = 'docente' and c.activo limit 1;
$$;
revoke all on function public.ac_mi_docente_id() from public, anon;
grant execute on function public.ac_mi_docente_id() to authenticated;

drop policy if exists "mi biblioteca" on public.ac_biblioteca;
create policy "mi biblioteca" on public.ac_biblioteca for all to authenticated
  using (docente_id = public.ac_mi_docente_id() or public.es_admin() or public.tiene_permiso('academy'))
  with check (docente_id = public.ac_mi_docente_id() or public.es_admin() or public.tiene_permiso('academy'));
grant select, insert, update, delete on public.ac_biblioteca to authenticated;

/* ───────── 2. Planificaciones: moodboard por estudiante (notas, enlaces y archivos sueltos en un lienzo) ───────── */
create table if not exists public.ac_plan_notas (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  estudiante_id uuid not null references public.ac_estudiantes(id) on delete cascade,
  tipo text not null default 'nota' check (tipo in ('nota','enlace','archivo')),
  texto text check (length(texto) <= 1000),
  url text check (length(url) <= 500),
  ruta text check (length(ruta) <= 400),
  color text not null default '#F4D35E' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  x int not null default 20 check (x between 0 and 4000),
  y int not null default 20 check (y between 0 and 4000)
);
create index if not exists ac_plan_notas_est_idx on public.ac_plan_notas (estudiante_id, creado);
alter table public.ac_plan_notas enable row level security;
drop policy if exists "docente planifica" on public.ac_plan_notas;
create policy "docente planifica" on public.ac_plan_notas for all to authenticated
  using (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(estudiante_id))
  with check (public.es_admin() or public.tiene_permiso('academy') or public.ac_docente_de(estudiante_id));
grant select, insert, update, delete on public.ac_plan_notas to authenticated;

/* ───────── 3. XP por entrar cada día y merma por inactividad ─────────
   +2 XP la primera vez que el alumno entra en el día.
   Con más de 3 días sin entrar pierde 3 XP por cada día de más (máximo 30 de una vez),
   y nunca baja del inicio de su nivel actual (no pierde niveles). */
alter table public.ac_estudiantes add column if not exists ultima_actividad date;

create or replace function public.ac_registrar_actividad()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_est uuid; v_hoy date := (now() at time zone 'America/Guatemala')::date; v_ult date; v_xp int; v_dias int; v_merma int := 0; v_piso int; v_nuevo int; v_bono int := 2;
begin
  select estudiante_id into v_est from public.ac_cuentas where user_id = auth.uid() and rol = 'alumno' and activo limit 1;
  if v_est is null then return jsonb_build_object('alumno', false); end if;
  select ultima_actividad, coalesce(xp,0) into v_ult, v_xp from public.ac_estudiantes where id = v_est;
  if v_ult = v_hoy then return jsonb_build_object('alumno', true, 'xp', v_xp, 'dias', 0, 'merma', 0, 'bono', 0); end if;
  v_dias := case when v_ult is null then 0 else v_hoy - v_ult end;
  if v_dias > 3 then
    v_piso := (v_xp / 100) * 100;
    v_nuevo := greatest(v_piso, v_xp - least((v_dias - 3) * 3, 30));
    v_merma := v_xp - v_nuevo; v_xp := v_nuevo;
  end if;
  v_xp := v_xp + v_bono;
  update public.ac_estudiantes set xp = v_xp, ultima_actividad = v_hoy where id = v_est;
  return jsonb_build_object('alumno', true, 'xp', v_xp, 'dias', v_dias, 'merma', v_merma, 'bono', v_bono);
end $$;
revoke all on function public.ac_registrar_actividad() from public, anon;
grant execute on function public.ac_registrar_actividad() to authenticated;
