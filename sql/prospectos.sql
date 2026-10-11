-- Prospectos (CRM comercial): empresas a investigar y contactar, con su estado de seguimiento.
-- Solo el administrador (o quien tenga el permiso "clientes") puede leer o cambiar esta tabla.

create table if not exists public.prospectos (
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
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists prospectos_estado_idx on public.prospectos (estado);

alter table public.prospectos enable row level security;
drop policy if exists "admin prospectos" on public.prospectos;
create policy "admin prospectos" on public.prospectos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists "equipo prospectos" on public.prospectos;
create policy "equipo prospectos" on public.prospectos for all to authenticated
  using (public.tiene_permiso('clientes')) with check (public.tiene_permiso('clientes'));
