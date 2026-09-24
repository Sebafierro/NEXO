import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarRol } from "@/lib/roles";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);

  // TODO: leer nombres/apellidos desde public.usuarios cuando exista el perfil.
  const nombre =
    (user.user_metadata?.nombres as string | undefined) ?? user.email ?? "Usuario";

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar rol={rol} nombre={nombre} email={user.email ?? ""} />
      <main className="p-4 sm:p-6 lg:pl-72 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}