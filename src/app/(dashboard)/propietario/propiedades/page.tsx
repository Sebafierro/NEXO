import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Mis propiedades",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ARRENDADA: "Arrendada",
  EN_MANTENIMIENTO: "En mantención",
  INACTIVA: "Inactiva",
};

export default async function PropietarioPropiedadesPage() {
  const supabase = await createClient();

  // RLS: solo las propiedades vinculadas al usuario autenticado.
  const { data: propiedades } = await supabase
    .from("propiedades")
    .select("id, nombre, direccion, comuna, estado, valor_arriendo");

  if (!propiedades || propiedades.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis propiedades</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no tienes propiedades vinculadas a tu cuenta.
            {/* TODO: botón "Agregar propiedad" para el propietario */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis propiedades</h1>
        <p className="text-sm text-muted-foreground">
          Detalle de tu cartera inmobiliaria.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {propiedades.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {p.nombre ?? "Sin nombre"}
                </CardTitle>
                <Badge variant="outline">{ETIQUETA_ESTADO[p.estado] ?? p.estado}</Badge>
              </div>
              <CardDescription>
                {p.direccion}
                {p.comuna ? `, ${p.comuna}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatearMoneda(Number(p.valor_arriendo))}</p>
              <p className="text-xs text-muted-foreground">Arriendo mensual</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}