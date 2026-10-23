"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

const METODOS_PAGO = ["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "DEPOSITO", "OTRO"];
const TIPOS_ARCHIVO = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export async function subirComprobanteArrendatario(formData: FormData) {
  const sesion = await exigirRol(ROLES.ARRENDATARIO);
  const supabase = await createClient();

  const obligacionId = formData.get("obligacion_id")?.toString();
  const montoStr = formData.get("monto")?.toString();
  const fechaPago = formData.get("fecha_pago")?.toString();
  const metodoPago = formData.get("metodo_pago")?.toString() || "TRANSFERENCIA";
  const referencia = formData.get("referencia")?.toString() || null;
  const file = formData.get("file") as File | null;

  if (!obligacionId || !montoStr || !fechaPago || !file || file.size === 0) {
    throw new Error("Datos incompletos");
  }

  const monto = Number(montoStr);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Monto inválido");
  }
  if (!METODOS_PAGO.includes(metodoPago)) {
    throw new Error("Método de pago inválido");
  }
  if (!TIPOS_ARCHIVO.includes(file.type)) {
    throw new Error("Solo se permiten archivos PDF, JPG o PNG");
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo debe ser menor a 5MB");
  }

  // Verificar que la obligación pertenece al arrendatario (RLS aplica, pero validamos).
  const { data: obligacion, error: errOb } = await supabase
    .from("obligaciones")
    .select("id, contrato_id")
    .eq("id", obligacionId)
    .maybeSingle();

  if (errOb || !obligacion) {
    throw new Error("Obligación no encontrada");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileExt = file.name.split(".").pop() || "pdf";
  const ruta = `${sesion.userId}/${Date.now()}.${fileExt}`;
  const bucket = "respaldos";

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(ruta, bytes, { upsert: false, contentType: file.type });

  if (uploadErr) {
    throw new Error(uploadErr.message);
  }

  // El bucket es privado: se guarda la RUTA interna y se firma al mostrarla.
  const { data: doc, error: docErr } = await supabase
    .from("documentos")
    .insert({
      entidad_tipo: "OBLIGACION",
      entidad_id: obligacionId,
      tipo_documento: "COMPROBANTE_PAGO",
      nombre: file.name,
      archivo_url: ruta,
      bucket,
      subido_por: sesion.userId,
      estado: "PENDIENTE",
    })
    .select("id")
    .single();

  if (docErr) throw new Error(docErr.message);

  // Pago PENDIENTE de validación por el ejecutivo.
  const { error: pagoErr } = await supabase
    .from("pagos")
    .insert({
      obligacion_id: obligacionId,
      monto,
      fecha_pago: new Date(`${fechaPago}T12:00:00`).toISOString(),
      metodo_pago: metodoPago,
      referencia,
      estado_validacion: "PENDIENTE",
      registrado_por: sesion.userId,
      documento_id: doc.id,
    });

  if (pagoErr) throw new Error(pagoErr.message);

  revalidatePath("/arrendatario/pagos");
  revalidatePath("/ejecutivo/conciliacion");
  redirect("/arrendatario/pagos");
}
