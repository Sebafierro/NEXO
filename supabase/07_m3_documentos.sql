-- ============================================================================
-- NEXO - M3: Documentos y OCR
-- ============================================================================
begin;

-- Hash anti-duplicados
create unique index if not exists uq_documentos_hash_archivo
  on public.documentos (hash_archivo)
  where hash_archivo is not null;

-- Asociación automática por numero_cliente via cuentas_servicios
-- (helper: función para encontrar propiedad por numero_cliente)
create or replace function public.encontrar_propiedad_por_numero_cliente(p_numero_cliente text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cs.propiedad_id
  from public.cuentas_servicios cs
  where cs.numero_cliente = p_numero_cliente
    and cs.activo = true
  limit 1
$$;

commit;
