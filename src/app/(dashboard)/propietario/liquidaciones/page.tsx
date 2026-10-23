import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatearMoneda } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Mis liquidaciones",
};

export const dynamic = "force-dynamic";

export default async function PropietarioLiquidacionesPage({
  searchParams,
}: {
  searchParams?: Promise<{ anio?: string; mes?: string; direccion?: string }>;
}) {
  await exigirRol(ROLES.PROPIETARIO);
  const supabase = await createClient();
  const params = (await searchParams) || {};

  let query = supabase
    .from("liquidaciones")
    .select("id, periodo, arriendo_bruto, gastos, comision, neto, estado, pdf_url, observaciones, contratos(propiedades(direccion))")
    .order("periodo", { ascending: false });

  if (params.anio) {
    const anio = params.anio;
    query = query.gte("periodo", `${anio}-01-01`).lte("periodo", `${anio}-12-31`);
  }
  if (params.mes && params.anio) {
    const mes = params.mes.padStart(2, "0");
    const start = `${params.anio}-${mes}-01`;
    const endDate = new Date(Number(params.anio), Number(params.mes), 0).toISOString().slice(0, 10);
    query = query.gte("periodo", start).lte("periodo", endDate);
  }

  const { data: liquidaciones } = await query;

  let filtered = liquidaciones || [];
  if (params.direccion) {
    const dirFiltro = params.direccion.toLowerCase();
    filtered = filtered.filter((l: any) => {
      const dir = l.contratos?.propiedades?.direccion?.toLowerCase() || "";
      return dir.includes(dirFiltro);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis liquidaciones</h1>
        <p className="text-sm text-muted-foreground">
          Historial cronológico (más reciente primero) de liquidaciones mensuales de tus propiedades.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra por año, mes o dirección</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="anio">Año</Label>
              <Input id="anio" name="anio" type="number" defaultValue={params.anio} placeholder="2025" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mes">Mes</Label>
              <Input id="mes" name="mes" type="number" min="1" max="12" defaultValue={params.mes} placeholder="1-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" name="direccion" defaultValue={params.direccion} placeholder="Filtrar por dirección" />
            </div>
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de liquidaciones</CardTitle>
          <CardDescription>
            Las liquidaciones se generan mensualmente y son aprobadas por NEXO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay liquidaciones publicadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Arriendo bruto</TableHead>
                  <TableHead>Gastos</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Descarga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.periodo?.slice(0, 7)}</TableCell>
                    <TableCell>{l.contratos?.propiedades?.direccion || "-"}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.arriendo_bruto))}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.gastos))}</TableCell>
                    <TableCell>{formatearMoneda(Number(l.comision))}</TableCell>
                    <TableCell className="font-medium">{formatearMoneda(Number(l.neto))}</TableCell>
                    <TableCell>
                      <Badge variant={l.estado === "APROBADA" ? "default" : l.estado === "RECHAZADA" ? "destructive" : "secondary"}>
                        {l.estado === "APROBADA" ? "APROBADA" : l.estado === "RECHAZADA" ? "RECHAZADA" : "En proceso"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {l.estado === "APROBADA" && l.pdf_url ? (
                        <Button asChild size="sm" variant="outline"><a href={`/api/liquidaciones/${l.id}/pdf`} target="_blank" rel="noopener noreferrer">Descargar PDF</a></Button>
                      ) : l.estado === "APROBADA" ? (
                        <span className="text-xs text-muted-foreground">PDF pendiente</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">En proceso</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos de respaldo</CardTitle>
          <CardDescription>Apartado de documentos de respaldo (solo lectura)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sin documentos adjuntos disponibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
