import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContratoForm } from "./form";
import { ContratosTable } from "./table";

export const metadata = { title: "Contratos" };

export default async function AdminContratosPage() {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const [{ data: contratos, error }, { data: props }, { data: arr }] =
    await Promise.all([
      supabase
        .from("contratos")
        .select(
          "id,propiedad_id,arrendatario_id,fecha_inicio,fecha_termino,valor_arriendo,garantia_meses,dia_vencimiento,comision_porcentaje,estado,propiedades(nombre),arrendatarios(nombres,apellidos)"
        )
        .order("creado_en", { ascending: false }),
      supabase.from("propiedades").select("id,nombre").order("nombre"),
      supabase
        .from("arrendatarios")
        .select("id,rut,nombres,apellidos")
        .order("creado_en", { ascending: false }),
    ]);

  const options = { props: props ?? [], arr: arr ?? [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
        <p className="text-sm text-muted-foreground">Gestión de contratos de arriendo.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Listado</CardTitle>
          <ContratoForm
            mode="crear"
            trigger={<Button>Agregar contrato</Button>}
            options={options}
          />
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-500">{error.message}</p>
          ) : (
            <ContratosTable data={(contratos ?? []) as Parameters<typeof ContratosTable>[0]["data"]} options={options} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
