-- RESEÑAS PÚBLICAS · enlace privado para que cada cliente deje su reseña (sin correo, sin cuenta)
-- Pega todo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- Requiere haber corrido antes sql/entregas.sql (trae la función es_admin()).
--
-- Cómo funciona:
--  · En el Workspace (Clientes → Reseñas) creas un enlace para un cliente. Cada enlace sirve UNA sola vez.
--  · El cliente abre farostudios.net/resenas?c=… y llena: tipo (individual o empresa), nombre, trabajo, estrellas y opinión.
--  · Al enviar, la base le genera un código de descuento único y lo muestra en pantalla.
--  · La reseña llega al Workspace para que la edites, le cargues la foto y la publiques en la web.
-- El cliente (sin sesión) solo puede usar dos funciones: rs_validar y rs_enviar. No puede leer nada de las tablas.

-- 1) Ajustes (solo el administrador los ve; el cliente recibe el % y la condición a través de rs_validar)
create table if not exists public.rs_config (
  clave text primary key,
  valor text not null default ''
);
insert into public.rs_config(clave, valor) values
  ('descuento', '10'),
  ('prefijo', 'FARO'),
  ('condicion', 'Válido en tu próxima sesión con Faro Studios. Menciona tu código al reservar.')
on conflict (clave) do nothing;

-- 2) Enlaces privados (uno por cliente, de un solo uso)
create table if not exists public.rs_enlaces (
  id        uuid primary key default gen_random_uuid(),
  token     text not null unique default replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  etiqueta  text not null default '' check (char_length(etiqueta) <= 80),   -- para ti: "Mirna · graduación"
  usado     boolean not null default false,
  usado_en  timestamptz,
  creado    timestamptz not null default now()
);

-- 3) Reseñas recibidas
create table if not exists public.rs_resenas (
  id         uuid primary key default gen_random_uuid(),
  enlace_id  uuid references public.rs_enlaces(id) on delete set null,
  tipo       text not null check (tipo in ('individual', 'empresa')),
  empresa    text not null default '' check (char_length(empresa) <= 80),
  nombre     text not null check (char_length(nombre) between 1 and 80),
  servicio   text not null default '' check (char_length(servicio) <= 80),
  estrellas  int  not null check (estrellas between 1 and 5),
  texto      text not null default '' check (char_length(texto) <= 1500),
  original   jsonb not null default '{}'::jsonb,        -- lo que escribió el cliente, intacto, por si editas el texto
  estado     text not null default 'nueva' check (estado in ('nueva', 'revisada', 'archivada')),
  foto       text not null default '',                  -- foto que cargas tú (dirección pública)
  foto_pos   text not null default '50,35,1',           -- encuadre de la foto: x %, y %, acercamiento
  slot       int check (slot between 1 and 6),          -- espacio de "Lo dicen nuestros clientes" donde está publicada
  codigo     text unique,                               -- código de descuento que recibió
  canjeado   boolean not null default false,
  creado     timestamptz not null default now()
);
create index if not exists rs_resenas_creado on public.rs_resenas(creado desc);

-- 4) Seguridad: tablas cerradas; solo el administrador entra por la API normal
do $$
declare t text;
begin
  foreach t in array array['rs_config', 'rs_enlaces', 'rs_resenas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all using (public.es_admin()) with check (public.es_admin())', t || '_admin', t);
  end loop;
end $$;
grant select, insert, update, delete on public.rs_config, public.rs_enlaces, public.rs_resenas to authenticated;

-- 5) El cliente abre su enlace: ¿sirve todavía? Devuelve solo lo necesario para mostrar el regalo (nunca el código)
create or replace function public.rs_validar(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select case
    when exists (select 1 from public.rs_enlaces where token = p_token and not usado)
    then jsonb_build_object(
      'ok', true,
      'descuento', coalesce((select valor from public.rs_config where clave = 'descuento'), ''),
      'condicion', coalesce((select valor from public.rs_config where clave = 'condicion'), ''))
    else jsonb_build_object('ok', false)
  end
$$;
grant execute on function public.rs_validar(text) to anon, authenticated;

-- 6) El cliente envía su reseña. Consume el enlace y devuelve su código único. Todo o nada.
create or replace function public.rs_enviar(
  p_token text, p_tipo text, p_empresa text, p_nombre text, p_servicio text, p_estrellas int, p_texto text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e public.rs_enlaces;
  nom text := btrim(coalesce(p_nombre, ''));
  emp text := btrim(coalesce(p_empresa, ''));
  ser text := btrim(coalesce(p_servicio, ''));
  txt text := btrim(coalesce(p_texto, ''));
  pref text; pct text; cond text; cod text; n int := 0;
begin
  if p_tipo is null or p_tipo not in ('individual', 'empresa') then return jsonb_build_object('ok', false, 'error', 'datos'); end if;
  if char_length(nom) not between 1 and 80 then return jsonb_build_object('ok', false, 'error', 'nombre'); end if;
  if p_tipo = 'empresa' and char_length(emp) not between 1 and 80 then return jsonb_build_object('ok', false, 'error', 'empresa'); end if;
  if p_tipo = 'individual' then emp := ''; end if;
  if char_length(ser) > 80 then ser := left(ser, 80); end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'estrellas'); end if;
  if char_length(txt) not between 10 and 1500 then return jsonb_build_object('ok', false, 'error', 'texto'); end if;

  -- el enlace se gasta en esta misma instrucción: dos envíos a la vez no pueden pasar los dos
  update public.rs_enlaces set usado = true, usado_en = now() where token = p_token and not usado returning * into e;
  if not found then return jsonb_build_object('ok', false, 'error', 'enlace'); end if;

  select valor into pref from public.rs_config where clave = 'prefijo';
  select valor into pct  from public.rs_config where clave = 'descuento';
  select valor into cond from public.rs_config where clave = 'condicion';
  pref := coalesce(nullif(regexp_replace(upper(coalesce(pref, '')), '[^A-Z0-9]', '', 'g'), ''), 'FARO');
  loop
    cod := left(pref, 10) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text || e.id::text), 1, 6));
    exit when not exists (select 1 from public.rs_resenas where codigo = cod);
    n := n + 1;
    if n > 20 then raise exception 'codigo'; end if;
  end loop;

  insert into public.rs_resenas(enlace_id, tipo, empresa, nombre, servicio, estrellas, texto, original, codigo)
  values (e.id, p_tipo, emp, nom, ser, p_estrellas, txt,
          jsonb_build_object('tipo', p_tipo, 'empresa', emp, 'nombre', nom, 'servicio', ser, 'estrellas', p_estrellas, 'texto', txt), cod);

  return jsonb_build_object('ok', true, 'codigo', cod, 'descuento', coalesce(pct, ''), 'condicion', coalesce(cond, ''));
end $$;
grant execute on function public.rs_enviar(text, text, text, text, text, int, text) to anon, authenticated;

-- 7) Aviso al teléfono cuando llega una reseña (solo si ya corriste sql/notificaciones.sql)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'push_avisar' and pronamespace = 'public'::regnamespace) then
    execute 'drop trigger if exists push_rs_resena on public.rs_resenas';
    execute 'create trigger push_rs_resena after insert on public.rs_resenas for each row execute function public.push_avisar(''resena'')';
  end if;
end $$;

notify pgrst, 'reload schema';
