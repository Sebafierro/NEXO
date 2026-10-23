"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { cuentasServiciosSchema } from "@/lib/schemas";

function parseForm(formData: FormData) {
  const monto = formData.get("monto_mensual")?.toString().trim() || null;
  return {
    propiedad_id: formData.get("propiedad_id")?.toString() || "",
    tipo_servicio: formData.get("tipo_servicio")?.toString() || "AGUA",
    empresa: formData.get("empresa")?.toString() || "",
    numero_cliente: formData.get("numero_cliente")?.toString() || "",
    numero_cuenta: formData.get("numero_cuenta")?.toString() || null,
    monto_mensual: monto,
    activo: formData.get("activo")?.toString() === "true",
  };
}

export async function crearCuentaServicio(formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO);
  const supabase = await createClient();
  const parsed = cuentasServiciosSchema.safeParse(parseForm(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("cuentas_servicios").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cuentas-servicios");
  redirect("/admin/cuentas-servicios");
}

export async function actualizarCuentaServicio(id: string, formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO);
  const supabase = await createClient();
  const parsed = cuentasServiciosSchema.safeParse(parseForm(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("cuentas_servicios").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cuentas-servicios");
  redirect("/admin/cuentas-servicios");
}

export async function eliminarCuentaServicio(id: string) {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO);
  const supabase = await createClient();
  const { error } = await supabase.from("cuentas_servicios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cuentas-servicios");
}
