import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropiedadForm } from "./form";
import { PropiedadesTable, type FilaPropiedad } from "./table";

export const metadata: Metadata = {
  title: "Propiedades",
};

export default async function AdminPropiedadesPage() {
  // Solo ADMINISTRADOR (el Proxy ya lo bloquea).
  await exigirRol(ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  const [propiedadesRes, propietariosRes] = await Promise.all([
    supabase
      .from("propiedades")
      .select("id, propietario_id, nombre, direccion, comuna, region, tipo, estado, superficie_m2, habitaciones, banos, estacionamientos, valor_arriendo, propietarios(nombres, apellidos)")
      .order("creado_en", { ascending: false }),
    supabase.from("propietarios").select("id, nombres, apellidos").order("nombres"),
  ]);

  const propietarios = (propietariosRes.data ?? []).map((p) => ({
    id: p.id,
    nombre: `${p.nombres} ${p.apellidos}`,
  }));

  // El join propietarios(nombres, apellidos) no infiere porque la tabla
  // propiedades no declara Relationships en database.types.ts.
  const crudas = (propiedadesRes.data ?? []) as unknown as {
    id: string;
    propietario_id: string;
    nombre: string | null;
    direccion: string;
    comuna: string | null;
    region: string | null;
    tipo: string;
    estado: string;
    superficie_m2: number | null;
    habitaciones: number | null;
    banos: number | null;
    estacionamientos: number | null;
    valor_arriendo: number;
    propietarios: { nombres: string; apellidos: string } | null;
  }[];

  const filas: FilaPropiedad[] = crudas.map((p) => ({
    id: p.id,
    propietario_id: p.propietario_id,
    nombre: p.nombre,
    direccion: p.direccion,
    comuna: p.comuna,
    region: p.region,
    tipo: p.tipo,
    estado: p.estado,
    superficie_m2: p.superficie_m2,
    habitaciones: p.habitaciones,
    banos: p.banos,
    estacionamientos: p.estacionamientos,
    valor_arriendo: Number(p.valor_arriendo),
    propietario_nombre: p.propietarios
      ? `${p.propietarios.nombres} ${p.propietarios.apellidos}`
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
        <p className="text-sm text-muted-foreground">
          Cartera completa administrada por la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Listado</CardTitle>
          <PropiedadForm
            mode="crear"
            propietarios={propietarios}
            trigger={<Button>Agregar propiedad</Button>}
          />
        </CardHeader>
        <CardContent>
          {propiedadesRes.error ? (
            <p className="py-8 text-center text-sm text-red-500">{propiedadesRes.error.message}</p>
          ) : filas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay propiedades registradas.
            </p>
          ) : (
            <PropiedadesTable data={filas} propietarios={propietarios} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
