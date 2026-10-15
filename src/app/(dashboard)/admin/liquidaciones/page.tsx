import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Aprobación de liquidaciones",
};

export default async function AdminLiquidacionesPage() {
  await requerirRol(ROLES.ADMINISTRADOR);

  // TODO: reemplazar por la consulta real cuando exista public.liquidaciones
  //       (periodo, propietario_id, total_bruto, comisión, neto, estado).
  //       Ver diseño tentativo en supabase/02_roles_extension.sql.
  const pendientes: unknown[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprobación Liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y aprueba las liquidaciones generadas por el equipo ejecutivo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones pendientes de aprobación</CardTitle>
          <CardDescription>
            El módulo de liquidaciones todavía no está disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {/* TODO: tabla con periodo, propietario, monto neto y acciones
                  (aprobar / rechazar / devolver observaciones). */}
              No hay liquidaciones por aprobar. La tabla public.liquidaciones debe crearse
              antes de activar este flujo.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}