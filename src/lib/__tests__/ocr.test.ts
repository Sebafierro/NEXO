import { describe, it, expect } from "vitest";
import {
  CONFIANZA_MINIMA_CONFIRMACION,
  ESTADOS_EXTRACCION,
  construirActualizacionError,
  extraerRutaStorage,
  normalizarResultadoOcr,
  validarConfirmacion,
} from "@/lib/ocr";
import {
  aFilaExtraccion,
  derivarAsignacion,
  estaAsignada,
  estaConfirmada,
  estaListaParaConfirmar,
  mensajeErrorExtraccion,
  type DocumentoRow,
  type ExtraccionRow,
} from "@/components/documentos/extracciones-ocr-data";

describe("ocr", () => {
  it("normaliza una respuesta válida y usa el estado soportado por la BD", () => {
    const { datos, tiene_datos } = normalizarResultadoOcr(
      {
        empresa_detectada: "EMPRESA_MOCK",
        numero_cliente: " CLI-123 ",
        monto_detectado: "150000",
        fecha_vencimiento: "2026-11-30",
        saldo_detectado: 150000,
        confianza_ocr: 90,
        datos_crudos: { hash: "abc123" },
      },
      new Date("2026-10-22T12:00:00Z"),
    );

    expect(tiene_datos).toBe(true);
    expect(ESTADOS_EXTRACCION).toContain(datos.estado);
    expect(datos.estado).toBe("EXTRAIDA");
    expect(datos.numero_cliente).toBe("CLI-123");
    expect(datos.monto_detectado).toBe(150000);
    expect(datos.fecha_vencimiento).toBe("2026-11-30");
    expect(datos.resultado_validacion).toBe("CONSISTENTE");
    expect(datos.extraida_en).toBe("2026-10-22T12:00:00.000Z");
    expect(datos.datos_crudos).toEqual({ hash: "abc123" });
  });

  it("marca REVISAR cuando la confianza es menor a 80", () => {
    const { datos } = normalizarResultadoOcr({
      numero_cliente: "CLI-1",
      confianza_ocr: 72.5,
    });

    expect(datos.confianza_ocr).toBe(72.5);
    expect(datos.resultado_validacion).toBe("REVISAR");
  });

  it("ignora fechas inválidas y no reporta datos útiles si todo viene vacío", () => {
    const { datos, tiene_datos } = normalizarResultadoOcr({
      fecha_vencimiento: "no-es-fecha",
      monto_detectado: null,
    });

    expect(datos.fecha_vencimiento).toBeNull();
    expect(tiene_datos).toBe(false);
  });

  it("construye un rechazo con estado válido y sin datos de extracción", () => {
    const actualizacion = construirActualizacionError(
      "El servicio OCR no respondió",
      new Date("2026-10-22T12:00:00Z"),
    );

    expect(actualizacion.estado).toBe("RECHAZADA");
    expect(ESTADOS_EXTRACCION).toContain(actualizacion.estado);
    expect(actualizacion.datos_crudos).toEqual({
      error: "El servicio OCR no respondió",
      rechazada_en: "2026-10-22T12:00:00.000Z",
    });
  });

  it("extrae la ruta interna desde la URL pública de Supabase Storage", () => {
    expect(
      extraerRutaStorage(
        "https://proyecto.supabase.co/storage/v1/object/public/respaldos/ocr/123-abc.pdf",
        "respaldos",
      ),
    ).toBe("ocr/123-abc.pdf");
  });

  it("devuelve null cuando la URL no pertenece al bucket", () => {
    expect(
      extraerRutaStorage("https://ejemplo.com/archivo.pdf", "respaldos"),
    ).toBeNull();
  });
});

const baseExtraccion: ExtraccionRow = {
  id: "e1",
  documento_id: "d1",
  estado: "EXTRAIDA",
  empresa_detectada: "EMPRESA_MOCK",
  numero_cliente: "CLI-1",
  monto_detectado: 150000,
  confianza_ocr: 90,
  extraida_en: "2026-10-22T12:00:00Z",
  confirmado_en: null,
  datos_crudos: { hash: "x" },
};

const baseDocumento: DocumentoRow = {
  id: "d1",
  nombre: "boleta.pdf",
  tipo_documento: "BOLETA_SERVICIO",
  entidad_tipo: "OBLIGACION",
  entidad_id: "o1",
  estado: "EXTRAIDO",
  creado_en: "2026-10-22T11:00:00Z",
  propiedad_id: null,
};

describe("validarConfirmacion (reglas espejo de la RPC)", () => {
  const ok = { estado: "EXTRAIDA", monto_detectado: 150000, confianza_ocr: 90 };
  const docOk = { estado: "EXTRAIDO", entidad_tipo: "OBLIGACION", entidad_id: "o1" };

  it("acepta una extracción confirmable", () => {
    expect(validarConfirmacion(ok, docOk)).toEqual({ valido: true });
  });

  it("rechaza extracción RECHAZADA", () => {
    expect(validarConfirmacion({ ...ok, estado: "RECHAZADA" }, docOk).valido).toBe(false);
  });

  it("rechaza monto nulo o <= 0", () => {
    expect(validarConfirmacion({ ...ok, monto_detectado: null }, docOk).valido).toBe(false);
    expect(validarConfirmacion({ ...ok, monto_detectado: 0 }, docOk).valido).toBe(false);
  });

  it("rechaza confianza menor al mínimo", () => {
    const r = validarConfirmacion({ ...ok, confianza_ocr: CONFIANZA_MINIMA_CONFIRMACION - 1 }, docOk);
    expect(r.valido).toBe(false);
  });

  it("no permite reconfirmar un documento ya VALIDADO", () => {
    expect(validarConfirmacion(ok, { ...docOk, estado: "VALIDADO" }).valido).toBe(false);
  });

  it("exige una obligación asignada", () => {
    expect(validarConfirmacion(ok, { ...docOk, entidad_tipo: "CONTRATO" }).valido).toBe(false);
    expect(validarConfirmacion(ok, { ...docOk, entidad_tipo: "SIN_ASIGNAR", entidad_id: null }).valido).toBe(false);
    expect(validarConfirmacion(ok, { ...docOk, entidad_id: null }).valido).toBe(false);
  });
});

describe("mapeo UI de extracciones", () => {
  it("extrae el mensaje de error del rechazo", () => {
    expect(mensajeErrorExtraccion({ error: "OCR falló" })).toBe("OCR falló");
    expect(mensajeErrorExtraccion({ hash: "x" })).toBeNull();
    expect(mensajeErrorExtraccion(null)).toBeNull();
  });

  it("marca lista para confirmar solo cuando corresponde", () => {
    const fila = aFilaExtraccion(baseDocumento, baseExtraccion);
    expect(estaListaParaConfirmar(fila)).toBe(true);
    expect(estaConfirmada(fila)).toBe(false);
  });

  it("no está lista si falta monto o la obligación", () => {
    const sinMonto = aFilaExtraccion(baseDocumento, { ...baseExtraccion, monto_detectado: null });
    expect(estaListaParaConfirmar(sinMonto)).toBe(false);

    const sinObligacion = aFilaExtraccion({ ...baseDocumento, entidad_tipo: "CONTRATO" }, baseExtraccion);
    expect(estaListaParaConfirmar(sinObligacion)).toBe(false);
  });

  it("una boleta SIN_ASIGNAR no está lista para confirmar", () => {
    const sinAsignar = aFilaExtraccion(
      { ...baseDocumento, entidad_tipo: "SIN_ASIGNAR", entidad_id: null },
      baseExtraccion,
    );
    expect(estaAsignada(sinAsignar)).toBe(false);
    expect(estaListaParaConfirmar(sinAsignar)).toBe(false);
  });

  it("estaAsignada exige entidad_tipo real y entidad_id", () => {
    const asignada = aFilaExtraccion(baseDocumento, baseExtraccion);
    expect(estaAsignada(asignada)).toBe(true);
    const sinId = aFilaExtraccion({ ...baseDocumento, entidad_id: null }, baseExtraccion);
    expect(estaAsignada(sinId)).toBe(false);
  });

  it("detecta una extracción confirmada por estado o por confirmado_en", () => {
    const porEstado = aFilaExtraccion({ ...baseDocumento, estado: "VALIDADO" }, baseExtraccion);
    expect(estaConfirmada(porEstado)).toBe(true);

    const porCampo = aFilaExtraccion(baseDocumento, {
      ...baseExtraccion,
      confirmado_en: "2026-10-22T13:00:00Z",
    });
    expect(estaConfirmada(porCampo)).toBe(true);
    expect(estaListaParaConfirmar(porCampo)).toBe(true);
  });
});

describe("derivarAsignacion (asignación de boletas a obligación)", () => {
  it("la propiedad real de la obligación manda sobre el filtro de propiedad", () => {
    const updates = derivarAsignacion({
      propiedadId: "prop-filtro",
      contratoId: null,
      obligacionId: "oblig-1",
      obligacionPropiedadId: "prop-real",
    });
    expect(updates.propiedad_id).toBe("prop-real");
    expect(updates.entidad_tipo).toBe("OBLIGACION");
    expect(updates.entidad_id).toBe("oblig-1");
  });

  it("sin propiedad derivable, no fija propiedad_id al asignar obligación", () => {
    const updates = derivarAsignacion({
      propiedadId: "prop-filtro",
      contratoId: null,
      obligacionId: "oblig-1",
      obligacionPropiedadId: null,
    });
    expect(updates).not.toHaveProperty("propiedad_id");
    expect(updates.entidad_id).toBe("oblig-1");
  });

  it("sin obligación, asigna a contrato y conserva la propiedad del filtro", () => {
    const updates = derivarAsignacion({
      propiedadId: "prop-1",
      contratoId: "contrato-1",
      obligacionId: null,
      obligacionPropiedadId: null,
    });
    expect(updates.entidad_tipo).toBe("CONTRATO");
    expect(updates.entidad_id).toBe("contrato-1");
    expect(updates.propiedad_id).toBe("prop-1");
  });

  it("solo propiedad fija propiedad_id sin entidad", () => {
    const updates = derivarAsignacion({
      propiedadId: "prop-1",
      contratoId: null,
      obligacionId: null,
      obligacionPropiedadId: null,
    });
    expect(updates.propiedad_id).toBe("prop-1");
    expect(updates).not.toHaveProperty("entidad_tipo");
  });
});
