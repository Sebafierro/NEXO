"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { arrendatarioSchema } from "@/lib/schemas";

export async function crearArrendatario(formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const raw = {
    rut: formData.get("rut")?.toString() || "",
    nombres: formData.get("nombres")?.toString() || "",
    apellidos: formData.get("apellidos")?.toString() || "",
    telefono: formData.get("telefono")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    direccion: formData.get("direccion")?.toString() || "",
    estado: formData.get("estado")?.toString() || "ACTIVO",
  };
  const parsed = arrendatarioSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("arrendatarios").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/arrendatarios");
  redirect("/admin/arrendatarios");
}

export async function actualizarArrendatario(id: string, formData: FormData) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const raw = {
    rut: formData.get("rut")?.toString() || "",
    nombres: formData.get("nombres")?.toString() || "",
    apellidos: formData.get("apellidos")?.toString() || "",
    telefono: formData.get("telefono")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    direccion: formData.get("direccion")?.toString() || "",
    estado: formData.get("estado")?.toString() || "ACTIVO",
  };
  const parsed = arrendatarioSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
  const { error } = await supabase.from("arrendatarios").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/arrendatarios");
  redirect("/admin/arrendatarios");
}

export async function eliminarArrendatario(id: string) {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const { error } = await supabase.from("arrendatarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/arrendatarios");
}
