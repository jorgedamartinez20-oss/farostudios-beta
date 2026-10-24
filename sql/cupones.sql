-- CUPONES + COMENTARIOS · todos los códigos de descuento de Faro en un solo lugar, y la página farostudios.net/comentario
-- Pega todo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- Requiere haber corrido antes: sql/entregas.sql (es_admin), sql/resenas-publicas.sql y sql/entregas-galeria-v2.sql.
--
-- Qué hace:
--  · Una tabla «cupones» con TODOS los códigos: los de comentarios, los de las galerías de Entregas y los que crees a mano
--    (por ejemplo una campaña de redes con 5 descuentos).
--  · Cada código tiene: a quién se le dio, de dónde salió, % de descuento, cuántas veces se puede usar y hasta qué día vale.
--  · Vigencia: 5 meses desde que se entrega (se puede cambiar en Workspace → Cupones).
--  · Código personal = 2 usos: uno para el cliente y otro para un amigo. Tú marcas cada uno por separado.
--  · Solo tú (administrador) puedes canjear, invalidar o cambiar un código. Nadie puede inventar uno: si no está en la tabla, no existe.
--  · Canjear es atómico: dos canjes al mismo tiempo no pueden gastar el mismo uso.
--  · La página de comentarios usa UN SOLO enlace para todos: la persona escribe su nombre y la base le genera su código único.
--    Las empresas dejan su comentario pero no reciben código (no hay descuento para empresas).
--  · «¿Qué podríamos mejorar?» queda privado: solo tú lo ves en el Workspace.
--  · La página de cotizar puede preguntar «¿este código sirve?» (cp_consultar) y la cotización guarda el código para que lo veas.
--  · Importa los códigos que ya existen (el de Mirna, el de Aliss…) para que queden vinculados.
--  · Los comentarios guardan categoría (Boda, Producción musical, Podcast…), subtipo (Banda, Iglesia…) y país (empresas).
--  · La web no tiene límite de espacios de comentarios: cada uno es de Personas o de Empresas (se decide en el Workspace).

-- 0) Vigencia por defecto (meses) y texto que ve el cliente
insert into public.rs_config(clave, valor) values ('vigencia_meses', '5') on conflict (clave) do nothing;
update public.rs_config
   set valor = 'Válido por 5 meses. Sirve una vez para ti y una vez para un amigo. Menciona tu código al reservar.'
 where clave = 'condicion' and valor in (
   'Válido en tu próxima sesión con Faro Studios. Menciona tu código al reservar.',
   'Válido por 5 meses desde hoy, para tu próxima sesión con Faro Studios. Menciona tu código al reservar.');

-- 1) Tablas
create table if not exists public.cupones (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null check (char_length(codigo) between 3 and 30),
  clave         text generated always as (upper(regexp_replace(codigo, '[^A-Za-z0-9]', '', 'g'))) stored,
  tipo          text not null default 'personal' check (tipo in ('personal', 'campana')),   -- personal = para una persona (y un amigo) · campana = para muchos (redes, evento…)
  origen        text not null default 'manual'   check (origen in ('resena', 'galeria', 'manual')),
  nombre        text not null default '' check (char_length(nombre) <= 120),                -- a quién se le dio, o nombre de la campaña
  nota          text not null default '' check (char_length(nota) <= 300),
  porcentaje    numeric(5,2) not null check (porcentaje > 0 and porcentaje <= 90),
  usos_max      int  not null default 1 check (usos_max between 1 and 10000),
  usos          int  not null default 0 check (usos >= 0),
  amigo         boolean not null default false,                                             -- true = 2 usos: uno para el cliente y otro para un amigo
  vence         date not null,                                                              -- último día en que vale (incluido)
  estado        text not null default 'activo' check (estado in ('activo', 'invalidado')),
  publicado     boolean not null default false,                                             -- ya lo viste en redes / ya se lo compartiste a alguien
  resena_id     uuid references public.rs_resenas(id) on delete set null,
  proyecto_id   uuid,                                                                       -- galería de Entregas de donde salió
  creado        timestamptz not null default now(),
  invalidado_en timestamptz
);
alter table public.cupones add column if not exists amigo boolean not null default false;
create unique index if not exists cupones_clave_uq on public.cupones(clave);
create index if not exists cupones_creado on public.cupones(creado desc);

create table if not exists public.cupon_usos (
  id         uuid primary key default gen_random_uuid(),
  cupon_id   uuid not null references public.cupones(id) on delete cascade,
  usado_en   timestamptz not null default now(),
  quien      text check (quien in ('cliente', 'amigo')),                                    -- solo en códigos con amigo
  nota       text not null default '' check (char_length(nota) <= 200),
  cotizacion text                                                                           -- referencia COT-XXXXXX si se usó en una cotización
);
alter table public.cupon_usos add column if not exists quien text check (quien in ('cliente', 'amigo'));
create index if not exists cupon_usos_cupon on public.cupon_usos(cupon_id, usado_en desc);
create unique index if not exists cupon_usos_quien_uq on public.cupon_usos(cupon_id, quien) where quien is not null;

-- 1b) Comentarios: «qué podríamos mejorar» (privado), categoría, subtipo, país, y espacios de la web sin límite
alter table public.rs_resenas add column if not exists mejora text not null default '' check (char_length(mejora) <= 1000);
alter table public.rs_resenas add column if not exists categoria text not null default '' check (char_length(categoria) <= 400);
alter table public.rs_resenas add column if not exists cargo text not null default '' check (char_length(cargo) <= 80);
alter table public.rs_resenas drop constraint if exists rs_resenas_servicio_check;
alter table public.rs_resenas add constraint rs_resenas_servicio_check check (char_length(servicio) <= 400);
alter table public.rs_resenas add column if not exists subtipo text not null default '' check (char_length(subtipo) <= 60);
alter table public.rs_resenas add column if not exists pais text not null default '' check (char_length(pais) <= 60);
alter table public.rs_resenas drop constraint if exists rs_resenas_slot_check;
alter table public.rs_resenas add constraint rs_resenas_slot_check check (slot >= 1);

-- 2) La cotización guarda el código que escribió la persona (solo si era válido en ese momento)
alter table public.cotizaciones add column if not exists cupon text;
alter table public.cotizaciones add column if not exists cupon_pct numeric(5,2);

-- 3) Seguridad: tablas cerradas, solo administrador
do $$
declare t text;
begin
  foreach t in array array['cupones', 'cupon_usos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all using (public.es_admin()) with check (public.es_admin())', t || '_admin', t);
  end loop;
end $$;
grant select, insert, update, delete on public.cupones, public.cupon_usos to authenticated;

-- 4) Utilidades
create or replace function public.cp_hoy() returns date language sql stable as $$ select (now() at time zone 'America/Guatemala')::date $$;

-- Código nuevo, fácil de dictar: PREFIJO-XXXXXX (sin 0/O/1/I para no confundir). Garantiza que no exista.
create or replace function public.cp_codigo_nuevo(p_prefijo text default 'FARO') returns text
language plpgsql volatile set search_path = public as $$
declare
  alfa constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  pref text := coalesce(nullif(regexp_replace(upper(coalesce(p_prefijo, '')), '[^A-Z0-9]', '', 'g'), ''), 'FARO');
  cod text; b bytea; i int; n int := 0;
begin
  pref := left(pref, 10);
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    cod := '';
    for i in 0..5 loop cod := cod || substr(alfa, (get_byte(b, i) % 32) + 1, 1); end loop;
    cod := pref || '-' || cod;
    exit when not exists (select 1 from public.cupones where clave = upper(regexp_replace(cod, '[^A-Za-z0-9]', '', 'g')));
    n := n + 1; if n > 30 then raise exception 'codigo'; end if;
  end loop;
  return cod;
end $$;
grant execute on function public.cp_codigo_nuevo(text) to authenticated;
revoke execute on function public.cp_codigo_nuevo(text) from anon, public;

-- 5) Crear un cupón a mano (personal o campaña). Si no das código, se genera uno.
drop function if exists public.cp_crear(text, text, text, numeric, int, date, text, boolean);
create or replace function public.cp_crear(
  p_tipo text, p_nombre text, p_codigo text, p_porcentaje numeric, p_usos_max int, p_vence date,
  p_nota text default '', p_publicado boolean default false, p_amigo boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cod text := btrim(coalesce(p_codigo, '')); c public.cupones; am boolean := coalesce(p_amigo, false) and p_tipo = 'personal';
begin
  if not public.es_admin() then raise exception 'permiso'; end if;
  if p_tipo not in ('personal', 'campana') then return jsonb_build_object('ok', false, 'error', 'tipo'); end if;
  if p_porcentaje is null or p_porcentaje <= 0 or p_porcentaje > 90 then return jsonb_build_object('ok', false, 'error', 'porcentaje'); end if;
  if p_vence is null or p_vence < public.cp_hoy() then return jsonb_build_object('ok', false, 'error', 'vence'); end if;
  if p_usos_max is null or p_usos_max < 1 or p_usos_max > 10000 then return jsonb_build_object('ok', false, 'error', 'usos'); end if;
  if cod = '' then cod := public.cp_codigo_nuevo('FARO');
  else
    cod := upper(regexp_replace(cod, '[^A-Za-z0-9\-]', '', 'g'));
    if char_length(regexp_replace(cod, '[^A-Z0-9]', '', 'g')) < 3 then return jsonb_build_object('ok', false, 'error', 'codigo'); end if;
    if exists (select 1 from public.cupones where clave = upper(regexp_replace(cod, '[^A-Za-z0-9]', '', 'g'))) then return jsonb_build_object('ok', false, 'error', 'repetido'); end if;
  end if;
  insert into public.cupones(codigo, tipo, origen, nombre, nota, porcentaje, usos_max, amigo, vence, publicado)
  values (cod, p_tipo, 'manual', left(btrim(coalesce(p_nombre, '')), 120), left(btrim(coalesce(p_nota, '')), 300), p_porcentaje,
          case when am then 2 when p_tipo = 'personal' then 1 else p_usos_max end, am, p_vence, coalesce(p_publicado, false))
  returning * into c;
  return jsonb_build_object('ok', true, 'id', c.id, 'codigo', c.codigo);
end $$;
grant execute on function public.cp_crear(text, text, text, numeric, int, date, text, boolean, boolean) to authenticated;
revoke execute on function public.cp_crear(text, text, text, numeric, int, date, text, boolean, boolean) from anon, public;

-- 6) Canjear un uso (cuando el cliente te dice el código y lo aplicas). Atómico.
--    En códigos con amigo hay que decir para quién: 'cliente' o 'amigo' (cada uno solo una vez).
drop function if exists public.cp_canjear(uuid, text, text);
create or replace function public.cp_canjear(p_id uuid, p_nota text default '', p_cotizacion text default null, p_quien text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.cupones; q text := nullif(btrim(coalesce(p_quien, '')), '');
begin
  if not public.es_admin() then raise exception 'permiso'; end if;
  select * into c from public.cupones where id = p_id for update;      -- bloquea la fila: nadie más puede canjear al mismo tiempo
  if not found then return jsonb_build_object('ok', false, 'error', 'no existe'); end if;
  if c.estado <> 'activo' then return jsonb_build_object('ok', false, 'error', 'invalidado'); end if;
  if c.vence < public.cp_hoy() then return jsonb_build_object('ok', false, 'error', 'vencido'); end if;
  if c.usos >= c.usos_max then return jsonb_build_object('ok', false, 'error', 'agotado'); end if;
  if c.amigo then
    if q is null or q not in ('cliente', 'amigo') then return jsonb_build_object('ok', false, 'error', 'quien'); end if;
    if exists (select 1 from public.cupon_usos where cupon_id = c.id and quien = q) then return jsonb_build_object('ok', false, 'error', 'ya ' || q); end if;
  else
    q := null;
  end if;
  update public.cupones set usos = usos + 1 where id = c.id returning * into c;
  insert into public.cupon_usos(cupon_id, quien, nota, cotizacion) values (c.id, q, left(coalesce(p_nota, ''), 200), nullif(p_cotizacion, ''));
  return jsonb_build_object('ok', true, 'usos', c.usos, 'usos_max', c.usos_max);
end $$;
grant execute on function public.cp_canjear(uuid, text, text, text) to authenticated;
revoke execute on function public.cp_canjear(uuid, text, text, text) from anon, public;

-- 7) Deshacer un canje (por si lo marcaste por error). Sin decir cuál, deshace el último.
drop function if exists public.cp_deshacer(uuid);
create or replace function public.cp_deshacer(p_id uuid, p_quien text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; c public.cupones; q text := nullif(btrim(coalesce(p_quien, '')), '');
begin
  if not public.es_admin() then raise exception 'permiso'; end if;
  perform 1 from public.cupones where id = p_id for update;
  if q is not null then select id into u from public.cupon_usos where cupon_id = p_id and quien = q;
  else select id into u from public.cupon_usos where cupon_id = p_id order by usado_en desc limit 1; end if;
  if u is null then return jsonb_build_object('ok', false, 'error', 'sin usos'); end if;
  delete from public.cupon_usos where id = u;
  update public.cupones set usos = greatest(0, usos - 1) where id = p_id returning * into c;
  return jsonb_build_object('ok', true, 'usos', c.usos, 'usos_max', c.usos_max);
end $$;
grant execute on function public.cp_deshacer(uuid, text) to authenticated;
revoke execute on function public.cp_deshacer(uuid, text) from anon, public;

-- 8) Consulta pública: ¿este código sirve ahora? Solo dice sí/no, el % y hasta cuándo. Nunca a quién pertenece.
create or replace function public.cp_consultar(p_codigo text) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select jsonb_build_object('ok', true, 'porcentaje', c.porcentaje, 'vence', c.vence)
       from public.cupones c
      where c.clave = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
        and c.estado = 'activo' and c.usos < c.usos_max and c.vence >= public.cp_hoy()),
    jsonb_build_object('ok', false))
$$;
grant execute on function public.cp_consultar(text) to anon, authenticated;

-- 9) Comentarios con UN SOLO enlace para todos
--    Ya no hay enlaces por persona: se quitan las funciones anteriores.
drop function if exists public.rs_validar(text);
drop function if exists public.rs_enviar(text, text, text, text, text, int, text);

-- Lo que la página necesita para mostrar el regalo (solo a personas, nunca a empresas)
create or replace function public.rs_info() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'descuento', coalesce((select valor from public.rs_config where clave = 'descuento'), ''),
    'condicion', coalesce((select valor from public.rs_config where clave = 'condicion'), ''),
    'meses', coalesce((select valor from public.rs_config where clave = 'vigencia_meses'), '5'))
$$;
grant execute on function public.rs_info() to anon, authenticated;

-- La persona escribe su comentario. Si es individual, la base le genera su código único (2 usos: cliente y amigo) y lo guarda
-- en Cupones. Si es empresa, solo se guarda el comentario. Todo o nada.
drop function if exists public.rs_enviar_publico(text, text, text, text, int, text, text);
drop function if exists public.rs_enviar_publico(text, text, text, text, int, text, text, text, text, text);
create or replace function public.rs_enviar_publico(
  p_tipo text, p_empresa text, p_nombre text, p_servicio text, p_estrellas int, p_texto text, p_mejora text default '',
  p_categoria text default '', p_subtipo text default '', p_pais text default '', p_cargo text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  nom text := btrim(coalesce(p_nombre, ''));
  emp text := btrim(coalesce(p_empresa, ''));
  ser text := btrim(coalesce(p_servicio, ''));
  txt text := btrim(coalesce(p_texto, ''));
  mej text := left(btrim(coalesce(p_mejora, '')), 1000);
  cat text := left(btrim(coalesce(p_categoria, '')), 400);
  car text := case when p_tipo = 'empresa' then left(btrim(coalesce(p_cargo, '')), 80) else '' end;
  sub text := left(btrim(coalesce(p_subtipo, '')), 60);
  pai text := case when p_tipo = 'empresa' then left(btrim(coalesce(p_pais, '')), 60) else '' end;
  pref text; pct text; cond text; mes text; cod text := null; pn numeric; mm int; vence date;
begin
  if p_tipo is null or p_tipo not in ('individual', 'empresa') then return jsonb_build_object('ok', false, 'error', 'datos'); end if;
  if char_length(nom) not between 1 and 80 then return jsonb_build_object('ok', false, 'error', 'nombre'); end if;
  if p_tipo = 'empresa' and char_length(emp) not between 1 and 80 then return jsonb_build_object('ok', false, 'error', 'empresa'); end if;
  if p_tipo = 'individual' then emp := ''; end if;
  if char_length(ser) > 400 then ser := left(ser, 400); end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'estrellas'); end if;
  if char_length(txt) not between 10 and 1500 then return jsonb_build_object('ok', false, 'error', 'texto'); end if;

  -- freno contra abuso: si llegan demasiados en poco tiempo, se pide intentar más tarde; y no se repite el mismo comentario
  if (select count(*) from public.rs_resenas where creado > now() - interval '10 minutes') >= 15 then return jsonb_build_object('ok', false, 'error', 'limite'); end if;
  if exists (select 1 from public.rs_resenas where lower(nombre) = lower(nom) and texto = txt and creado > now() - interval '1 day') then
    return jsonb_build_object('ok', false, 'error', 'repetido');
  end if;

  select valor into pref from public.rs_config where clave = 'prefijo';
  select valor into pct  from public.rs_config where clave = 'descuento';
  select valor into cond from public.rs_config where clave = 'condicion';
  select valor into mes  from public.rs_config where clave = 'vigencia_meses';
  pn := coalesce(nullif(regexp_replace(coalesce(pct, ''), '[^0-9.]', '', 'g'), '')::numeric, 0);
  mm := greatest(1, least(36, coalesce(nullif(regexp_replace(coalesce(mes, ''), '[^0-9]', '', 'g'), '')::int, 5)));
  vence := (public.cp_hoy() + make_interval(months => mm))::date;

  if p_tipo = 'individual' and pn > 0 then cod := public.cp_codigo_nuevo(pref); end if;

  insert into public.rs_resenas(tipo, empresa, nombre, cargo, servicio, categoria, subtipo, pais, estrellas, texto, mejora, original, codigo)
  values (p_tipo, emp, nom, car, ser, cat, sub, pai, p_estrellas, txt, mej,
          jsonb_build_object('tipo', p_tipo, 'empresa', emp, 'nombre', nom, 'servicio', ser, 'cargo', car, 'categoria', cat, 'subtipo', sub, 'pais', pai, 'estrellas', p_estrellas, 'texto', txt, 'mejora', mej), cod)
  returning id into rid;

  if cod is not null then
    insert into public.cupones(codigo, tipo, origen, nombre, porcentaje, usos_max, amigo, vence, publicado, resena_id)
    values (cod, 'personal', 'resena', nom, least(90, pn), 2, true, vence, true, rid);
  end if;

  return jsonb_build_object('ok', true, 'codigo', coalesce(cod, ''), 'descuento', case when cod is null then '' else coalesce(pct, '') end,
                            'condicion', case when cod is null then '' else coalesce(cond, '') end,
                            'vence', case when cod is null then null else vence end, 'meses', mm);
end $$;
grant execute on function public.rs_enviar_publico(text, text, text, text, int, text, text, text, text, text, text) to anon, authenticated;

-- 10) Galerías de Entregas: el código que pones en el diseño de la galería queda registrado aquí automáticamente (2 usos: cliente y amigo)
create or replace function public.cp_sync_galeria() returns trigger
language plpgsql security definer set search_path = public as $$
declare cod text; pn numeric; nom text;
begin
  begin
    cod := btrim(coalesce(new.config ->> 'codigo', ''));
    pn  := nullif(regexp_replace(coalesce(new.config ->> 'descuento', ''), '[^0-9.]', '', 'g'), '')::numeric;
    if cod = '' or pn is null or pn <= 0 then return new; end if;
    select nombre into nom from public.en_cuentas where user_id = new.cuenta_id limit 1;
    insert into public.cupones(codigo, tipo, origen, nombre, porcentaje, usos_max, amigo, vence, publicado, proyecto_id)
    values (cod, 'personal', 'galeria', btrim(coalesce(nom, '') || ' · ' || coalesce(new.titulo, ''), ' ·'), least(90, pn), 2, true,
            (public.cp_hoy() + interval '5 months')::date, true, new.id)
    on conflict (clave) do update
       set porcentaje = case when public.cupones.usos = 0 then excluded.porcentaje else public.cupones.porcentaje end
     where public.cupones.proyecto_id = new.id;
  exception when others then
    null;   -- si algo falla, nunca se bloquea el guardado de la galería
  end;
  return new;
end $$;
do $$
begin
  if to_regclass('public.en_proyectos') is not null then
    execute 'drop trigger if exists cp_sync_galeria on public.en_proyectos';
    execute 'create trigger cp_sync_galeria after insert or update of config on public.en_proyectos for each row execute function public.cp_sync_galeria()';
  end if;
end $$;

-- 11) Cotizaciones: ahora aceptan un código de descuento (opcional). Si no sirve, la cotización se guarda igual, sin descuento.
drop function if exists public.crear_cotizacion(text, text, text, text, text, text, text, date, text, text);
create or replace function public.crear_cotizacion(
  p_ref text, p_categoria text, p_nombre text, p_whatsapp text, p_correo text, p_organizacion text, p_ciudad text,
  p_fecha date, p_descripcion text, p_fuente text, p_cupon text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v_wa text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'); cp public.cupones;
begin
  if coalesce(trim(p_nombre), '') = '' or length(p_nombre) > 120
     or coalesce(trim(p_categoria), '') = '' or length(p_categoria) > 120
     or length(v_wa) < 8 or length(v_wa) > 15 or length(p_whatsapp) > 40
     or coalesce(p_correo, '') !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(p_correo) > 160
     or coalesce(length(p_organizacion), 0) > 160 or coalesce(length(p_ciudad), 0) > 120
     or coalesce(length(p_descripcion), 0) > 2000 or coalesce(length(p_fuente), 0) > 80
     or coalesce(length(p_cupon), 0) > 40
     or coalesce(p_ref, '') !~ '^COT-[A-Z0-9]{6}$'
     or (p_fecha is not null and p_fecha < (now() at time zone 'America/Guatemala')::date)
  then
    raise exception 'datos';
  end if;
  if (select count(*) from public.cotizaciones
       where lower(correo) = lower(p_correo) and creado > now() - interval '1 hour') >= 3 then
    raise exception 'limite';
  end if;
  if coalesce(btrim(p_cupon), '') <> '' then
    select * into cp from public.cupones
     where clave = upper(regexp_replace(p_cupon, '[^A-Za-z0-9]', '', 'g'))
       and estado = 'activo' and usos < usos_max and vence >= public.cp_hoy();
  end if;
  insert into public.cotizaciones (ref, categoria, nombre, whatsapp, correo, organizacion, ciudad, fecha_tentativa, descripcion, fuente, cupon, cupon_pct)
  values (p_ref, trim(p_categoria), trim(p_nombre), trim(p_whatsapp), trim(p_correo),
          nullif(trim(p_organizacion), ''), nullif(trim(p_ciudad), ''), p_fecha, nullif(trim(p_descripcion), ''), nullif(trim(p_fuente), ''),
          cp.codigo, cp.porcentaje);
  return p_ref;
end $$;
grant execute on function public.crear_cotizacion(text, text, text, text, text, text, text, date, text, text, text) to anon, authenticated;

-- 12) Importar lo que ya existe, para que quede vinculado (no duplica nada si lo corres otra vez)
-- 12a) Códigos de las galerías de Entregas (ej. el de Mirna y el de Aliss): 5 meses desde que se creó la galería, 2 usos (cliente y amigo)
insert into public.cupones(codigo, tipo, origen, nombre, porcentaje, usos_max, amigo, vence, publicado, proyecto_id, creado)
select upper(regexp_replace(p.config ->> 'codigo', '[^A-Za-z0-9]', '', 'g')), 'personal', 'galeria',
       btrim(coalesce(c.nombre, '') || ' · ' || coalesce(p.titulo, ''), ' ·'),
       least(90, (regexp_replace(p.config ->> 'descuento', '[^0-9.]', '', 'g'))::numeric), 2, true,
       ((p.creado at time zone 'America/Guatemala')::date + interval '5 months')::date, true, p.id, p.creado
  from public.en_proyectos p
  left join public.en_cuentas c on c.user_id = p.cuenta_id
 where coalesce(btrim(p.config ->> 'codigo'), '') <> ''
   and nullif(regexp_replace(coalesce(p.config ->> 'descuento', ''), '[^0-9.]', '', 'g'), '')::numeric > 0
on conflict (clave) do nothing;
-- si ya estaban importados con un solo uso y nadie los ha usado, pasan a 2 (cliente y amigo)
update public.cupones set usos_max = 2, amigo = true where origen = 'galeria' and usos = 0 and not amigo;

-- 12b) Códigos de comentarios que ya se hubieran enviado antes de este cambio
insert into public.cupones(codigo, tipo, origen, nombre, porcentaje, usos_max, amigo, usos, vence, publicado, resena_id, creado)
select r.codigo, 'personal', 'resena', r.nombre,
       least(90, greatest(1, coalesce(nullif(regexp_replace(coalesce((select valor from public.rs_config where clave = 'descuento'), ''), '[^0-9.]', '', 'g'), '')::numeric, 10))),
       2, true, 0, ((r.creado at time zone 'America/Guatemala')::date + interval '5 months')::date, true, r.id, r.creado
  from public.rs_resenas r
 where r.codigo is not null and r.tipo = 'individual'
on conflict (clave) do nothing;

notify pgrst, 'reload schema';
