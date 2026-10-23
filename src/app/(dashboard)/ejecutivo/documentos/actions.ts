"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { validarConfirmacion } from "@/lib/ocr";
import { derivarAsignacion } from "@/components/documentos/extracciones-ocr-data";

export type ResultadoAccion = {
  ok: boolean;
  mensaje: string;
  aplicado?: boolean;
};

export async function asignarBoleta(
  documentoId: string,
  formData: FormData,
): Promise<ResultadoAccion> {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const propiedadId = formData.get("propiedad_id")?.toString() || null;
  const contratoId = formData.get("contrato_id")?.toString() || null;
  const obligacionId = formData.get("obligacion_id")?.toString() || null;

  if (!propiedadId && !contratoId && !obligacionId) {
    return { ok: false, mensaje: "Selecciona una propiedad, contrato u obligación" };
  }

  // Una boleta de servicio SOLO se confirma por OCR contra una obligación. El
  // contrato/propiedad son filtros para elegirla, no destinos válidos: asignar
  // a CONTRATO dejaría la confirmación en un callejón sin salida.
  const { data: documento, error: errDocumento } = await supabase
    .from("documentos")
    .select("id, tipo_documento")
    .eq("id", documentoId)
    .maybeSingle();
  if (errDocumento) return { ok: false, mensaje: errDocumento.message };
  if (!documento) return { ok: false, mensaje: "Documento no encontrado" };

  const esBoletaOcr =
    documento.tipo_documento === "BOLETA_SERVICIO" ||
    documento.tipo_documento === "COMPROBANTE_PAGO";
  if (esBoletaOcr && !obligacionId) {
    return {
      ok: false,
      mensaje:
        "Esta boleta debe asignarse a una obligación para poder confirmarse. " +
        "Usa los filtros de contrato/propiedad para acotar la lista y elige la obligación.",
    };
  }

  let obligacionPropiedadId: string | null = null;
  if (obligacionId) {
    // El documento debe quedar asociado a la obligación; validamos que sea
    // visible para el usuario (RLS aplica) antes de persistir.
    const { data: obligacion, error: errObligacion } = await supabase
      .from("obligaciones")
      .select("id, contrato_id, propiedad_id")
      .eq("id", obligacionId)
      .maybeSingle();
    if (errObligacion) return { ok: false, mensaje: errObligacion.message };
    if (!obligacion) return { ok: false, mensaje: "La obligación seleccionada no existe o no es accesible" };
    obligacionPropiedadId = (obligacion as { propiedad_id?: string | null }).propiedad_id ?? null;
  }

  if (contratoId) {
    const { data: contrato, error: errContrato } = await supabase
      .from("contratos")
      .select("id")
      .eq("id", contratoId)
      .maybeSingle();
    if (errContrato) return { ok: false, mensaje: errContrato.message };
    if (!contrato) return { ok: false, mensaje: "El contrato seleccionado no existe o no es accesible" };
  }

  if (propiedadId) {
    const { data: propiedad, error: errPropiedad } = await supabase
      .from("propiedades")
      .select("id")
      .eq("id", propiedadId)
      .maybeSingle();
    if (errPropiedad) return { ok: false, mensaje: errPropiedad.message };
    if (!propiedad) return { ok: false, mensaje: "La propiedad seleccionada no existe o no es accesible" };
  }

  const updates = derivarAsignacion({
    propiedadId,
    contratoId,
    obligacionId,
    obligacionPropiedadId,
  });

  const { error } = await supabase
    .from("documentos")
    .update(updates as never)
    .eq("id", documentoId);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/ejecutivo/documentos");
  return { ok: true, mensaje: "Asignación guardada" };
}

export async function confirmarExtraccion(
  documentoId: string,
): Promise<ResultadoAccion> {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data: documento, error: errDocumento } = await supabase
    .from("documentos")
    .select("id, estado, entidad_tipo, entidad_id")
    .eq("id", documentoId)
    .maybeSingle();
  if (errDocumento) return { ok: false, mensaje: errDocumento.message };
  if (!documento) return { ok: false, mensaje: "Documento no encontrado" };

  const { data: extraccion, error: errExtraccion } = await supabase
    .from("extracciones_documento")
    .select("id, estado, monto_detectado, confianza_ocr")
    .eq("documento_id", documentoId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errExtraccion) return { ok: false, mensaje: errExtraccion.message };
  if (!extraccion) return { ok: false, mensaje: "El documento no tiene una extracción OCR" };

  const validacion = validarConfirmacion(
    {
      estado: extraccion.estado,
      monto_detectado: extraccion.monto_detectado === null ? null : Number(extraccion.monto_detectado),
      confianza_ocr: extraccion.confianza_ocr === null ? null : Number(extraccion.confianza_ocr),
    },
    {
      estado: documento.estado,
      entidad_tipo: documento.entidad_tipo,
      entidad_id: documento.entidad_id,
    },
  );
  if (!validacion.valido) return { ok: false, mensaje: validacion.motivo };

  const { data, error } = await supabase.rpc("confirmar_extraccion_ocr", {
    p_extraccion_id: extraccion.id,
  });
  if (error) return { ok: false, mensaje: error.message };

  const resultado = (data ?? {}) as { aplicado?: boolean };
  revalidatePath("/ejecutivo/documentos");
  revalidatePath("/ejecutivo/conciliacion");
  revalidatePath("/admin");

  if (resultado.aplicado === false) {
    return { ok: true, aplicado: false, mensaje: "La extracción ya había sido confirmada" };
  }

  return { ok: true, aplicado: true, mensaje: "Monto de la obligación actualizado" };
}
