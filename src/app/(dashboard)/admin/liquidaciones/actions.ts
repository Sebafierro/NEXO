"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { generarPDFLiquidacion } from "@/lib/pdf/liquidacion";

async function generarPDFParaLiquidacion(liquidacionId: string) {
  const supabase = await createClient();
  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("*, propietarios(nombres, apellidos)")
    .eq("id", liquidacionId)
    .single();

  if (!liquidacion) return;

  const { data: items } = await supabase
    .from("liquidacion_items")
    .select("*")
    .eq("liquidacion_id", liquidacionId);

  try {
    const pdfBuffer = generarPDFLiquidacion({
      periodo: liquidacion.periodo,
      propietario: `${(liquidacion.propietarios as any)?.nombres || ""} ${(liquidacion.propietarios as any)?.apellidos || ""}`.trim() || "Propietario",
      contratoId: liquidacion.contrato_id,
      arriendoBruto: Number(liquidacion.arriendo_bruto || 0),
      comision: Number(liquidacion.comision || 0),
      gastos: Number(liquidacion.gastos || 0),
      neto: Number(liquidacion.neto || 0),
      items: (items || []).map((i: any) => ({ concepto: i.concepto, monto: Number(i.monto || 0), tipo: i.tipo, signo: i.signo })),
    });

    const filename = `liquidaciones/${liquidacionId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("respaldos")
      .upload(filename, new Uint8Array(pdfBuffer), { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      await supabase.from("liquidaciones").update({ pdf_url: "/placeholder-liquidacion.pdf" }).eq("id", liquidacionId);
      return;
    }

    // El bucket es privado: se guarda la RUTA interna y se firma al descargar.
    await supabase.from("liquidaciones").update({ pdf_url: filename }).eq("id", liquidacionId);
  } catch {
    await supabase.from("liquidaciones").update({ pdf_url: "/placeholder-liquidacion.pdf" }).eq("id", liquidacionId);
  }
}

export async function aprobarLiquidacion(liquidacionId: string) {
  const sesion = await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data: liquidacion, error: fetchError } = await supabase
    .from("liquidaciones")
    .select("id, estado")
    .eq("id", liquidacionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!liquidacion) throw new Error("Liquidación no encontrada");
  if (liquidacion.estado !== "GENERADA") {
    throw new Error(`Solo se pueden aprobar liquidaciones en estado GENERADA (estado actual: ${liquidacion.estado})`);
  }

  const { error } = await supabase
    .from("liquidaciones")
    .update({ estado: "APROBADA", aprobado_por: sesion.userId, aprobado_en: new Date().toISOString() })
    .eq("id", liquidacionId)
    .eq("estado", "GENERADA");

  if (error) throw new Error(error.message);

  await generarPDFParaLiquidacion(liquidacionId);

  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");
  revalidatePath("/ejecutivo/liquidaciones");
}

export async function rechazarLiquidacion(liquidacionId: string, observaciones: string) {
  if (!observaciones || observaciones.trim() === "") {
    throw new Error("El motivo de rechazo es obligatorio");
  }
  const sesion = await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data: liquidacion, error: fetchError } = await supabase
    .from("liquidaciones")
    .select("id, estado")
    .eq("id", liquidacionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!liquidacion) throw new Error("Liquidación no encontrada");
  if (liquidacion.estado !== "GENERADA") {
    throw new Error(`Solo se pueden rechazar liquidaciones en estado GENERADA (estado actual: ${liquidacion.estado})`);
  }

  const { error } = await supabase
    .from("liquidaciones")
    .update({ estado: "RECHAZADA", aprobado_por: sesion.userId, aprobado_en: new Date().toISOString(), observaciones: observaciones.trim() })
    .eq("id", liquidacionId)
    .eq("estado", "GENERADA");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");
  revalidatePath("/ejecutivo/liquidaciones");
}

export async function aprobarLiquidacionesLote(formData: FormData) {
  const sesion = await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  // Solo aprobar las que estén en estado GENERADA
  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id, estado")
    .in("id", ids);

  const idsValidos = (liquidaciones ?? [])
    .filter((l: any) => l.estado === "GENERADA")
    .map((l: any) => l.id);

  if (idsValidos.length === 0) {
    throw new Error("No hay liquidaciones en estado GENERADA para aprobar");
  }

  const { error } = await supabase
    .from("liquidaciones")
    .update({ estado: "APROBADA", aprobado_por: sesion.userId, aprobado_en: new Date().toISOString() })
    .in("id", idsValidos)
    .eq("estado", "GENERADA");

  if (error) throw new Error(error.message);

  for (const id of idsValidos) {
    await generarPDFParaLiquidacion(id);
  }

  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");
  revalidatePath("/ejecutivo/liquidaciones");
}

export async function rechazarLiquidacionesLote(formData: FormData) {
  const sesion = await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const ids = formData.getAll("ids") as string[];
  const observaciones = formData.get("observaciones")?.toString() || "";

  if (!observaciones || observaciones.trim() === "") {
    throw new Error("El motivo de rechazo es obligatorio para rechazo en lote");
  }
  if (ids.length === 0) return;

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id, estado")
    .in("id", ids);

  const idsValidos = (liquidaciones ?? [])
    .filter((l: any) => l.estado === "GENERADA")
    .map((l: any) => l.id);

  if (idsValidos.length === 0) {
    throw new Error("No hay liquidaciones en estado GENERADA para rechazar");
  }

  const { error } = await supabase
    .from("liquidaciones")
    .update({ estado: "RECHAZADA", aprobado_por: sesion.userId, aprobado_en: new Date().toISOString(), observaciones: observaciones.trim() })
    .in("id", idsValidos)
    .eq("estado", "GENERADA");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");
  revalidatePath("/ejecutivo/liquidaciones");
}
