-- Notificaciones push (Faro Workspace): aparatos suscritos + avisos automáticos.
-- ANTES de correrlo: cambia REEMPLAZA_SECRETO por el mismo valor que pusiste como PUSH_SECRET en la función "notificar".
-- Requiere la función "notificar" publicada (supabase/functions/notificar).

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1) Aparatos que aceptaron recibir avisos (solo el director)
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  agente text,
  creado timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "admin push_subs" on public.push_subs;
create policy "admin push_subs" on public.push_subs for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
grant select, insert, update, delete on public.push_subs to authenticated;

-- 2) Secreto compartido con la función (guardado cifrado en Vault)
select vault.create_secret('REEMPLAZA_SECRETO', 'push_secret');

-- 3) Función que avisa; si algo falla NUNCA bloquea la reserva o la cotización
create or replace function public.push_avisar() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_secret';
  perform net.http_post(
    url := 'https://keivqvsgdfhthouzlqxo.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', coalesce(s, '')),
    body := jsonb_build_object('tipo', TG_ARGV[0], 'data', to_jsonb(NEW))
  );
  return NEW;
exception when others then
  return NEW;
end $$;
revoke execute on function public.push_avisar() from public, anon, authenticated;

drop trigger if exists push_reserva on public.agenda;
create trigger push_reserva after insert on public.agenda
  for each row execute function public.push_avisar('reserva');
drop trigger if exists push_cotizacion on public.cotizaciones;
create trigger push_cotizacion after insert on public.cotizaciones
  for each row execute function public.push_avisar('cotizacion');

-- 4) Resumen de cada mañana: 8:00 a. m. de Guatemala = 14:00 UTC
select cron.unschedule('push-resumen-diario') where exists (select 1 from cron.job where jobname = 'push-resumen-diario');
select cron.schedule('push-resumen-diario', '0 14 * * *', $$
  select net.http_post(
    url := 'https://keivqvsgdfhthouzlqxo.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-push-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'push_secret'), '')),
    body := '{"tipo":"resumen"}'::jsonb
  );
$$);
