-- ============================================================================
-- NEXO - M2: comprobantes de pago del arrendatario
--
-- Habilita el Flujo D (carga de comprobante por el arrendatario):
--   1. Amplia los metodos de pago admitidos (DEPOSITO es comun en Chile).
--   2. Permite al ARRENDATARIO insertar el pago y su documento COMPROBANTE_PAGO
--      asociados a una obligacion propia (queda PENDIENTE de validacion).
--   3. Permite al ARRENDATARIO subir el archivo del comprobante a su propia
--      carpeta en el bucket "respaldos".
--
-- Reglas de seguridad:
--   * El arrendatario solo puede crear pagos en estado PENDIENTE (sin
--     auto-validarse) y con monto > 0.
--   * El documento y el pago deben apuntar a una obligacion de un contrato del
--     que el usuario es arrendatario (es_arrendatario_de).
--   * El archivo debe vivir bajo {auth.uid()}/.
-- ============================================================================

begin;

-- 1. Metodos de pago: agregar DEPOSITO (idempotente).
alter table public.pagos drop constraint if exists pagos_metodo_pago_check;
alter table public.pagos add constraint pagos_metodo_pago_check
  check (metodo_pago in ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'DEPOSITO', 'OTRO'));

-- 2. El arrendatario inserta su comprobante (documento) sobre una obligacion
--    propia. Solo insercion y lectura de lo propio; nunca actualiza ni borra.
drop policy if exists "documentos_arrendatario_insert" on public.documentos;
create policy "documentos_arrendatario_insert"
  on public.documentos for insert
  to authenticated
  with check (
    public.es_arrendatario()
    and entidad_tipo = 'OBLIGACION'
    and tipo_documento = 'COMPROBANTE_PAGO'
    and estado = 'PENDIENTE'
    and exists (
      select 1
      from public.obligaciones o
      where o.id = public.documentos.entidad_id
        and public.es_arrendatario_de(o.contrato_id)
    )
  );

-- 3. El arrendatario registra el pago PENDIENTE de validacion. El estado
--    queda forzado a PENDIENTE y no puede rechazarse a si mismo.
drop policy if exists "pagos_arrendatario_insert" on public.pagos;
create policy "pagos_arrendatario_insert"
  on public.pagos for insert
  to authenticated
  with check (
    public.es_arrendatario()
    and estado_validacion = 'PENDIENTE'
    and monto > 0
    and exists (
      select 1
      from public.obligaciones o
      where o.id = public.pagos.obligacion_id
        and public.es_arrendatario_de(o.contrato_id)
    )
  );

-- 4. Storage: el arrendatario sube su comprobante a su carpeta {auth.uid()}/...
drop policy if exists "respaldos_arrendatario_insert" on storage.objects;
create policy "respaldos_arrendatario_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'respaldos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.es_arrendatario()
  );

commit;
