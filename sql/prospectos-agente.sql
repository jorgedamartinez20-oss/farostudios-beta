-- Agente de ventas (Faro Studios): prospectos que carga el agente automáticamente.
-- Mismo formato que public.prospectos, más los campos propios del agente
-- (tipo, servicio, fecha del evento, fuente, mensaje listo, PDF a adjuntar).
-- Solo el administrador (o quien tenga el permiso "clientes") puede leer o cambiar esta tabla.

create table if not exists public.prospectos_agente (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  categoria text,
  segmento text,
  estado text not null default 'por_investigar'
    check (estado in ('por_investigar','listo','contactado','enviado','agendado','ganado','perdido')),
  prioridad text check (prioridad in ('A','B','C')),
  potencial text check (potencial in ('Muy alto','Alto','Medio','Bajo')),
  recurrente text check (recurrente in ('Sí','Tal vez','No')),
  ticket numeric,
  ubicacion text,
  correo text, telefono text, whatsapp text,
  web text, instagram text, facebook text,
  que_venden text, que_detectamos text, que_ofreceremos text, info text, notas text,
  ultimo_contacto date,
  proximo_seguimiento date,
  -- campos propios del agente
  tipo text check (tipo in ('necesidad_activa','frio','canal')),
  urgente boolean not null default false,
  servicio text,
  fecha_evento text,
  fuente text,
  mensaje text,
  pdf text,
  monto_nota text,
  reporte date,
  enviado boolean not null default false,
  enviado_en timestamptz,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists prospectos_agente_estado_idx on public.prospectos_agente (estado);
create index if not exists prospectos_agente_reporte_idx on public.prospectos_agente (reporte);
create unique index if not exists prospectos_agente_empresa_uq on public.prospectos_agente (lower(empresa));

alter table public.prospectos_agente enable row level security;
drop policy if exists "admin prospectos agente" on public.prospectos_agente;
create policy "admin prospectos agente" on public.prospectos_agente for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists "equipo prospectos agente" on public.prospectos_agente;
create policy "equipo prospectos agente" on public.prospectos_agente for all to authenticated
  using (public.tiene_permiso('clientes')) with check (public.tiene_permiso('clientes'));
