import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import {
  construirActualizacionError,
  extraerRutaStorage,
  normalizarResultadoOcr,
} from "@/lib/ocr";

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8080";
const OCR_TIMEOUT_MS = 60_000;

type DocumentoOcr = {
  id: string;
  archivo_url: string | null;
  bucket: string | null;
  nombre: string | null;
};

type ExtraccionPendiente = {
  id: string;
  documento_id: string;
  documentos: DocumentoOcr | DocumentoOcr[] | null;
};

function documentoDe(extraccion: ExtraccionPendiente): DocumentoOcr | null {
  if (Array.isArray(extraccion.documentos)) {
    return extraccion.documentos[0] ?? null;
  }
  return extraccion.documentos;
}

export async function POST() {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  // El procesamiento es una tarea de worker: usa service role para no depender
  // de las políticas RLS del usuario que dispara la cola.
  const supabase = createAdminClient();

  const { data: pendientes, error: colaError } = await supabase
    .from("extracciones_documento")
    .select("id, documento_id, documentos(id, archivo_url, bucket, nombre)")
    .in("estado", ["SOLICITADA", "EN_PROCESO"])
    .order("creado_en", { ascending: true })
    .limit(10);

  if (colaError) {
    console.error("[ocr] No se pudo leer la cola:", colaError.message);
    return NextResponse.json(
      { error: "No se pudo leer la cola de extracciones OCR" },
      { status: 500 },
    );
  }

  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({
      procesadas: 0,
      rechazadas: 0,
      total: 0,
      mensaje: "Sin extracciones pendientes",
    });
  }

  let procesadas = 0;
  let rechazadas = 0;
  const errores: string[] = [];

  for (const extraccion of pendientes as ExtraccionPendiente[]) {
    try {
      const documento = documentoDe(extraccion);
      if (!documento) {
        throw new Error("El documento asociado a la extracción no existe");
      }

      const { error: inicioError } = await supabase
        .from("extracciones_documento")
        .update({ estado: "EN_PROCESO" })
        .eq("id", extraccion.id);
      if (inicioError) {
        throw new Error(
          `No se pudo iniciar la extracción: ${inicioError.message}`,
        );
      }

      const bucket = documento.bucket || "respaldos";
      const ruta = extraerRutaStorage(documento.archivo_url, bucket);
      if (!ruta) {
        throw new Error("No se pudo determinar la ruta del archivo en Storage");
      }

      const { data: fileBlob, error: descargaError } = await supabase.storage
        .from(bucket)
        .download(ruta);
      if (descargaError || !fileBlob) {
        throw new Error(
          `No se pudo descargar el archivo: ${descargaError?.message ?? "archivo vacío"}`,
        );
      }

      const formData = new FormData();
      formData.append("file", fileBlob, documento.nombre || "documento");

      const response = await fetch(`${OCR_SERVICE_URL}/extraer`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detalle = (await response.text().catch(() => "")).slice(0, 200);
        throw new Error(
          `El servicio OCR respondió ${response.status}${detalle ? `: ${detalle}` : ""}`,
        );
      }

      let resultado: unknown;
      try {
        resultado = await response.json();
      } catch {
        throw new Error("El servicio OCR devolvió una respuesta no JSON");
      }

      const { datos, tiene_datos } = normalizarResultadoOcr(resultado);
      if (!tiene_datos) {
        throw new Error("El servicio OCR no devolvió datos útiles");
      }

      const { error: guardadoError } = await supabase
        .from("extracciones_documento")
        .update(datos)
        .eq("id", extraccion.id);
      if (guardadoError) {
        throw new Error(
          `No se pudo guardar el resultado OCR: ${guardadoError.message}`,
        );
      }

      const actualizacionDocumento: {
        estado: string;
        propiedad_id?: string;
      } = { estado: "EXTRAIDO" };

      if (datos.numero_cliente) {
        const { data: propiedadId, error: matchError } = await supabase.rpc(
          "encontrar_propiedad_por_numero_cliente",
          { p_numero_cliente: datos.numero_cliente },
        );
        if (matchError) {
          console.error(
            `[ocr] No se pudo buscar propiedad para la extracción ${extraccion.id}:`,
            matchError.message,
          );
        } else if (propiedadId) {
          actualizacionDocumento.propiedad_id = propiedadId as string;
        }
      }

      const { error: documentoError } = await supabase
        .from("documentos")
        .update(actualizacionDocumento)
        .eq("id", documento.id);
      if (documentoError) {
        // La extracción ya quedó guardada; el error de asociación no debe
        // convertirla en rechazada.
        console.error(
          `[ocr] Extracción ${extraccion.id} guardada, pero no se pudo actualizar el documento:`,
          documentoError.message,
        );
      }

      procesadas++;
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "Error desconocido en OCR";
      console.error(`[ocr] Extracción ${extraccion.id} rechazada: ${mensaje}`);

      const { error: rechazoError } = await supabase
        .from("extracciones_documento")
        .update(construirActualizacionError(mensaje))
        .eq("id", extraccion.id);
      if (rechazoError) {
        console.error(
          `[ocr] No se pudo registrar el rechazo de ${extraccion.id}:`,
          rechazoError.message,
        );
      }

      errores.push(mensaje);
      rechazadas++;
    }
  }

  return NextResponse.json({
    procesadas,
    rechazadas,
    total: pendientes.length,
    errores,
  });
}
