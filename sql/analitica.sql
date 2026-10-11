-- Analítica de Faro: visitas a la web + estadísticas de redes sociales
-- Pegar en Supabase > SQL Editor > New query > Run (se puede repetir sin problema)

-- 1) Visitas (las registra la web con una función segura; solo el administrador las lee)
create table if not exists public.visitas (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  pagina text not null,            -- 'studios', 'academy', 'portal'
  ref text,                        -- de dónde llegó (instagram, google, directo…)
  dispositivo text,                -- movil / escritorio
  sid text                         -- identificador anónimo del navegador (para contar visitantes únicos)
);
create index if not exists visitas_creado_idx on public.visitas (creado desc);
alter table public.visitas enable row level security;
revoke all on public.visitas from anon;
drop policy if exists "admin visitas" on public.visitas;
create policy "admin visitas" on public.visitas for select to authenticated using (public.es_admin());

create or replace function public.registrar_visita(p_pagina text, p_ref text, p_disp text, p_sid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_pagina is null or p_pagina not in ('studios','academy','portal') then return; end if;
  if p_sid is not null and length(p_sid) > 40 then return; end if;
  -- máximo 1 registro por navegador y página cada 30 minutos (evita inflar números)
  if exists (select 1 from visitas where sid = p_sid and pagina = p_pagina and creado > now() - interval '30 minutes') then return; end if;
  insert into visitas (pagina, ref, dispositivo, sid)
  values (p_pagina, left(coalesce(p_ref,'directo'), 40), case when p_disp in ('movil','escritorio') then p_disp else null end, p_sid);
end $$;
grant execute on function public.registrar_visita(text, text, text, text) to anon, authenticated;

-- 2) Redes sociales (las anotas tú en Admin > Redes; una fila por red y fecha)
create table if not exists public.redes_stats (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  red text not null,               -- instagram, tiktok, facebook, youtube, whatsapp…
  cuenta text not null default 'studios' check (cuenta in ('studios','academy','davissimo')),
  seguidores integer,
  visualizaciones integer,
  alcance integer,
  interacciones integer,
  publicaciones integer,
  nota text,
  creado timestamptz not null default now(),
  unique (fecha, red, cuenta)
);
alter table public.redes_stats enable row level security;
revoke all on public.redes_stats from anon;
drop policy if exists "admin redes" on public.redes_stats;
create policy "admin redes" on public.redes_stats for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
