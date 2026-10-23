import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerarLiquidaciones } from "./generar-liquidaciones";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatearMoneda } from "@/lib/format";

export const metadata: Metadata = {
  title: "Generar liquidaciones",
};

export const dynamic = "force-dynamic";

type LiquidacionFila = {
  id: string;
  periodo: string | null;
  arriendo_bruto: number | null;
  gastos: number | null;
  comision: number | null;
  neto: number | null;
  estado: string;
  propietarios: { nombres: string | null; apellidos: string | null } | null;
};

export default async function EjecutivoLiquidacionesPage() {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id, periodo, arriendo_bruto, gastos, comision, neto, estado, pdf_url, creado_en, propietarios(nombres, apellidos)")
    .order("periodo", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generar liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Generación de liquidaciones por periodo a partir de las obligaciones conciliadas. Solo habilitado en estado verde (contratos vigentes con obligaciones pagadas/validadas).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar por periodo</CardTitle>
          <CardDescription>
            Selecciona el periodo. Se generarán liquidaciones para contratos vigentes con todas sus obligaciones del periodo pagadas/validadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerarLiquidaciones />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones generadas</CardTitle>
          <CardDescription>Listado de periodos por liquidar/estados. Pendientes de aprobación por Administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          {(liquidaciones || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay liquidaciones generadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Arriendo bruto</TableHead>
                  <TableHead>Gastos</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(liquidaciones || []).map((l: LiquidacionFila) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.periodo?.slice(0, 7)}</TableCell>
                    <TableCell>{l.propietarios?.nombres} {l.propietarios?.apellidos}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.arriendo_bruto))}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.gastos))}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.comision))}</TableCell>
                    <TableCell className="font-medium">{formatearMoneda(Number(l.neto))}</TableCell>
                    <TableCell><Badge variant={l.estado === "APROBADA" ? "default" : l.estado === "RECHAZADA" ? "destructive" : "secondary"}>{l.estado}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
