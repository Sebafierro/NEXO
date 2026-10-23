// Estados válidos de public.extracciones_documento (ver supabase/backend_setup.sql).
export const ESTADOS_EXTRACCION = [
  "SOLICITADA",
  "EN_PROCESO",
  "EXTRAIDA",
  "RECHAZADA",
] as const;

export type EstadoExtraccion = (typeof ESTADOS_EXTRACCION)[number];

type ResultadoValidacion = "CONSISTENTE" | "INCONSISTENTE" | "REVISAR";

export type ActualizacionExtraccion = {
  estado: EstadoExtraccion;
  empresa_detectada: string | null;
  numero_cliente: string | null;
  monto_detectado: number | null;
  fecha_vencimiento: string | null;
  saldo_detectado: number | null;
  confianza_ocr: number | null;
  resultado_validacion: ResultadoValidacion | null;
  datos_crudos: Record<string, unknown>;
  extraida_en: string;
};

export type NormalizacionOcr = {
  datos: ActualizacionExtraccion;
  tiene_datos: boolean;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (!limpio) return null;
    const parseado = Number(limpio);
    if (Number.isFinite(parseado)) return parseado;
  }
  return null;
}

function fecha(valor: unknown): string | null {
  const candidato = texto(valor);
  if (!candidato) return null;

  const match = candidato.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;

  const normalizada = match[1];
  const fechaDate = new Date(`${normalizada}T00:00:00Z`);
  if (Number.isNaN(fechaDate.getTime())) return null;

  return fechaDate.toISOString().slice(0, 10) === normalizada
    ? normalizada
    : null;
}

function confianza(valor: unknown): number | null {
  const parseada = numero(valor);
  if (parseada === null) return null;
  return Math.max(0, Math.min(100, parseada));
}

function clasificarConfianza(valor: number | null): ResultadoValidacion | null {
  if (valor === null) return null;
  return valor < 80 ? "REVISAR" : "CONSISTENTE";
}

export function normalizarResultadoOcr(
  resultado: unknown,
  ahora: Date = new Date(),
): NormalizacionOcr {
  const crudo = esObjeto(resultado) ? resultado : {};

  const empresaDetectada = texto(crudo.empresa_detectada);
  const numeroCliente = texto(crudo.numero_cliente);
  const montoDetectado = numero(crudo.monto_detectado);
  const fechaVencimiento = fecha(crudo.fecha_vencimiento);
  const saldoDetectado = numero(crudo.saldo_detectado);
  const confianzaOcr = confianza(crudo.confianza_ocr);
  const datosCrudos = esObjeto(crudo.datos_crudos) ? crudo.datos_crudos : crudo;

  const tieneDatos =
    empresaDetectada !== null ||
    numeroCliente !== null ||
    montoDetectado !== null ||
    fechaVencimiento !== null ||
    saldoDetectado !== null;

  return {
    tiene_datos: tieneDatos,
    datos: {
      estado: "EXTRAIDA",
      empresa_detectada: empresaDetectada,
      numero_cliente: numeroCliente,
      monto_detectado: montoDetectado,
      fecha_vencimiento: fechaVencimiento,
      saldo_detectado: saldoDetectado,
      confianza_ocr: confianzaOcr,
      resultado_validacion: clasificarConfianza(confianzaOcr),
      datos_crudos: datosCrudos,
      extraida_en: ahora.toISOString(),
    },
  };
}

export const CONFIANZA_MINIMA_CONFIRMACION = 80;

export type ExtraccionParaConfirmar = {
  estado: string;
  monto_detectado: number | null;
  confianza_ocr: number | null;
};

export type DocumentoParaConfirmar = {
  estado: string | null;
  entidad_tipo: string | null;
  entidad_id: string | null;
};

export type ValidacionConfirmacion =
  | { valido: true }
  | { valido: false; motivo: string };

// Reglas de negocio espejo de supabase/08_m3_confirmacion_ocr.sql, para poder
// validar en el backend y probar con Vitest sin depender de la base de datos.
export function validarConfirmacion(
  extraccion: ExtraccionParaConfirmar,
  documento: DocumentoParaConfirmar,
): ValidacionConfirmacion {
  if (extraccion.estado === "RECHAZADA") {
    return { valido: false, motivo: "La extracción fue rechazada y no puede confirmarse" };
  }
  if (!["EXTRAIDA", "EN_PROCESO", "SOLICITADA"].includes(extraccion.estado)) {
    return { valido: false, motivo: `La extracción está en un estado inesperado (${extraccion.estado})` };
  }
  if (
    extraccion.monto_detectado === null ||
    !Number.isFinite(extraccion.monto_detectado) ||
    extraccion.monto_detectado <= 0
  ) {
    return { valido: false, motivo: "La extracción no tiene un monto detectado válido" };
  }
  if (
    extraccion.confianza_ocr !== null &&
    extraccion.confianza_ocr < CONFIANZA_MINIMA_CONFIRMACION
  ) {
    return {
      valido: false,
      motivo: `La confianza del OCR (${extraccion.confianza_ocr}%) es menor a ${CONFIANZA_MINIMA_CONFIRMACION}; requiere revisión manual`,
    };
  }
  if (documento.estado === "VALIDADO") {
    return { valido: false, motivo: "La extracción ya fue confirmada" };
  }
  if (documento.entidad_tipo !== "OBLIGACION" || !documento.entidad_id) {
    return { valido: false, motivo: "El documento no está asociado a una obligación" };
  }
  return { valido: true };
}

export function construirActualizacionError(
  mensaje: string,
  ahora: Date = new Date(),
): { estado: "RECHAZADA"; datos_crudos: Record<string, unknown> } {
  return {
    estado: "RECHAZADA",
    datos_crudos: {
      error: mensaje,
      rechazada_en: ahora.toISOString(),
    },
  };
}

// Extrae la ruta interna del objeto a partir de la URL pública/privada que
// guarda public.documentos.archivo_url.
export function extraerRutaStorage(
  archivoUrl: string | null | undefined,
  bucket: string,
): string | null {
  const url = texto(archivoUrl);
  if (!url) return null;

  if (!/^https?:\/\//i.test(url)) {
    return url.replace(/^\/+/, "");
  }

  try {
    const pathname = new URL(url).pathname;
    const marcadores = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
    ];

    for (const marcador of marcadores) {
      const posicion = pathname.indexOf(marcador);
      if (posicion >= 0) {
        const ruta = pathname.slice(posicion + marcador.length);
        return ruta ? decodeURIComponent(ruta) : null;
      }
    }

    const match = pathname.match(new RegExp(`/${bucket}/(.+)$`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
