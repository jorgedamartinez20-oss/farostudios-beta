-- ENTREGAS + CLIENTES · Faro Studios
-- Pega todo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- 1) Une cada acceso de Entregas con su ficha en Clientes (para no llenar los datos dos veces).
-- 2) Cada cotización nueva de la web crea sola su ficha en Clientes (si esa persona no existe ya).

alter table public.en_cuentas add column if not exists cliente_id uuid references public.cl_clientes(id) on delete set null;
create unique index if not exists en_cuentas_cliente_uq on public.en_cuentas(cliente_id) where cliente_id is not null;

create or replace function public.cotizacion_a_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare wa text := regexp_replace(coalesce(new.whatsapp,''), '\D', '', 'g');
begin
  if exists (select 1 from public.cl_clientes c
             where lower(trim(coalesce(c.correo,''))) = lower(trim(new.correo))
                or (length(wa) >= 8 and right(regexp_replace(coalesce(c.whatsapp,''), '\D', '', 'g'), 8) = right(wa, 8))) then
    return new;
  end if;
  insert into public.cl_clientes (nombre, correo, whatsapp, tipo, proyecto, fecha, activo)
  values (coalesce(nullif(trim(new.organizacion),''), new.nombre), lower(trim(new.correo)), new.whatsapp,
          new.categoria, new.categoria || ' · cotización ' || new.ref, new.fecha_tentativa, true);
  return new;
exception when others then
  return new;   -- si algo falla, la cotización igual se guarda
end $$;

drop trigger if exists cotizacion_a_cliente on public.cotizaciones;
create trigger cotizacion_a_cliente after insert on public.cotizaciones
  for each row execute function public.cotizacion_a_cliente();
