import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { SubirComprobanteArrendatario } from "./subir-comprobante-arrendatario";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pagos",
};

export const dynamic = "force-dynamic";

type PagoArrendatario = {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  referencia: string | null;
  estado_validacion: string | null;
  obligaciones: {
    tipo: string;
    fecha_vencimiento: string | null;
    periodo: string | null;
  } | null;
};

export default async function ArrendatarioPagosPage() {
  await exigirRol(ROLES.ARRENDATARIO);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pagos")
    .select("id, monto, fecha_pago, metodo_pago, referencia, estado_validacion, obligaciones(tipo, fecha_vencimiento, periodo)")
    .order("fecha_pago", { ascending: false })
    .limit(50);

  const pagos = (data ?? []) as unknown as PagoArrendatario[];
  const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);

  const { data: obligaciones } = await supabase
    .from("obligaciones")
    .select("id, tipo, periodo, monto, saldo, estado, fecha_vencimiento, contrato_id")
    .in("estado", ["PENDIENTE", "PAGO_PARCIAL", "VENCIDA", "ATRASADA"])
    .order("fecha_vencimiento", { ascending: true });

  // El recibo de saldo se habilita cuando TODAS las obligaciones del contrato
  // están saldadas. Por eso el contrato se resuelve desde la ficha del
  // arrendatario (no desde las obligaciones pendientes, que estarían vacías
  // precisamente cuando el período está saldado) y luego se revisa el estado
  // de todas las obligaciones de ese contrato.
  const { data: session } = await supabase.auth.getUser();
  const { data: ficha } = await supabase
    .from("arrendatarios")
    .select("id")
    .eq("user_id", session.user?.id || "")
    .maybeSingle();

  let sinDeuda = false;
  let contratoId: string | null = null;
  if (ficha?.id) {
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id")
      .eq("arrendatario_id", ficha.id);
    const contratoIds = (contratos || []).map((c) => c.id);
    if (contratoIds.length > 0) {
      const { data: obligacionesCheck } = await supabase
        .from("obligaciones")
        .select("id, estado, saldo")
        .in("contrato_id", contratoIds)
        .limit(500);
      const lista = obligacionesCheck || [];
      sinDeuda = lista.every((o) => Number(o.saldo || 0) <= 0 || o.estado === "PAGADA");
      contratoId = contratoIds[0];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Sube tu comprobante de pago; el Ejecutivo lo verificará contra la cartola bancaria.
        </p>
      </div>

      {sinDeuda && contratoId ? (
        <Card>
          <CardHeader>
            <CardTitle>Recibo período saldado</CardTitle>
            <CardDescription>Período Saldado sin Deuda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild>
              <a href="/api/arrendatario/recibo-saldado/generar" target="_blank" rel="noopener noreferrer">
                Generar y descargar comprobante
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Habilitado cuando no existen obligaciones pendientes.</p>
          </CardContent>
        </Card>
      ) : null}

      <SubirComprobanteArrendatario obligaciones={obligaciones ?? []} />

      <Card>
        <CardHeader>
          <CardTitle>{pagos.length} pagos</CardTitle>
          <CardDescription>
            Total registrado: {formatearMoneda(totalPagado)}
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
                  <TableHead>Estado</TableHead>
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
                    <TableCell>
                      <Badge variant={p.estado_validacion === "VALIDADO" ? "default" : p.estado_validacion === "RECHAZADO" ? "destructive" : "secondary"}>
                        {p.estado_validacion || "PENDIENTE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatearMoneda(Number(p.monto))}</TableCell>
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
