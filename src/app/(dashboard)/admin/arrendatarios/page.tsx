import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrendatarioForm } from "./form";
import { ArrendatariosTable } from "./table";

export const metadata = { title: "Arrendatarios" };

export default async function AdminArrendatariosPage() {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();
  const { data, error } = await supabase.from("arrendatarios").select("id,rut,nombres,apellidos,telefono,email,direccion,estado").order("creado_en",{ascending:false});
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Arrendatarios</h1><p className="text-sm text-muted-foreground">Gestión de arrendatarios.</p></div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Listado</CardTitle>
          <ArrendatarioForm mode="crear" trigger={<Button>Agregar arrendatario</Button>}/>
        </CardHeader>
        <CardContent>{error? <p className="text-sm text-red-500">{error.message}</p>: <ArrendatariosTable data={data||[]}/>}</CardContent>
      </Card>
    </div>
  );
}
