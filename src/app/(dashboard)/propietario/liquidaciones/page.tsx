import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Mis liquidaciones",
};

export default async function PropietarioLiquidacionesPage() {
  await requerirRol(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR);

  // TODO: consultar public.liquidaciones filtrando por el propietario vinculado al
  //       usuario autenticado (join con public.propietarios.user_id) y mostrar
  //       periodo, arriendo bruto, gastos, comisión, neto y estado de aprobación.
  //       Ver diseño tentativo en supabase/02_roles_extension.sql.
  const liquidaciones: unknown[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Detalle mensual de los ingresos y gastos de tus propiedades.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de liquidaciones</CardTitle>
          <CardDescription>
            Las liquidaciones se generan mensualmente y son aprobadas por NEXO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liquidaciones.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {/* TODO: listado por periodo con desglose de gastos comunes y comisión. */}
              Aún no hay liquidaciones publicadas.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}