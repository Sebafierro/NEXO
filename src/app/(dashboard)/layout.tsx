import { obtenerSesion } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sesión + rol desde el JWT de Supabase (app_metadata.rol).
  // obtenerSesion() redirige a /login si no hay usuario autenticado.
  const { rol, nombre, email } = await obtenerSesion();

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar rol={rol} nombre={nombre} email={email} />
      <main className="flex-1 p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}