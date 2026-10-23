import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CuentaServicioForm } from "./form";
import { CuentasServiciosTable } from "./table";

export const metadata = { title: "Cuentas de Servicios" };

export default async function AdminCuentasServiciosPage() {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO);
  const supabase = await createClient();

  const [{ data: cuentas, error }, { data: props }] = await Promise.all([
    supabase
      .from("cuentas_servicios")
      .select(
        "id,propiedad_id,tipo_servicio,empresa,numero_cliente,numero_cuenta,monto_mensual,activo,propiedades(nombre)"
      )
      .order("creado_en", { ascending: false }),
    supabase.from("propiedades").select("id,nombre").order("nombre"),
  ]);

  const options = { props: props ?? [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cuentas de Servicios</h1>
        <p className="text-sm text-muted-foreground">
          Cuentas de servicios asociadas a cada propiedad.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Listado</CardTitle>
          <CuentaServicioForm
            mode="crear"
            trigger={<Button>Agregar cuenta</Button>}
            options={options}
          />
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-500">{error.message}</p>
          ) : (
            <CuentasServiciosTable data={(cuentas ?? []) as unknown as any /* eslint-disable-line @typescript-eslint/no-explicit-any */} options={options} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
