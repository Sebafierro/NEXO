import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Generar liquidaciones",
};

export default async function EjecutivoLiquidacionesPage() {
  await requerirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  // TODO: generar el cierre de periodo por propietario una vez exista
  //       public.liquidaciones (periodo, propietario_id, arriendo_bruto, gastos,
  //       comision, neto, estado). Ver diseño tentativo en
  //       supabase/02_roles_extension.sql.
  const periodos: unknown[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generar Liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Cierra el periodo, calcula el neto por propietario y envíalo a aprobación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periodos por liquidar</CardTitle>
          <CardDescription>
            El módulo de liquidaciones todavía no está disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {/* TODO: selector de periodo + botón "Generar", que inserte una
                  liquidación por propietario con estado 'GENERADA' para que el
                  ADMINISTRADOR la apruebe en /admin/liquidaciones. */}
              No hay periodos abiertos. Requiere crear la tabla public.liquidaciones.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}