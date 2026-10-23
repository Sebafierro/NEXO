-- ============================================================================
-- NEXO - M3: confirmacion de extracciones OCR
-- Funcion transaction-safe que confirma una extraccion y actualiza el monto de
-- la obligacion asociada. Complementa 03_mvp.sql / 07_m3_documentos.sql.
--
-- Regla de negocio (PROJECT_SCOPE.md §12): "el OCR de M3 reemplazara el
-- estimado por el real"; el monto confirmado reemplaza el monto estimado de la
-- obligacion, protegiendo los pagos ya registrados (monto_pagado no cambia y
-- el saldo se recalcula automaticamente al ser una columna generada).
--
-- Protecciones:
--   * Solo ADMINISTRADOR/EJECUTIVO (security definer valida el rol del JWT).
--   * La extraccion debe estar EXTRAIDA (no RECHAZADA ni ya confirmada).
--   * Monto > 0 y confianza_ocr >= 80.
--   * El documento debe estar asociado a una obligacion (entidad_tipo =
--     OBLIGACION y entidad_id valido).
--   * Idempotencia: si el documento ya esta VALIDADO, no vuelve a aplicar el
--     monto (evita doble clic/reintentos).
-- ============================================================================

begin;

alter table public.extracciones_documento
  add column if not exists confirmado_en timestamptz;

comment on column public.extracciones_documento.confirmado_en is
  'Momento en que un ejecutivo confirmo la extraccion y se aplico a la obligacion.';

create or replace function public.confirmar_extraccion_ocr(p_extraccion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol           text;
  v_extraccion    record;
  v_documento     record;
  v_monto         numeric;
  v_monto_previo  numeric;
  v_estado_doc    text;
begin
  v_rol := public.rol_usuario_jwt();
  if v_rol not in ('ADMINISTRADOR', 'EJECUTIVO') then
    raise exception 'Sin permisos para confirmar extracciones OCR'
      using errcode = '42501';
  end if;

  -- Bloquea la fila de la extraccion para evitar confirmaciones concurrentes.
  select id, documento_id, estado, monto_detectado, confianza_ocr
    into v_extraccion
    from public.extracciones_documento
   where id = p_extraccion_id
   for update;

  if not found then
    raise exception 'Extraccion no encontrada' using errcode = 'P0002';
  end if;

  if v_extraccion.estado = 'RECHAZADA' then
    raise exception 'La extraccion fue rechazada y no puede confirmarse'
      using errcode = '22000';
  end if;

  if v_extraccion.monto_detectado is null or v_extraccion.monto_detectado <= 0 then
    raise exception 'La extraccion no tiene un monto detectado valido'
      using errcode = '22000';
  end if;

  if v_extraccion.confianza_ocr is not null and v_extraccion.confianza_ocr < 80 then
    raise exception 'La confianza del OCR (%) es menor a 80; requiere revision manual',
      v_extraccion.confianza_ocr using errcode = '22000';
  end if;

  select id, estado, entidad_tipo, entidad_id
    into v_documento
    from public.documentos
   where id = v_extraccion.documento_id
   for update;

  if not found then
    raise exception 'Documento asociado no encontrado' using errcode = 'P0002';
  end if;

  -- Idempotencia: documento ya confirmado -> no se vuelve a aplicar.
  if v_documento.estado = 'VALIDADO' then
    return jsonb_build_object(
      'aplicado', false,
      'motivo', 'ya_confirmado',
      'monto_aplicado', v_extraccion.monto_detectado,
      'obligacion_id', case when v_documento.entidad_tipo = 'OBLIGACION'
                            then v_documento.entidad_id end
    );
  end if;

  if v_documento.entidad_tipo is null or v_documento.entidad_tipo <> 'OBLIGACION'
     or v_documento.entidad_id is null then
    raise exception 'El documento no esta asociado a una obligacion'
      using errcode = '22000';
  end if;

  select monto into v_monto_previo
    from public.obligaciones
   where id = v_documento.entidad_id
   for update;

  if not found then
    raise exception 'La obligacion asociada no existe' using errcode = 'P0002';
  end if;

  -- El OCR reemplaza el monto estimado; monto_pagado (y por ende el saldo
  -- generado) se conserva.
  update public.obligaciones
     set monto = v_extraccion.monto_detectado
   where id = v_documento.entidad_id;

  v_monto := v_extraccion.monto_detectado;

  update public.documentos
     set estado = 'VALIDADO'
   where id = v_documento.id;

  update public.extracciones_documento
     set confirmado_en = now()
   where id = v_extraccion.id;

  return jsonb_build_object(
    'aplicado', true,
    'monto_previo', v_monto_previo,
    'monto_aplicado', v_monto,
    'obligacion_id', v_documento.entidad_id
  );
end;
$$;

comment on function public.confirmar_extraccion_ocr(uuid) is
  'Confirma una extraccion OCR y reemplaza el monto de la obligacion asociada. Idempotente por documento.';

commit;
