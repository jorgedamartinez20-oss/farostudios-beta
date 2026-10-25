-- MUSIC PRO · corte de caja del trabajo de fin de semana (Workspace → Music Pro)
-- Pega todo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- Solo el director (reservas@farostudios.net) puede ver y editar estas tablas.
--  · mp_cortes   : un renglón por día de venta (saldo inicial, conteo de billetes, notas)
--  · mp_facturas : cada factura (recibo, nombre, monto, efectivo/tarjeta/depósito, productos en JSON)
--  · mp_egresos  : egresos del día
--  · mp_config   : porcentaje de comisión y «no corresponde» de cada mes

create table if not exists public.mp_cortes (
  fecha date primary key,
  saldo_inicial numeric(12,2) not null default 0,
  billetes jsonb not null default '{}'::jsonb,
  notas text not null default '',
  creado timestamptz not null default now()
);
create table if not exists public.mp_facturas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  recibo text not null default '',
  nombre text not null default '',
  efectivo numeric(12,2) not null default 0,
  tarjeta numeric(12,2) not null default 0,
  deposito numeric(12,2) not null default 0,
  referencia text not null default '',
  observaciones text not null default '',
  productos jsonb not null default '[]'::jsonb,   -- [{"codigo":"GGC-03 BL","cant":1}]
  creado timestamptz not null default now()
);
create index if not exists mp_facturas_fecha on public.mp_facturas(fecha);
create table if not exists public.mp_egresos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  recibo text not null default '',
  nombre text not null default '',
  cantidad numeric(12,2) not null default 0,
  creado timestamptz not null default now()
);
create index if not exists mp_egresos_fecha on public.mp_egresos(fecha);
create table if not exists public.mp_config (
  clave text primary key,      -- 'porcentaje' · 'nc:2026-10' (no corresponde del mes)
  valor text not null default ''
);
insert into public.mp_config(clave, valor) values ('porcentaje', '3') on conflict (clave) do nothing;

-- permisos de la API (sin esto Supabase responde «tabla no existe»); solo para usuarios con sesión, nunca anon
grant select, insert, update, delete on public.mp_cortes, public.mp_facturas, public.mp_egresos, public.mp_config to authenticated;
notify pgrst, 'reload schema';

do $$ declare t text; begin
  foreach t in array array['mp_cortes','mp_facturas','mp_egresos','mp_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_director', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email','')) = 'reservas@farostudios.net')
      with check (lower(coalesce(auth.jwt()->>'email','')) = 'reservas@farostudios.net')$p$, t || '_director', t);
  end loop;
end $$;
