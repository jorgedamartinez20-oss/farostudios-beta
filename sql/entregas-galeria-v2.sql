-- ENTREGAS · Galería v2 (listas, reseñas, solicitudes de impresión, datos de cada foto)
-- Pega todo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
-- Requiere haber corrido antes sql/entregas.sql.

-- 1) Datos de cada foto (cámara, distancia, apertura, fotógrafo). Se leen del EXIF al subirla y se pueden corregir.
alter table public.en_archivos add column if not exists meta jsonb not null default '{}'::jsonb;

-- 2) Listas para compartir (hasta 5 por galería, cada una con su enlace privado)
create table if not exists public.en_listas (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.en_proyectos(id) on delete cascade,
  user_id     uuid not null default auth.uid(),
  nombre      text not null check (char_length(nombre) between 1 and 40),
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  creado      timestamptz not null default now()
);
create index if not exists en_listas_proy on public.en_listas(proyecto_id, user_id);

create table if not exists public.en_lista_fotos (
  lista_id   uuid not null references public.en_listas(id) on delete cascade,
  archivo_id uuid not null references public.en_archivos(id) on delete cascade,
  creado     timestamptz not null default now(),
  primary key (lista_id, archivo_id)
);

-- Máximo 5 listas por galería y por cliente
create or replace function public.en_listas_limite() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.en_listas where proyecto_id = new.proyecto_id and user_id = new.user_id) >= 5 then
    raise exception 'Máximo 5 listas por galería';
  end if;
  return new;
end $$;
drop trigger if exists en_listas_limite on public.en_listas;
create trigger en_listas_limite before insert on public.en_listas for each row execute function public.en_listas_limite();

-- 3) Reseñas (con autorización para usarlas en redes y en la web)
create table if not exists public.en_resenas (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.en_proyectos(id) on delete cascade,
  user_id     uuid not null default auth.uid(),
  nombre      text not null default '',
  sesion      text not null default '',
  estrellas   int  not null check (estrellas between 1 and 5),
  texto       text not null default '' check (char_length(texto) <= 1500),
  autoriza    boolean not null default false,
  publicada   boolean not null default false,   -- tú decides cuáles salen en "Lo dicen nuestros clientes"
  creado      timestamptz not null default now()
);
create index if not exists en_resenas_proy on public.en_resenas(proyecto_id);

-- 4) Solicitudes de impresión (no es compra: tú confirmas y agendas con el cliente)
create table if not exists public.en_solicitudes (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.en_proyectos(id) on delete cascade,
  user_id     uuid not null default auth.uid(),
  cliente     text not null default '',
  items       jsonb not null default '[]'::jsonb,   -- [{archivo_id, nombre, tam, cant, precio}]
  cantidad    int  not null default 0,
  subtotal    numeric not null default 0,
  envio       numeric not null default 0,
  total       numeric not null default 0,
  nota        text not null default '' check (char_length(nota) <= 800),
  estado      text not null default 'nueva' check (estado in ('nueva','atendida')),
  creado      timestamptz not null default now()
);
create index if not exists en_solicitudes_estado on public.en_solicitudes(estado, creado desc);

-- 5) Seguridad
do $$
declare t text;
begin
  foreach t in array array['en_listas','en_lista_fotos','en_resenas','en_solicitudes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin', t);
    execute format('create policy %I on public.%I for all using (public.es_admin()) with check (public.es_admin())', t||'_admin', t);
  end loop;
end $$;

-- el cliente solo ve y maneja lo suyo, y solo dentro de su galería publicada
drop policy if exists en_listas_yo on public.en_listas;
create policy en_listas_yo on public.en_listas for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.en_proyectos p where p.id = proyecto_id and p.visible and p.cuenta_id = auth.uid()));

drop policy if exists en_lista_fotos_yo on public.en_lista_fotos;
create policy en_lista_fotos_yo on public.en_lista_fotos for all
  using (exists (select 1 from public.en_listas l where l.id = lista_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.en_listas l where l.id = lista_id and l.user_id = auth.uid())
              and exists (select 1 from public.en_archivos a join public.en_proyectos p on p.id = a.proyecto_id
                          where a.id = archivo_id and a.habilitado and p.visible and p.cuenta_id = auth.uid()));

drop policy if exists en_resenas_ver on public.en_resenas;
create policy en_resenas_ver on public.en_resenas for select using (user_id = auth.uid());
drop policy if exists en_resenas_crear on public.en_resenas;
create policy en_resenas_crear on public.en_resenas for insert
  with check (user_id = auth.uid() and autoriza = true and publicada = false
              and exists (select 1 from public.en_proyectos p where p.id = proyecto_id and p.visible and p.cuenta_id = auth.uid()));

drop policy if exists en_solicitudes_ver on public.en_solicitudes;
create policy en_solicitudes_ver on public.en_solicitudes for select using (user_id = auth.uid());
drop policy if exists en_solicitudes_crear on public.en_solicitudes;
create policy en_solicitudes_crear on public.en_solicitudes for insert
  with check (user_id = auth.uid() and estado = 'nueva'
              and exists (select 1 from public.en_proyectos p where p.id = proyecto_id and p.visible and p.cuenta_id = auth.uid()));

-- 6) Lista pública: quien tenga el enlace privado ve solo las fotos de esa lista (nada más de la galería)
create or replace function public.en_lista_publica(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce((
    select jsonb_build_object(
      'lista', l.nombre,
      'titulo', coalesce(p.config->>'titulo', p.titulo),
      'config', p.config,
      'archivos', coalesce((
        select jsonb_agg(jsonb_build_object('id', a.id, 'key', a.key, 'nombre', a.nombre, 'tipo', a.tipo, 'meta', a.meta) order by a.orden, a.creado)
        from public.en_lista_fotos lf join public.en_archivos a on a.id = lf.archivo_id
        where lf.lista_id = l.id and a.habilitado and a.tipo = 'imagen'), '[]'::jsonb))
    from public.en_listas l join public.en_proyectos p on p.id = l.proyecto_id
    where l.token = p_token and p.visible
  ), 'null'::jsonb)
$$;
grant execute on function public.en_lista_publica(text) to anon, authenticated;

-- 7) Permisos de tabla (esta base no los da por defecto)
grant select, insert, update, delete on public.en_listas, public.en_lista_fotos, public.en_resenas, public.en_solicitudes to authenticated;

-- 8) Aviso al teléfono cuando llega una solicitud o una reseña (solo si ya corriste sql/notificaciones.sql)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'push_avisar' and pronamespace = 'public'::regnamespace) then
    execute 'drop trigger if exists push_solicitud on public.en_solicitudes';
    execute 'create trigger push_solicitud after insert on public.en_solicitudes for each row execute function public.push_avisar(''solicitud'')';
    execute 'drop trigger if exists push_resena on public.en_resenas';
    execute 'create trigger push_resena after insert on public.en_resenas for each row execute function public.push_avisar(''resena'')';
  end if;
end $$;

notify pgrst, 'reload schema';
