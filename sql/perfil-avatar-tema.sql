-- Perfil de cada persona: avatar y color (Workspace y portal).
-- Sirve para todas las cuentas de acceso: director, equipo, docentes, alumnos, padres y clientes.
-- Solo SUMA una tabla nueva: no toca ninguna otra tabla ni política.
-- Se puede correr varias veces sin problema. Si no se corre, el avatar y el color se
-- guardan solo en el navegador de cada persona (y funcionan igual, pero no viajan entre aparatos).

create table if not exists public.perfiles_ws (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar smallint,                       -- 0 a 12 = avatar elegido; -1 = personaje gris; vacío = todavía no eligió
  tema text,                             -- clave del color/tema elegido (ver perfil.js)
  actualizado timestamptz not null default now()
);
alter table public.perfiles_ws enable row level security;

-- cada persona lee y cambia solo su propia fila
drop policy if exists "mi perfil" on public.perfiles_ws;
create policy "mi perfil" on public.perfiles_ws
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- el director puede ver todos (para mostrar avatares del equipo más adelante)
drop policy if exists "director ve perfiles" on public.perfiles_ws;
create policy "director ve perfiles" on public.perfiles_ws
  for select to authenticated using (public.es_admin());

revoke all on public.perfiles_ws from anon;
grant select, insert, update on public.perfiles_ws to authenticated;
