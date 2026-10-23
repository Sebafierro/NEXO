"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { propiedadesSchema } from "@/lib/schemas";

function numero(v: FormDataEntryValue | null): number | null {
  const s = v?.toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function leerPropiedadesForm(formData: FormData) {
  return {
    propietario_id: formData.get("propietario_id")?.toString() || "",
    nombre: formData.get("nombre")?.toString() || null,
    direccion: formData.get("direccion")?.toString() || "",
    comuna: formData.get("comuna")?.toString() || null,
    region: formData.get("region")?.toString() || null,
    tipo: formData.get("tipo")?.toString() || "DEPARTAMENTO",
    estado: formData.get("estado")?.toString() || "DISPONIBLE",
    superficie_m2: numero(formData.get("superficie_m2")),
    habitaciones: numero(formData.get("habitaciones")),
    banos: numero(formData.get("banos")),
    estacionamientos: numero(formData.get("estacionamientos")),
    valor_arriendo: formData.get("valor_arriendo")?.toString() || 0,
  };
}

export async function crearPropiedad(formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const parsed = propiedadesSchema.safeParse(leerPropiedadesForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  }

  const { error } = await supabase.from("propiedades").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/propiedades");
  redirect("/admin/propiedades");
}

export async function actualizarPropiedad(id: string, formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const parsed = propiedadesSchema.safeParse(leerPropiedadesForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  }

  const { error } = await supabase.from("propiedades").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/propiedades");
  redirect("/admin/propiedades");
}

// Baja lógica: no se elimina la fila (arrastraría contratos y obligaciones vía
// cascade); se marca INACTIVA para conservar el historial financiero.
export async function darDeBajaPropiedad(id: string) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const { error } = await supabase
    .from("propiedades")
    .update({ estado: "INACTIVA" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/propiedades");
}
