-- Documentos del Workspace (cotización, confirmación de servicio, recibo de pago) + catálogo de precios.
-- Pegar en Supabase > SQL Editor > New query > Run.  Se puede correr más de una vez sin problema.
--
-- SEGURIDAD
--  · Solo el director puede leer o cambiar estas tablas (public.es_admin(): correo del director y,
--    si corriste mfa-obligatorio.sql, también el código del teléfono). El rol "anon" (visitantes de la
--    página) no tiene ningún permiso, ni siquiera de lectura.
--  · Los documentos emitidos NO se pueden borrar desde la aplicación: solo se anulan. Así el correlativo
--    nunca queda con huecos ni documentos que desaparecen.
--  · El número correlativo lo entrega la base (función doc_siguiente_numero), no el navegador: dos
--    pestañas abiertas nunca reciben el mismo número.
--  · Supabase cifra todo el disco y las copias de seguridad (AES-256) y toda la comunicación (TLS).

-- ───────── Catálogo de precios ─────────
create table if not exists public.doc_servicios (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (length(categoria) between 1 and 80),
  nombre text not null check (length(nombre) between 1 and 160),
  descripcion text not null default '' check (length(descripcion) <= 600),
  precio numeric(12,2) not null check (precio >= 0),
  moneda text not null default 'GTQ' check (moneda in ('GTQ','USD')),
  activo boolean not null default true,
  orden int not null default 0,
  creado timestamptz not null default now()
);
create index if not exists doc_servicios_cat_idx on public.doc_servicios (categoria, orden, nombre);

-- ───────── Documentos emitidos ─────────
create table if not exists public.doc_documentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('cotizacion','confirmacion','recibo')),
  serie int not null,
  numero text not null,
  cliente text not null default '' check (length(cliente) <= 160),
  moneda text not null default 'GTQ' check (moneda in ('GTQ','USD')),
  total numeric(12,2) not null default 0,
  estado text not null default 'emitido' check (estado in ('emitido','anulado')),
  datos jsonb not null default '{}'::jsonb,          -- todo el formulario (cliente, líneas, condiciones…)
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (tipo, serie),
  unique (tipo, numero)
);
create index if not exists doc_documentos_creado_idx on public.doc_documentos (creado desc);

-- ───────── Correlativos ─────────
-- "ultimo" es el último número ya usado. Los iniciales continúan tus documentos actuales:
-- cotización FA208, confirmación FS-0108, recibo RC00172. Para cambiarlos:
--   update public.doc_contadores set ultimo = 250 where tipo = 'cotizacion';
create table if not exists public.doc_contadores (
  tipo text primary key check (tipo in ('cotizacion','confirmacion','recibo')),
  ultimo int not null default 0
);
insert into public.doc_contadores (tipo, ultimo) values ('cotizacion', 208), ('confirmacion', 108), ('recibo', 172)
  on conflict (tipo) do nothing;

create or replace function public.doc_siguiente_numero(p_tipo text)
returns table (serie int, numero text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_anio text := to_char(now() at time zone 'America/Guatemala', 'YYYY');
begin
  if not public.es_admin() then raise exception 'sin permiso'; end if;
  update public.doc_contadores set ultimo = ultimo + 1 where tipo = p_tipo returning ultimo into v_n;
  if v_n is null then raise exception 'tipo'; end if;
  serie := v_n;
  numero := case p_tipo
    when 'cotizacion'   then 'FA' || v_n || ' - ' || v_anio
    when 'confirmacion' then 'FS - ' || lpad(v_n::text, 4, '0')
    else                     'RC' || lpad(v_n::text, 5, '0') || ' - ' || v_anio
  end;
  return next;
end
$$;
revoke all on function public.doc_siguiente_numero(text) from public, anon;
grant execute on function public.doc_siguiente_numero(text) to authenticated;

-- ───────── Permisos (RLS) ─────────
alter table public.doc_servicios  enable row level security;
alter table public.doc_documentos enable row level security;
alter table public.doc_contadores enable row level security;
-- Permisos exactos (en este proyecto las tablas nuevas no traen permisos por defecto para "authenticated"):
-- primero se quita todo y luego se da solo lo necesario; la política de abajo (RLS) deja pasar únicamente al director.
revoke all on public.doc_servicios, public.doc_documentos, public.doc_contadores from authenticated, anon;
grant select, insert, update, delete on public.doc_servicios to authenticated;
grant select, insert, update on public.doc_documentos to authenticated;   -- sin borrar: se anula
grant select on public.doc_contadores to authenticated;

drop policy if exists "admin doc_servicios" on public.doc_servicios;
create policy "admin doc_servicios" on public.doc_servicios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin doc_documentos leer" on public.doc_documentos;
drop policy if exists "admin doc_documentos crear" on public.doc_documentos;
drop policy if exists "admin doc_documentos editar" on public.doc_documentos;
create policy "admin doc_documentos leer"   on public.doc_documentos for select to authenticated using (public.es_admin());
create policy "admin doc_documentos crear"  on public.doc_documentos for insert to authenticated with check (public.es_admin());
create policy "admin doc_documentos editar" on public.doc_documentos for update to authenticated using (public.es_admin()) with check (public.es_admin());
-- (sin política de borrado: los documentos no se borran, se anulan)

drop policy if exists "admin doc_contadores" on public.doc_contadores;
create policy "admin doc_contadores" on public.doc_contadores for select to authenticated using (public.es_admin());

create or replace function public.doc_tocar()
returns trigger language plpgsql as $$ begin new.actualizado := now(); return new; end $$;
drop trigger if exists doc_documentos_tocar on public.doc_documentos;
create trigger doc_documentos_tocar before update on public.doc_documentos for each row execute function public.doc_tocar();

-- ───────── Precios iniciales (tu guía "Sesiones y Eventos Sociales"; edítalos desde el Workspace) ─────────
insert into public.doc_servicios (categoria, nombre, descripcion, precio, orden)
select v.categoria, v.nombre, v.descripcion, v.precio, v.orden
from (values
  ('Sesiones y eventos sociales', 'Overture',  'Sesión Overture — 10 fotografías digitales.', 1750, 1),
  ('Sesiones y eventos sociales', 'Prelude',   'Sesión Prelude — 25 fotografías de alta resolución, galería privada.', 2650, 2),
  ('Sesiones y eventos sociales', 'Adagio',    'Cobertura Adagio — más de 50 fotografías, galería privada, impresiones y álbum físico.', 4850, 3),
  ('Sesiones y eventos sociales', 'Symphony (desde)', 'Cobertura Symphony — bodas y celebraciones grandes, a la medida.', 8350, 4),
  ('Academia', 'Guitarra eléctrica · ciclo mensual', 'Paquete mensual de 4 clases presenciales de 1 hora con 15 minutos.', 1000, 1)
) as v(categoria, nombre, descripcion, precio, orden)
where not exists (select 1 from public.doc_servicios);

notify pgrst, 'reload schema';
