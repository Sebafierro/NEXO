import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarRol, ROLES } from "@/lib/roles";
import { formatearMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Propiedades",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ARRENDADA: "Arrendada",
  EN_MANTENIMIENTO: "En mantención",
  INACTIVA: "Inactiva",
};

export default async function AdminPropiedadesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (normalizarRol(user?.app_metadata?.rol ?? user?.user_metadata?.rol) !== ROLES.ADMINISTRADOR) {
    redirect("/propietario");
  }

  const { data: propiedades, error } = await supabase
    .from("propiedades")
    .select("id, nombre, direccion, comuna, tipo, estado, valor_arriendo, propietarios(nombres, apellidos)")
    .order("creado_en", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
        <p className="text-sm text-muted-foreground">
          Cartera completa administrada por la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {error || !propiedades || propiedades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error?.message ?? "Aún no hay propiedades registradas."}
              {/* TODO: botón "Agregar propiedad" (formulario + upload de documentos) */}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Arriendo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propiedades.map((p) => {
                  const propietario = p.propietarios as unknown as
                    | { nombres: string; apellidos: string }
                    | undefined;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.nombre ?? "Sin nombre"}
                      </TableCell>
                      <TableCell>
                        {p.direccion}
                        {p.comuna ? `, ${p.comuna}` : ""}
                      </TableCell>
                      <TableCell>
                        {propietario
                          ? `${propietario.nombres} ${propietario.apellidos}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ETIQUETA_ESTADO[p.estado] ?? p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatearMoneda(Number(p.valor_arriendo))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}