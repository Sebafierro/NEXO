import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Mi portal",
};

export const dynamic = "force-dynamic";

type ObligacionArrendatario = {
  id: string;
  tipo: string;
  descripcion: string | null;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  contratos: {
    valor_arriendo: number;
    propiedades: { direccion: string; comuna: string | null } | null;
  } | null;
};

export default async function ArrendatarioPortalPage() {
  await requerirRol(ROLES.ARRENDATARIO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  // El filtro por user_id obedece a la RLS "arrendatario_ver_propia" (obligaciones
  // de los contratos donde arrendatarios.user_id = auth.uid()).
  const { data, error } = await supabase
    .from("obligaciones")
    .select(
      "id, tipo, descripcion, monto, fecha_vencimiento, estado, contratos(valor_arriendo, propiedades(direccion, comuna))"
    )
    .in("estado", ["PENDIENTE", "ATRASADA"])
    .order("fecha_vencimiento", { ascending: true });

  const obligaciones = (data ?? []) as unknown as ObligacionArrendatario[];

  const totalAPagar = obligaciones.reduce((acc, o) => acc + Number(o.monto), 0);
  const atrasadas = obligaciones.filter((o) => o.estado === "ATRASADA");
  const montoAtrasado = atrasadas.reduce((acc, o) => acc + Number(o.monto), 0);
  const fechas = obligaciones.map((o) => o.fecha_vencimiento).sort();
  const fechaLimite = fechas.length > 0 ? fechas[fechas.length - 1] : null;
  const diasRestantes = fechaLimite
    ? Math.ceil(
        (new Date(fechaLimite).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000
      )
    : null;

  const contrato = obligaciones[0]?.contratos ?? null;
  const direccion = contrato?.propiedades;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Portal</h1>
        <p className="text-sm text-muted-foreground">
          {direccion
            ? `${direccion.direccion}${direccion.comuna ? `, ${direccion.comuna}` : ""}`
            : "Tus obligaciones y pagos como arrendatario."}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">{error.message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{formatearMoneda(totalAPagar)}</CardTitle>
            <CardDescription>Total a pagar del mes actual</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              {fechaLimite ? formatearFecha(fechaLimite) : "—"}
            </CardTitle>
            <CardDescription>Fecha límite de pago</CardDescription>
          </CardHeader>
          {diasRestantes !== null ? (
            <CardContent className="text-sm text-muted-foreground">
              {diasRestantes < 0
                ? `Venció hace ${Math.abs(diasRestantes)} día(s)`
                : diasRestantes === 0
                  ? "Vence hoy"
                  : `Faltan ${diasRestantes} día(s)`}
            </CardContent>
          ) : null}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-destructive">
              {formatearMoneda(montoAtrasado)}
            </CardTitle>
            <CardDescription>Monto atrasado</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {atrasadas.length} obligación(es) vencida(s).
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis obligaciones</CardTitle>
          <CardDescription>
            {contrato ? `Arriendo mensual: ${formatearMoneda(Number(contrato.valor_arriendo))}` : "Sin contratos vigentes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {obligaciones.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {/* TODO: verificar el vínculo arrendatarios.user_id <-> public.usuarios.
                  Si falta: UPDATE public.arrendatarios SET user_id = ... WHERE ... */}
              No tienes obligaciones pendientes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligaciones.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.descripcion ?? o.tipo.toLowerCase().replaceAll("_", " ")}
                    </TableCell>
                    <TableCell>{formatearFecha(o.fecha_vencimiento)}</TableCell>
                    <TableCell>
                      <Badge variant={o.estado === "ATRASADA" ? "destructive" : "secondary"}>
                        {o.estado === "ATRASADA" ? "Atrasada" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatearMoneda(Number(o.monto))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {/* TODO: botón de pago online (pasarela de pago) y descarga del comprobante
                de las obligaciones ya pagadas. */}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}