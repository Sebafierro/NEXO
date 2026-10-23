-- ============================================================================
-- NEXO - Ajustes según respuestas de negocio
-- ============================================================================
begin;

-- 1. Direcciones
alter table public.propietarios add column if not exists direccion text;
alter table public.arrendatarios add column if not exists direccion text;

-- 2. Comisión por contrato
alter table public.contratos add column if not exists comision_porcentaje numeric(5,2) default 0;
alter table public.contratos drop constraint if exists contratos_comision_porcentaje_check;
alter table public.contratos add constraint contratos_comision_porcentaje_check check (comision_porcentaje >= 0 and comision_porcentaje <= 100);

-- 3. Tipos de documento: añadir BOLETA_SERVICIO
alter table public.documentos drop constraint if exists documentos_tipo_documento_check;
alter table public.documentos add constraint documentos_tipo_documento_check
  check (tipo_documento in ('CONTRATO','RENOVACION','PODER','INFORME_AVALUO','COMPROBANTE_PAGO','BOLETA_SERVICIO','OTRO'));

-- 4. Cuentas de servicios: permitir a EJECUTIVO mantener
drop policy if exists "cuentas_servicios_ejecutivo_operacion" on public.cuentas_servicios;
create policy "cuentas_servicios_ejecutivo_operacion"
  on public.cuentas_servicios for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

-- 5. Liquidaciones: permitir a EJECUTIVO generar
drop policy if exists "liquidaciones_ejecutivo_operacion" on public.liquidaciones;
create policy "liquidaciones_ejecutivo_operacion"
  on public.liquidaciones for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

commit;
