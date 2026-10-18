-- Comunidad de la web (beta): buzón de sugerencias + descargas, estrellas y comentarios de recursos.
-- Pegar en Supabase > SQL Editor > New query > Run.  Sin registro: cada navegador usa un id anónimo (sid).
-- Solo el administrador lee o cambia las tablas; el público escribe a través de funciones con límites anti‑spam.

create table if not exists public.sugerencias_web (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'sugerencia' check (tipo in ('error','sugerencia','comentario')),
  mensaje text not null check (length(mensaje) between 3 and 1500),
  nombre text, contacto text, pagina text, sid text,
  leida boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists sugerencias_web_creado_idx on public.sugerencias_web (creado desc);

create table if not exists public.recurso_descargas (
  id bigserial primary key, recurso text not null, sid text not null, creado timestamptz not null default now()
);
create index if not exists recurso_descargas_r_idx on public.recurso_descargas (recurso);

create table if not exists public.recurso_votos (
  recurso text not null, sid text not null,
  estrellas int not null check (estrellas between 1 and 5),
  creado timestamptz not null default now(),
  primary key (recurso, sid)
);

create table if not exists public.recurso_comentarios (
  id uuid primary key default gen_random_uuid(),
  recurso text not null, sid text, nombre text not null, texto text not null,
  visible boolean not null default true,
  creado timestamptz not null default now()
);
create index if not exists recurso_comentarios_r_idx on public.recurso_comentarios (recurso, creado desc);

do $$ declare t text; begin
  foreach t in array array['sugerencias_web','recurso_descargas','recurso_votos','recurso_comentarios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "admin %1$s" on public.%1$I', t);
    execute format('create policy "admin %1$s" on public.%1$I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t);
  end loop;
end $$;

-- Resumen público por recurso (descargas, votos, promedio, comentarios)
create or replace function public.recursos_resumen()
returns table (recurso text, descargas bigint, votos bigint, promedio numeric, comentarios bigint)
language sql security definer set search_path = public stable as $$
  select r.recurso,
         coalesce((select count(*) from recurso_descargas d where d.recurso = r.recurso), 0),
         coalesce((select count(*) from recurso_votos v where v.recurso = r.recurso), 0),
         coalesce((select round(avg(v.estrellas)::numeric, 1) from recurso_votos v where v.recurso = r.recurso), 0),
         coalesce((select count(*) from recurso_comentarios c where c.recurso = r.recurso and c.visible), 0)
  from (select recurso from recurso_descargas union select recurso from recurso_votos union select recurso from recurso_comentarios) r
$$;

create or replace function public.recurso_descarga(p_recurso text, p_sid text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_recurso,'') !~ '^[a-z0-9_-]{1,40}$' or coalesce(length(p_sid),0) not between 6 and 60 then raise exception 'datos'; end if;
  if not exists (select 1 from recurso_descargas where recurso = p_recurso and sid = p_sid and creado > now() - interval '1 day') then
    insert into recurso_descargas (recurso, sid) values (p_recurso, p_sid);
  end if;
  return (select count(*) from recurso_descargas where recurso = p_recurso);
end $$;

create or replace function public.recurso_calificar(p_recurso text, p_sid text, p_estrellas int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_recurso,'') !~ '^[a-z0-9_-]{1,40}$' or coalesce(length(p_sid),0) not between 6 and 60 or p_estrellas not between 1 and 5 then raise exception 'datos'; end if;
  insert into recurso_votos (recurso, sid, estrellas) values (p_recurso, p_sid, p_estrellas)
  on conflict (recurso, sid) do update set estrellas = excluded.estrellas, creado = now();
end $$;

create or replace function public.recurso_comentarios_lista(p_recurso text)
returns table (nombre text, texto text, creado timestamptz)
language sql security definer set search_path = public stable as $$
  select nombre, texto, creado from recurso_comentarios where recurso = p_recurso and visible order by creado desc limit 30
$$;

create or replace function public.recurso_comentar(p_recurso text, p_sid text, p_nombre text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_recurso,'') !~ '^[a-z0-9_-]{1,40}$' or coalesce(length(p_sid),0) not between 6 and 60
     or length(trim(coalesce(p_nombre,''))) not between 1 and 60 or length(trim(coalesce(p_texto,''))) not between 2 and 600 then raise exception 'datos'; end if;
  if (select count(*) from recurso_comentarios where sid = p_sid and creado > now() - interval '1 hour') >= 3 then raise exception 'limite'; end if;
  insert into recurso_comentarios (recurso, sid, nombre, texto) values (p_recurso, p_sid, trim(p_nombre), trim(p_texto));
end $$;

create or replace function public.crear_sugerencia(p_tipo text, p_mensaje text, p_nombre text, p_contacto text, p_pagina text, p_sid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('error','sugerencia','comentario') or length(trim(coalesce(p_mensaje,''))) not between 3 and 1500
     or coalesce(length(p_nombre),0) > 80 or coalesce(length(p_contacto),0) > 120 or coalesce(length(p_pagina),0) > 80 then raise exception 'datos'; end if;
  if (select count(*) from sugerencias_web where sid = p_sid and creado > now() - interval '1 hour') >= 5 then raise exception 'limite'; end if;
  insert into sugerencias_web (tipo, mensaje, nombre, contacto, pagina, sid)
  values (p_tipo, trim(p_mensaje), nullif(trim(p_nombre),''), nullif(trim(p_contacto),''), nullif(trim(p_pagina),''), left(p_sid,60));
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'recursos_resumen()','recurso_descarga(text,text)','recurso_calificar(text,text,int)',
    'recurso_comentarios_lista(text)','recurso_comentar(text,text,text,text)','crear_sugerencia(text,text,text,text,text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- Permisos de tabla para el administrador (esta base no los da por defecto; las políticas RLS siguen limitando a es_admin()).
grant select, insert, update, delete on public.sugerencias_web, public.recurso_descargas,
  public.recurso_votos, public.recurso_comentarios to authenticated;
notify pgrst, 'reload schema';
