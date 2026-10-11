-- Cotizaciones (formulario "Cotizar" de la web) — pegar en Supabase > SQL Editor > New query > Run
-- Solo el administrador puede leer o cambiar la tabla. El formulario público escribe a través de la función.

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  categoria text not null,
  nombre text not null,
  whatsapp text not null,
  correo text not null,
  organizacion text,
  ciudad text,
  fecha_tentativa date,
  descripcion text,
  fuente text,
  estado text not null default 'nueva' check (estado in ('nueva','contactada','cotizada','ganada','perdida')),
  creado timestamptz not null default now()
);
create index if not exists cotizaciones_creado_idx on public.cotizaciones (creado desc);
alter table public.cotizaciones enable row level security;
revoke all on public.cotizaciones from anon;
drop policy if exists "admin cotizaciones" on public.cotizaciones;
create policy "admin cotizaciones" on public.cotizaciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Función del formulario público: valida los datos y limita el spam (3 por correo por hora).
create or replace function public.crear_cotizacion(
  p_ref text, p_categoria text, p_nombre text, p_whatsapp text, p_correo text,
  p_organizacion text, p_ciudad text, p_fecha date, p_descripcion text, p_fuente text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_wa text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  if coalesce(trim(p_nombre), '') = '' or length(p_nombre) > 120
     or coalesce(trim(p_categoria), '') = '' or length(p_categoria) > 120
     or length(v_wa) < 8 or length(v_wa) > 15 or length(p_whatsapp) > 40
     or coalesce(p_correo, '') !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(p_correo) > 160
     or coalesce(length(p_organizacion), 0) > 160 or coalesce(length(p_ciudad), 0) > 120
     or coalesce(length(p_descripcion), 0) > 2000 or coalesce(length(p_fuente), 0) > 80
     or coalesce(p_ref, '') !~ '^COT-[A-Z0-9]{6}$'
     or (p_fecha is not null and p_fecha < (now() at time zone 'America/Guatemala')::date)
  then
    raise exception 'datos';
  end if;
  if (select count(*) from public.cotizaciones
       where lower(correo) = lower(p_correo) and creado > now() - interval '1 hour') >= 3 then
    raise exception 'limite';
  end if;
  insert into public.cotizaciones (ref, categoria, nombre, whatsapp, correo, organizacion, ciudad, fecha_tentativa, descripcion, fuente)
  values (p_ref, trim(p_categoria), trim(p_nombre), trim(p_whatsapp), trim(p_correo),
          nullif(trim(p_organizacion), ''), nullif(trim(p_ciudad), ''), p_fecha, nullif(trim(p_descripcion), ''), nullif(trim(p_fuente), ''));
  return p_ref;
end
$$;
revoke all on function public.crear_cotizacion(text, text, text, text, text, text, text, date, text, text) from public;
grant execute on function public.crear_cotizacion(text, text, text, text, text, text, text, date, text, text) to anon, authenticated;
