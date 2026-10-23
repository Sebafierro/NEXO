// Tipos y mapeo puro entre las filas de Supabase y las filas de la UI de
// extracciones OCR. Sin acceso a red: se puede probar con Vitest.

export type DocumentoRow = {
  id: string;
  nombre: string;
  tipo_documento: string;
  entidad_tipo: string;
  entidad_id: string | null;
  estado: string;
  creado_en: string;
  propiedad_id: string | null;
};

export type ExtraccionRow = {
  id: string;
  documento_id: string;
  estado: string;
  empresa_detectada: string | null;
  numero_cliente: string | null;
  monto_detectado: number | null;
  confianza_ocr: number | null;
  extraida_en: string | null;
  confirmado_en: string | null;
  datos_crudos: unknown;
};

export type ExtraccionResumen = {
  estado: string;
  empresa_detectada: string | null;
  numero_cliente: string | null;
  monto_detectado: number | null;
  confianza_ocr: number | null;
  extraida_en: string | null;
  confirmada_en: string | null;
  error: string | null;
};

export type FilaExtraccion = {
  documento_id: string;
  nombre: string;
  tipo_documento: string;
  entidad_tipo: string;
  entidad_id: string | null;
  estado_documento: string;
  propiedad_id: string | null;
  creado_en: string;
  extraccion: ExtraccionResumen | null;
};

const ESTADOS_DOCUMENTO_CONFIRMADOS = new Set(["VALIDADO"]);

export function mensajeErrorExtraccion(datosCrudos: unknown): string | null {
  if (typeof datosCrudos !== "object" || datosCrudos === null) return null;
  const error = (datosCrudos as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : null;
}

export function aFilaExtraccion(
  documento: DocumentoRow,
  extraccion: ExtraccionRow | null,
): FilaExtraccion {
  return {
    documento_id: documento.id,
    nombre: documento.nombre,
    tipo_documento: documento.tipo_documento,
    entidad_tipo: documento.entidad_tipo,
    entidad_id: documento.entidad_id,
    estado_documento: documento.estado,
    propiedad_id: documento.propiedad_id,
    creado_en: documento.creado_en,
    extraccion: extraccion
      ? {
          estado: extraccion.estado,
          empresa_detectada: extraccion.empresa_detectada,
          numero_cliente: extraccion.numero_cliente,
          monto_detectado:
            extraccion.monto_detectado === null ? null : Number(extraccion.monto_detectado),
          confianza_ocr:
            extraccion.confianza_ocr === null ? null : Number(extraccion.confianza_ocr),
          extraida_en: extraccion.extraida_en,
          confirmada_en: extraccion.confirmado_en,
          error: mensajeErrorExtraccion(extraccion.datos_crudos),
        }
      : null,
  };
}

// Una extracción está lista para confirmar cuando el OCR terminó (EXTRAIDA),
// el documento apunta a una obligación REAL (no SIN_ASIGNAR) y no fue
// confirmada todavía. Debe ser OBLIGACION: el RPC confirmar_extraccion_ocr
// rechaza cualquier otro entidad_tipo.
export function estaListaParaConfirmar(fila: FilaExtraccion): boolean {
  const ext = fila.extraccion;
  if (!ext) return false;
  if (ext.estado !== "EXTRAIDA") return false;
  if (fila.estado_documento === "VALIDADO") return false;
  if (fila.entidad_tipo !== "OBLIGACION" || !fila.entidad_id) return false;
  if (ext.monto_detectado === null || ext.monto_detectado <= 0) return false;
  return true;
}

export function estaConfirmada(fila: FilaExtraccion): boolean {
  return ESTADOS_DOCUMENTO_CONFIRMADOS.has(fila.estado_documento) || fila.extraccion?.confirmada_en != null;
}

// Un documento está asignado solo cuando apunta a una entidad real. El estado
// SIN_ASIGNAR (o un entidad_id ausente) significa que aún no se vinculó.
export function estaAsignada(fila: FilaExtraccion): boolean {
  return fila.entidad_tipo !== "SIN_ASIGNAR" && fila.entidad_tipo !== "" && Boolean(fila.entidad_id);
}

export type EntradaAsignacion = {
  propiedadId: string | null;
  contratoId: string | null;
  obligacionId: string | null;
  obligacionPropiedadId: string | null;
};

// Deriva los campos de documentos a persistir al asignar una boleta.
// Regla: si hay obligación, la propiedad REAL de esa obligación manda sobre el
// filtro de propiedad (evita inconsistencia entidad_id <-> propiedad_id).
export function derivarAsignacion(entrada: EntradaAsignacion): Record<string, unknown> {
  const { propiedadId, contratoId, obligacionId, obligacionPropiedadId } = entrada;
  const updates: Record<string, unknown> = {};

  if (obligacionId) {
    if (obligacionPropiedadId) updates.propiedad_id = obligacionPropiedadId;
    updates.entidad_tipo = "OBLIGACION";
    updates.entidad_id = obligacionId;
  } else if (contratoId) {
    if (propiedadId) updates.propiedad_id = propiedadId;
    updates.entidad_tipo = "CONTRATO";
    updates.entidad_id = contratoId;
  } else if (propiedadId) {
    updates.propiedad_id = propiedadId;
  }

  return updates;
}
