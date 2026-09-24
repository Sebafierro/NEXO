import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/format";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Mi resumen",
};

export default async function PropietarioDashboardPage() {
  const supabase = await createClient();

  // RLS filtra automáticamente: solo propiedades vinculadas al usuario autenticado.
  const { data: propiedades } = await supabase
    .from("propiedades")
    .select("estado, valor_arriendo");

  const total = propiedades?.length ?? 0;
  const arrendadas = propiedades?.filter((p) => p.estado === "ARRENDADA").length ?? 0;
  const disponibles = propiedades?.filter((p) => p.estado === "DISPONIBLE").length ?? 0;
  const flujoEsperado =
    propiedades?.reduce((acc, p) => acc + Number(p.valor_arriendo), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi cartera</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tus propiedades. El resto de la cartera no es visible para ti.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{total}</CardTitle>
            <CardDescription>Propiedades a tu nombre</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{arrendadas}</CardTitle>
            <CardDescription>Arrendadas</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{disponibles}</CardTitle>
            <CardDescription>Disponibles</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {formatearMoneda(flujoEsperado)}
            </CardTitle>
            <CardDescription>Arriendo esperado / mes</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        {/* TODO: mostrar obligaciones vencidas, contratos y documentos por propiedad */}
        Próximamente: detalle de contratos, obligaciones y respaldos.
      </p>
    </div>
  );
}