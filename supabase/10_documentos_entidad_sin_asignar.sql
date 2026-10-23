-- ============================================================================
-- NEXO - M3: documentos "sin asignar"
--
-- Contexto: al subir una boleta para OCR, el documento no tiene todavia una
-- entidad destino real. Antes se rellenaba entidad_tipo='OBLIGACION' con un
-- UUID aleatorio (no existente) para satisfacer el NOT NULL, lo que producia
-- "relaciones fantasma" y permitia confirmar una extraccion antes de asignarla
-- (el RPC confirmar_extraccion_ocr fallaba con "La obligacion asociada no
-- existe").
--
-- Esta migracion introduce el estado explicito 'SIN_ASIGNAR':
--   * entidad_tipo = 'SIN_ASIGNAR' y entidad_id = NULL mientras la boleta no
--     este asignada.
--   * asignarBoleta() lo reemplaza por la entidad real (OBLIGACION/CONTRATO/..)
--     y su id.
--
-- Incluye backfill de las boletas ya subidas cuyo entidad_id no existe.
-- ============================================================================

begin;

-- 1. Permitir entidad_tipo = 'SIN_ASIGNAR'.
alter table public.documentos drop constraint if exists documentos_entidad_tipo_check;
alter table public.documentos
  add constraint documentos_entidad_tipo_check
  check (entidad_tipo in ('PROPIEDAD', 'CONTRATO', 'PROPIETARIO', 'ARRENDATARIO', 'OBLIGACION', 'SIN_ASIGNAR'));

-- 2. entidad_id deja de ser NOT NULL: un documento sin asignar no tiene destino.
alter table public.documentos alter column entidad_id drop not null;

-- 3. Coherencia: si el tipo es SIN_ASIGNAR, el id debe ser NULL; y al reves.
alter table public.documentos drop constraint if exists documentos_entidad_asignada_check;
alter table public.documentos
  add constraint documentos_entidad_asignada_check
  check (
    (entidad_tipo = 'SIN_ASIGNAR' and entidad_id is null)
    or (entidad_tipo <> 'SIN_ASIGNAR' and entidad_id is not null)
  );

-- 4. Backfill: boletas/comprobantes que apuntan a una entidad inexistente
--    quedan marcadas como SIN_ASIGNAR (datos corruptos previos).
update public.documentos d
   set entidad_tipo = 'SIN_ASIGNAR',
       entidad_id   = null
 where d.entidad_tipo = 'OBLIGACION'
   and d.entidad_id is not null
   and not exists (select 1 from public.obligaciones o where o.id = d.entidad_id);

commit;

-- ============================================================================
-- Verificacion sugerida (ejecutar manualmente si se desea):
--   select entidad_tipo, count(*) from public.documentos group by 1;
--   select count(*) from public.documentos where entidad_tipo = 'SIN_ASIGNAR';
-- ============================================================================
