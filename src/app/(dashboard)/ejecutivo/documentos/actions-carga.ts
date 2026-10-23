"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import crypto from "crypto";

const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export async function subirDocumentoOcr(formData: FormData) {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Archivo requerido");

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Solo se permiten archivos PDF, JPG o PNG");
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo debe ser menor a 5MB");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");

  // Anti-duplicados: el índice uq_documentos_hash_archivo rechaza un mismo
  // archivo ya cargado; se anticipa con un mensaje claro.
  const { data: existente } = await supabase
    .from("documentos")
    .select("id")
    .eq("hash_archivo", hash)
    .maybeSingle();
  if (existente) {
    throw new Error("Este archivo ya fue cargado previamente");
  }

  const fileExt = file.name.split(".").pop() || "pdf";
  const fileName = `ocr/${Date.now()}-${hash.slice(0, 8)}.${fileExt}`;
  const bucket = "respaldos";

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(fileName, bytes, { upsert: false, contentType: file.type });
  if (uploadErr) throw new Error(uploadErr.message);

  // El bucket es privado: se guarda la RUTA interna del objeto; al mostrarlo se
  // firma una URL temporal (ver src/lib/storage.ts).
  // La boleta nace SIN_ASIGNAR (entidad_id null); el paso de asignación la
  // vincula a una obligación/contrato real (ver supabase/10_...sql).
  const { data: doc, error: docErr } = await supabase
    .from("documentos")
    .insert({
      entidad_tipo: "SIN_ASIGNAR",
      entidad_id: null,
      tipo_documento: "BOLETA_SERVICIO",
      nombre: file.name,
      archivo_url: fileName,
      bucket,
      subido_por: sesion.userId,
      estado: "PENDIENTE",
      hash_archivo: hash,
    })
    .select("id")
    .single();
  if (docErr) throw new Error(docErr.message);

  const { error: extErr } = await supabase
    .from("extracciones_documento")
    .insert({
      documento_id: doc.id,
      solicitado_por: sesion.userId,
      objetivo: "EXTRACCION_OCR_MOCK",
      estado: "SOLICITADA",
    });
  if (extErr) throw new Error(extErr.message);

  revalidatePath("/ejecutivo/documentos");
}
