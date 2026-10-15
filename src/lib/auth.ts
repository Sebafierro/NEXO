import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_POR_ROL, normalizarRol, type Rol } from "@/lib/roles";

export type Sesion = {
  userId: string;
  email: string;
  rol: Rol;
  // Nombre legible para el encabezado del dashboard.
  // Proviene de public.usuarios; si la fila aún no existe, se arma con el metadata.
  nombre: string;
};

function componerNombre(nombres: string | null, apellidos: string | null, porDefecto: string) {
  const completo = [nombres, apellidos].filter(Boolean).join(" ").trim();
  return completo || porDefecto;
}

// Única fuente de sesión para Server Components: usuario + rol + nombre.
// Lanza redirect("/login") si no hay sesión válida.
export async function obtenerSesion(): Promise<Sesion> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);

  // public.usuarios se sincroniza vía trigger desde auth.users; la política RLS
  // "usuarios_ver_propio" permite leer la propia fila.
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombres, apellidos")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    rol,
    // TODO: mostrar "Nombre Apellido (Rol)" y permitir editar el perfil propio.
    nombre: componerNombre(
      perfil?.nombres ?? null,
      perfil?.apellidos ?? null,
      componerNombre(
        typeof user.user_metadata?.nombres === "string" ? user.user_metadata.nombres : null,
        typeof user.user_metadata?.apellidos === "string" ? user.user_metadata.apellidos : null,
        user.email ?? "Usuario"
      )
    ),
  };
}

// Guarda de página: redirige a /login sin sesión y al dashboard del rol
// cuando el usuario no tiene permiso sobre la ruta.
export async function requerirRol(...permitidos: Rol[]): Promise<Sesion> {
  const sesion = await obtenerSesion();

  if (!permitidos.includes(sesion.rol)) {
    redirect(DASHBOARD_POR_ROL[sesion.rol]);
  }

  return sesion;
}