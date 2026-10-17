-- Facturas en el portal del cliente: permite el tipo "voucher" en los documentos del cliente.
-- Pegar en Supabase > SQL Editor > New query > Run. Se puede correr más de una vez.
-- No cambia nada de lo que ya existe; solo agrega una opción más ("voucher") a la lista de tipos permitidos.
alter table public.cl_documentos drop constraint if exists cl_documentos_tipo_check;
alter table public.cl_documentos add constraint cl_documentos_tipo_check
  check (tipo in ('contrato','entrega','voucher','factura','enlace','otro'));
