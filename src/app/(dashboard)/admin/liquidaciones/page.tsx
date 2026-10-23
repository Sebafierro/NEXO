import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMoneda } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { aprobarLiquidacion, rechazarLiquidacion, aprobarLiquidacionesLote, rechazarLiquidacionesLote } from "./actions";

export const metadata: Metadata = {
  title: "Aprobación de liquidaciones",
};

export const dynamic = "force-dynamic";

export default async function AdminLiquidacionesPage() {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { data: liquidaciones } = await supabase
    .from("liquidaciones")
    .select("id, periodo, arriendo_bruto, gastos, comision, neto, estado, observaciones, propietarios(nombres, apellidos)")
    .eq("estado", "GENERADA")
    .order("periodo", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprobación de liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y aprueba las liquidaciones generadas por el equipo ejecutivo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones pendientes de aprobación</CardTitle>
          <CardDescription>Vista consolidada de liquidaciones 'Pendiente de Aprobación'.</CardDescription>
        </CardHeader>
        <CardContent>
          {(liquidaciones || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay liquidaciones por aprobar.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <form action={aprobarLiquidacionesLote} id="aprobar-lote-form">
                  <Button type="submit" size="sm">Aprobar seleccionadas</Button>
                </form>
                <form action={rechazarLiquidacionesLote} id="rechazar-lote-form" className="flex items-center gap-2">
                  <input name="observaciones" placeholder="Motivo de rechazo (obligatorio)" className="border rounded px-2 py-1 text-sm" required />
                  <Button type="submit" size="sm" variant="destructive">Rechazar seleccionadas</Button>
                </form>
                <span className="text-xs text-muted-foreground">Selecciona con los checkboxes</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Sel.</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Arriendo bruto</TableHead>
                    <TableHead>Gastos</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>Neto</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(liquidaciones || []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <input type="checkbox" name="ids" value={l.id} form="aprobar-lote-form" />
                        <input type="checkbox" name="ids" value={l.id} form="rechazar-lote-form" />
                      </TableCell>
                      <TableCell>{l.periodo?.slice(0, 7)}</TableCell>
                      <TableCell>{l.propietarios?.nombres} {l.propietarios?.apellidos}</TableCell>
                      <TableCell>{formatearMoneda(Number(l.arriendo_bruto))}</TableCell>
                      <TableCell>{formatearMoneda(Number(l.gastos))}</TableCell>
                      <TableCell>{formatearMoneda(Number(l.comision))}</TableCell>
                      <TableCell className="font-medium">{formatearMoneda(Number(l.neto))}</TableCell>
                      <TableCell className="space-x-2">
                        <form action={async () => { "use server"; await aprobarLiquidacion(l.id); }} className="inline">
                          <Button size="sm" type="submit">Aprobar</Button>
                        </form>
                        <form action={async (fd: FormData) => { "use server"; const obs = fd.get("obs")?.toString() || ""; await rechazarLiquidacion(l.id, obs); }} className="inline space-x-1">
                          <input name="obs" placeholder="Motivo rechazo" className="border rounded px-2 py-1 text-sm" required />
                          <Button size="sm" variant="destructive" type="submit">Rechazar</Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
