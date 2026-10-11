-- Chat del equipo del admin (director + usuarios del equipo). Se puede correr varias veces.
-- Requiere haber corrido equipo.sql.

create or replace function public.es_equipo()
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin() or exists (select 1 from public.admin_equipo e where e.user_id = auth.uid() and e.activo);
$$;
revoke execute on function public.es_equipo() from public, anon;
grant execute on function public.es_equipo() to authenticated;

create table if not exists public.admin_chat (
  id bigint generated always as identity primary key,
  de uuid not null default auth.uid(),
  nombre text not null default '',
  texto text not null check (char_length(texto) between 1 and 1000),
  creado timestamptz not null default now()
);
create index if not exists admin_chat_creado_idx on public.admin_chat (creado desc);
alter table public.admin_chat enable row level security;

-- el nombre lo pone el servidor (nadie se hace pasar por otra persona)
create or replace function public.admin_chat_nombre()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.de := auth.uid();
  new.nombre := coalesce((select e.nombre from public.admin_equipo e where e.user_id = auth.uid()), 'David (director)');
  return new;
end $$;
drop trigger if exists admin_chat_nombre on public.admin_chat;
create trigger admin_chat_nombre before insert on public.admin_chat for each row execute function public.admin_chat_nombre();

drop policy if exists "equipo lee chat" on public.admin_chat;
create policy "equipo lee chat" on public.admin_chat for select to authenticated using (public.es_equipo());
drop policy if exists "equipo escribe chat" on public.admin_chat;
create policy "equipo escribe chat" on public.admin_chat for insert to authenticated with check (public.es_equipo());
drop policy if exists "director borra chat" on public.admin_chat;
create policy "director borra chat" on public.admin_chat for delete to authenticated using (public.es_admin());
