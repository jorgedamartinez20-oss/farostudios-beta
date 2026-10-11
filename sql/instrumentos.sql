-- Faro Academy · instrumentos seleccionables (ya no se escriben a mano)
-- Seguro de correr más de una vez. No borra ni cambia la columna "detalle".

alter table public.ac_estudiantes
  add column if not exists instrumentos text[] not null default '{}',
  add column if not exists nivel text;

-- Solo se aceptan valores de la lista: así el portal puede activar herramientas sin adivinar texto.
alter table public.ac_estudiantes drop constraint if exists ac_est_instrumentos_ok;
alter table public.ac_estudiantes add constraint ac_est_instrumentos_ok
  check (instrumentos <@ array['canto','acustica','clasica','electrica','bajo','bateria','piano','ukelele','produccion']::text[]);

alter table public.ac_estudiantes drop constraint if exists ac_est_nivel_ok;
alter table public.ac_estudiantes add constraint ac_est_nivel_ok
  check (nivel is null or nivel in ('principiante','intermedio','avanzado'));

-- Pasa a la lista lo que ya estaba escrito a mano en "detalle" (solo alumnos de música sin instrumentos aún).
update public.ac_estudiantes set instrumentos = array_remove(array[
    case when lower(detalle) ~ 'guitarra' and lower(detalle) ~ 'el[eé]ctric' then 'electrica' end,
    case when lower(detalle) ~ 'guitarra' and lower(detalle) ~ 'ac[uú]stic' then 'acustica' end,
    case when lower(detalle) ~ 'guitarra' and lower(detalle) ~ 'cl[aá]sic' then 'clasica' end,
    case when lower(detalle) ~ 'bajo' then 'bajo' end,
    case when lower(detalle) ~ 'bater' then 'bateria' end,
    case when lower(detalle) ~ 'piano' then 'piano' end,
    case when lower(detalle) ~ 'ukelele|ukulele' then 'ukelele' end,
    case when lower(detalle) ~ 'canto|vocal' then 'canto' end,
    case when lower(detalle) ~ 'producci' then 'produccion' end
  ], null)
where area = 'musica' and detalle is not null and instrumentos = '{}';
