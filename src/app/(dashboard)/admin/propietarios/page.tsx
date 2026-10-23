import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PropietarioForm } from "./form";
import { PropietariosTable } from "./table";

export const metadata = { title: "Propietarios" };

export default async function AdminPropietariosPage() {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("propietarios")
    .select("id, rut, nombres, apellidos, telefono, email, direccion, estado")
    .order("creado_en", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propietarios</h1>
        <p className="text-sm text-muted-foreground">Gestión de propietarios.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Listado</CardTitle>
          <PropietarioForm
            mode="crear"
            trigger={<Button>Agregar propietario</Button>}
          />
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-500">{error.message}</p>
          ) : (
            <PropietariosTable data={(data || []) as unknown as any /* eslint-disable-line @typescript-eslint/no-explicit-any */} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
