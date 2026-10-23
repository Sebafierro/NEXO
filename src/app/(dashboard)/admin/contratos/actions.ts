"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { contratosSchema } from "@/lib/schemas";

function parseForm(formData: FormData) {
  const fechaTermino = formData.get("fecha_termino")?.toString() || "";
  const diaVencimiento = formData.get("dia_vencimiento")?.toString();
  const comision = formData.get("comision_porcentaje")?.toString();
  return {
    propiedad_id: formData.get("propiedad_id")?.toString() || "",
    arrendatario_id: formData.get("arrendatario_id")?.toString() || "",
    fecha_inicio: formData.get("fecha_inicio")?.toString() || "",
    fecha_termino: fechaTermino || null,
    valor_arriendo: Number(formData.get("valor_arriendo")?.toString() || 0),
    garantia_meses: Number(formData.get("garantia_meses")?.toString() || 1),
    dia_vencimiento: diaVencimiento ? Number(diaVencimiento) : 5,
    comision_porcentaje: comision !== "" && comision !== null ? Number(comision) : 0,
    estado: formData.get("estado")?.toString() || "BORRADOR",
  };
}

export async function crearContrato(formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const parsed = contratosSchema.safeParse(parseForm(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("contratos").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contratos");
  redirect("/admin/contratos");
}

export async function actualizarContrato(id: string, formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const parsed = contratosSchema.safeParse(parseForm(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("contratos").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contratos");
  redirect("/admin/contratos");
}

export async function eliminarContrato(id: string) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const { error } = await supabase.from("contratos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contratos");
}
