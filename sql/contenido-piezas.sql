-- Subida diaria de contenido a redes: piezas por día (carrusel, stories, reel…), caption, archivos en R2,
-- "subido" y analíticos (se llenan 2 días después). Solo el administrador puede leer o cambiar la tabla.
-- Requiere haber corrido antes sql/contenido.sql. Se puede repetir sin problema.
--
-- Los archivos viven en la bodega R2, en:  faro-privado / faro-studios/contenido/AAAA-MM-DD/<archivo>
-- Esta tabla solo guarda la lista de rutas de cada pieza, no los archivos.

create table if not exists public.contenido_piezas (
  id uuid primary key default gen_random_uuid(),
  contenido_id uuid references public.contenido(id) on delete cascade,
  fecha date not null,                                   -- día en que sale (y carpeta donde viven sus archivos)
  tipo text not null default 'carrusel' check (tipo in ('carrusel','story','reel','video','foto')),
  orden integer not null default 0,                      -- orden dentro del día
  titulo text,                                           -- opcional: "Story 1", "Encuesta", etc.
  caption text,                                          -- texto listo para pegar en Instagram (con hashtags)
  archivos text[] not null default '{}',                 -- rutas en R2, en el orden de los slides
  notas text,
  subido_en timestamptz,                                 -- cuando David la marcó como subida
  descargado_en timestamptz,
  url_publicacion text,
  -- analíticos de Instagram (David los llena 2 días después de subir)
  analitica_en timestamptz,                              -- cuando se llenaron
  alcance integer, vistas integer, me_gusta integer, comentarios integer,
  guardados integer, compartidos integer, visitas_perfil integer, seguidores_nuevos integer,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists contenido_piezas_fecha_idx on public.contenido_piezas (fecha);
create index if not exists contenido_piezas_contenido_idx on public.contenido_piezas (contenido_id);

alter table public.contenido_piezas enable row level security;
revoke all on public.contenido_piezas from anon;
drop policy if exists "admin contenido_piezas" on public.contenido_piezas;
create policy "admin contenido_piezas" on public.contenido_piezas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
