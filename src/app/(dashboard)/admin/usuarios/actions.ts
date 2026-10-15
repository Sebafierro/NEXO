"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizarRol, ROLES, type Rol } from "@/lib/roles";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);
  if (rol !== ROLES.ADMINISTRADOR) throw new Error("Solo administradores pueden gestionar usuarios");
  return user;
}

export type CrearUsuarioInput = {
  email: string;
  password: string;
  nombres?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  rol: Rol;
};

export async function crearUsuario(input: CrearUsuarioInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      nombres: input.nombres ?? null,
      apellidos: input.apellidos ?? null,
      telefono: input.telefono ?? null,
      rol: input.rol,
    },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
  return data.user?.id ?? null;
}

export type ActualizarUsuarioInput = {
  nombres?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  rol?: Rol;
};

export async function actualizarUsuario(id: string, input: ActualizarUsuarioInput) {
  await assertAdmin();
  const admin = createAdminClient();
  if (input.rol) {
    const { error: updAuthErr } = await admin.auth.admin.updateUserById(id, {
      app_metadata: { rol: input.rol },
    });
    if (updAuthErr) throw new Error(updAuthErr.message);
  }
  const patch: Record<string, unknown> = {
    nombres: input.nombres ?? null,
    apellidos: input.apellidos ?? null,
    telefono: input.telefono ?? null,
    actualizado_en: new Date().toISOString(),
  };
  if (input.rol) patch.rol = input.rol;
  const { error: updDbErr } = await admin.from("usuarios").update(patch).eq("id", id);
  if (updDbErr) throw new Error(updDbErr.message);
  revalidatePath("/admin/usuarios");
}

export async function eliminarUsuario(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}
