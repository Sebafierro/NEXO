import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Conciliación de pagos",
};

export const dynamic = "force-dynamic";

type ObligacionConPago = {
  id: string;
  tipo: string;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  pagos: { id: string; monto: number; fecha_pago: string; metodo_pago: string | null }[];
};

export default async function EjecutivoConciliacionPage() {
  await requerirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  // Obligaciones del mes en curso con sus pagos aplicados: base para el cruce.
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from("obligaciones")
    .select("id, tipo, monto, fecha_vencimiento, estado, pagos(monto, fecha_pago, metodo_pago)")
    .gte("fecha_vencimiento", inicioMes)
    .order("fecha_vencimiento", { ascending: true })
    .limit(20);

  const obligaciones = (data ?? []) as unknown as ObligacionConPago[];

  const saldo = (o: ObligacionConPago) =>
    Number(o.monto) - o.pagos.reduce((acc, p) => acc + Number(p.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conciliación</h1>
        <p className="text-sm text-muted-foreground">
          Cruza los pagos recibidos contra las obligaciones de cada contrato.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagos por conciliar</CardTitle>
          <CardDescription>
            Obligaciones del mes en curso con su saldo pendiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error || obligaciones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error?.message ?? "No hay obligaciones en el periodo actual."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obligación</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligaciones.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.tipo.toLowerCase().replaceAll("_", " ")}
                      <p className="text-xs font-normal text-muted-foreground">
                        {o.pagos.length === 0
                          ? "Sin pagos aplicados"
                          : `${o.pagos.length} pago(s): ${o.pagos
                              .map((p) => formatearFecha(p.fecha_pago))
                              .join(", ")}`}
                      </p>
                    </TableCell>
                    <TableCell>{formatearFecha(o.fecha_vencimiento)}</TableCell>
                    <TableCell>
                      <Badge variant={o.estado === "PAGADA" ? "outline" : "destructive"}>
                        {o.estado.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatearMoneda(Number(o.monto))}</TableCell>
                    <TableCell className="text-right">{formatearMoneda(saldo(o))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {/* TODO: registrar un pago con formulario (insert en public.pagos) y una
                acción "conciliado" que marque la obligación como PAGADA. */}
            {/* TODO: marcar automáticamente como ATRASADA toda obligación vencida
                (ver TODO de negocio en supabase/02_roles_extension.sql). */}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}