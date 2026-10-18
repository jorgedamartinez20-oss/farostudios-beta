-- ENTREGAS · Faro Studios
-- Pega todo esto en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- Un solo acceso para todos; al crear el usuario eliges el tipo:
--   empresa  → cliente nuestro (colegio, salón, corporativo…): revisión con 2 rondas de cambios
--   agencia  → cliente de otra empresa: revisión flexible, sin límite de rondas
--   galeria  → galería estilo Pixieset (portada + muro de fotos en máxima calidad)

create table if not exists en_cuentas (
  user_id    uuid primary key,
  tipo       text not null check (tipo in ('empresa','agencia','galeria')),
  nombre     text not null,
  slug       text not null,
  usuario    text not null unique,
  email_auth text,
  contacto   text,
  whatsapp   text,
  activo     boolean not null default true,
  creado     timestamptz not null default now()
);

create table if not exists en_proyectos (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references en_cuentas(user_id) on delete cascade,
  titulo      text not null,
  descripcion text,
  estado      text not null default 'borrador' check (estado in ('borrador','en_revision','cambios_pedidos','aprobado','entregado')),
  ronda       int  not null default 1,
  rondas_max  int,                       -- empresa: 2 · agencia: vacío = sin límite · galería: no aplica
  visible     boolean not null default false,   -- "habilitado": el cliente lo ve
  config      jsonb not null default '{}'::jsonb, -- galería: estilo, paleta, portada, textos
  vence       date,
  avisado_en  timestamptz,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists en_proyectos_cuenta on en_proyectos(cuenta_id);

create table if not exists en_archivos (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references en_proyectos(id) on delete cascade,
  key         text not null,            -- ruta en R2 (faro-privado)
  nombre      text not null,
  tipo        text not null default 'otro' check (tipo in ('video','imagen','audio','pdf','otro')),
  orden       int  not null default 0,
  habilitado  boolean not null default true,
  estado      text not null default 'pendiente' check (estado in ('pendiente','aprobado','cambios')),
  version     int  not null default 1,
  creado      timestamptz not null default now()
);
create index if not exists en_archivos_proy on en_archivos(proyecto_id, orden);

create table if not exists en_comentarios (
  id          uuid primary key default gen_random_uuid(),
  archivo_id  uuid not null references en_archivos(id) on delete cascade,
  proyecto_id uuid not null references en_proyectos(id) on delete cascade,
  user_id     uuid not null default auth.uid(),
  ronda       int  not null default 1,
  valoracion  text not null default 'nota' check (valoracion in ('gusta','cambio','nota')),
  segundo     numeric,                  -- minuto exacto del clip (video/audio); vacío = general
  texto       text not null default '',
  enviado     boolean not null default false, -- queda en borrador hasta "Enviar ronda"
  resuelto    boolean not null default false,
  creado      timestamptz not null default now()
);
create index if not exists en_com_arch on en_comentarios(archivo_id);
create index if not exists en_com_proy on en_comentarios(proyecto_id, ronda);

create table if not exists en_rondas (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references en_proyectos(id) on delete cascade,
  ronda       int  not null,
  enviada_en  timestamptz not null default now(),
  cambios     int  not null default 0,
  aprobados   int  not null default 0
);

create table if not exists en_favoritos (
  archivo_id uuid not null references en_archivos(id) on delete cascade,
  user_id    uuid not null default auth.uid(),
  creado     timestamptz not null default now(),
  primary key (archivo_id, user_id)
);

-- Seguridad: cada cliente solo ve lo suyo y solo cuando está habilitado
do $$
declare t text;
begin
  foreach t in array array['en_cuentas','en_proyectos','en_archivos','en_comentarios','en_rondas','en_favoritos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t||'_admin', t);
    execute format('create policy %I on %I for all using (es_admin()) with check (es_admin())', t||'_admin', t);
  end loop;
end $$;

drop policy if exists en_cuentas_yo on en_cuentas;
create policy en_cuentas_yo on en_cuentas for select using (user_id = auth.uid());

drop policy if exists en_proy_cliente on en_proyectos;
create policy en_proy_cliente on en_proyectos for select
  using (visible and cuenta_id = auth.uid());

drop policy if exists en_arch_cliente on en_archivos;
create policy en_arch_cliente on en_archivos for select
  using (habilitado and exists (select 1 from en_proyectos p where p.id = proyecto_id and p.visible and p.cuenta_id = auth.uid()));

drop policy if exists en_com_ver on en_comentarios;
create policy en_com_ver on en_comentarios for select using (user_id = auth.uid());
drop policy if exists en_com_crear on en_comentarios;
create policy en_com_crear on en_comentarios for insert with check (
  user_id = auth.uid() and enviado = false and exists (
    select 1 from en_proyectos p where p.id = proyecto_id and p.visible and p.cuenta_id = auth.uid()
      and p.estado = 'en_revision' and p.ronda = en_comentarios.ronda));
drop policy if exists en_com_editar on en_comentarios;
create policy en_com_editar on en_comentarios for update using (user_id = auth.uid() and enviado = false) with check (user_id = auth.uid() and enviado = false);
drop policy if exists en_com_borrar on en_comentarios;
create policy en_com_borrar on en_comentarios for delete using (user_id = auth.uid() and enviado = false);

drop policy if exists en_ron_cliente on en_rondas;
create policy en_ron_cliente on en_rondas for select
  using (exists (select 1 from en_proyectos p where p.id = proyecto_id and p.cuenta_id = auth.uid()));

drop policy if exists en_fav_yo on en_favoritos;
create policy en_fav_yo on en_favoritos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quién soy (para la página de entrada)
create or replace function en_mi_perfil() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce((select jsonb_build_object('user_id', c.user_id, 'tipo', c.tipo, 'nombre', c.nombre)
                   from en_cuentas c where c.user_id = auth.uid() and c.activo), 'null'::jsonb)
$$;
grant execute on function en_mi_perfil() to authenticated;

-- El cliente marca un clip: aprobado / con cambios / pendiente
create or replace function en_marcar_archivo(p_archivo uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_estado not in ('pendiente','aprobado','cambios') then raise exception 'estado inválido'; end if;
  update en_archivos a set estado = p_estado
   where a.id = p_archivo and a.habilitado
     and exists (select 1 from en_proyectos p where p.id = a.proyecto_id and p.visible
                 and p.cuenta_id = auth.uid() and p.estado = 'en_revision');
  if not found then raise exception 'No se pudo marcar'; end if;
end $$;
grant execute on function en_marcar_archivo(uuid, text) to authenticated;

-- El cliente envía la ronda: se cierran sus notas y Faro recibe todo junto
create or replace function en_enviar_ronda(p_proyecto uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p en_proyectos; n_cam int; n_apr int; n_tot int; nuevo text;
begin
  select * into p from en_proyectos where id = p_proyecto and visible and cuenta_id = auth.uid();
  if not found then raise exception 'Proyecto no disponible'; end if;
  if p.estado <> 'en_revision' then raise exception 'Esta ronda ya fue enviada'; end if;
  update en_comentarios set enviado = true where proyecto_id = p.id and ronda = p.ronda and user_id = auth.uid() and enviado = false;
  select count(*) filter (where estado = 'cambios'), count(*) filter (where estado = 'aprobado'), count(*)
    into n_cam, n_apr, n_tot from en_archivos where proyecto_id = p.id and habilitado;
  nuevo := case when n_tot > 0 and n_apr = n_tot then 'aprobado' else 'cambios_pedidos' end;
  insert into en_rondas(proyecto_id, ronda, cambios, aprobados) values (p.id, p.ronda, n_cam, n_apr);
  update en_proyectos set estado = nuevo, actualizado = now() where id = p.id;
  return jsonb_build_object('estado', nuevo, 'ronda', p.ronda, 'cambios', n_cam, 'aprobados', n_apr);
end $$;
grant execute on function en_enviar_ronda(uuid) to authenticated;

-- Faro abre la siguiente ronda con los archivos corregidos
create or replace function en_abrir_ronda(p_proyecto uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p en_proyectos;
begin
  if not es_admin() then raise exception 'Solo el administrador'; end if;
  select * into p from en_proyectos where id = p_proyecto;
  if not found then raise exception 'No existe'; end if;
  update en_archivos set estado = 'pendiente' where proyecto_id = p.id and estado = 'cambios';
  update en_proyectos set ronda = p.ronda + 1, estado = 'en_revision', actualizado = now() where id = p.id;
  return jsonb_build_object('ronda', p.ronda + 1);
end $$;
grant execute on function en_abrir_ronda(uuid) to authenticated;

-- Permisos de tabla (esta base no los da por defecto). Sin esto el admin y los clientes reciben "permission denied"
-- aunque las políticas RLS estén bien. RLS sigue decidiendo quién ve qué.
grant select, insert, update, delete on public.en_cuentas, public.en_proyectos, public.en_archivos,
  public.en_comentarios, public.en_rondas, public.en_favoritos to authenticated;
notify pgrst, 'reload schema';
