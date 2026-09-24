import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_POR_ROL, normalizarRol } from "@/lib/roles";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);
  redirect(DASHBOARD_POR_ROL[rol]);
}