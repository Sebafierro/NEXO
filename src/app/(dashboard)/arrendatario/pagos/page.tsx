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
  title: "Historial de pagos",
};

export const dynamic = "force-dynamic";

type PagoArrendatario = {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  referencia: string | null;
  obligaciones: {
    tipo: string;
    fecha_vencimiento: string;
  } | null;
};

export default async function ArrendatarioPagosPage() {
  await requerirRol(ROLES.ARRENDATARIO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  // RLS: el ARRENDATARIO solo ve pagos de sus propias obligaciones.
  const { data, error } = await supabase
    .from("pagos")
    .select("id, monto, fecha_pago, metodo_pago, referencia, obligaciones(tipo, fecha_vencimiento)")
    .order("fecha_pago", { ascending: false })
    .limit(50);

  const pagos = (data ?? []) as unknown as PagoArrendatario[];
  const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial de pagos</h1>
        <p className="text-sm text-muted-foreground">
          Pagos registrados a tus obligaciones, del más reciente al más antiguo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pagos.length} pagos registrados</CardTitle>
          <CardDescription>
            Total pagado en el historial: {formatearMoneda(totalPagado)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error || pagos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {error?.message ?? "Aún no tienes pagos registrados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatearFecha(p.fecha_pago)}</TableCell>
                    <TableCell className="font-medium">
                      {p.obligaciones?.tipo.toLowerCase().replaceAll("_", " ") ?? "—"}
                      {p.referencia ? (
                        <p className="text-xs font-normal text-muted-foreground">
                          Ref. {p.referencia}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {p.metodo_pago?.toLowerCase().replaceAll("_", " ") ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatearMoneda(Number(p.monto))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {/* TODO: descarga de comprobante (documentos tipo COMPROBANTE_PAGO del bucket
                "respaldos") y filtrado por rango de fechas. */}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}