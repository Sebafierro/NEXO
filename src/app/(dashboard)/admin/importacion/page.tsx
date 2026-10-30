import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportacionMasivaForm } from "./importacion-form";

export const metadata: Metadata = {
  title: "Importación masiva",
};

export default async function AdminImportacionPage() {
  await exigirRol(ROLES.ADMINISTRADOR);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importación masiva</h1>
        <p className="text-sm text-muted-foreground">
          Importación Excel/CSV con validación por fila, previsualización y confirmación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar cartera</CardTitle>
          <CardDescription>
            Suba un archivo .xlsx o .csv. Se validarán las columnas requeridas, se mostrará una previsualización con errores por fila y se pedirá confirmación antes de importar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportacionMasivaForm />
        </CardContent>
      </Card>
    </div>
  );
}
