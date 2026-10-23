"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { validarPago, rechazarPago } from "./actions";

type Pago = {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  referencia: string | null;
  estado_validacion: string;
  documento_id: string | null;
  documentos: any;
  obligaciones: any;
};

export function PagosPendientes({ pagos }: { pagos: Pago[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleValidar(id: string) {
    setLoading(id);
    try {
      await validarPago(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  async function handleRechazar(id: string) {
    const motivo = prompt("Motivo de rechazo (opcional):");
    setLoading(id);
    try {
      await rechazarPago(id, motivo || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos pendientes de verificación</CardTitle>
        <CardDescription>Arrendatarios han subido comprobantes; verificar contra cartola bancaria.</CardDescription>
      </CardHeader>
      <CardContent>
        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pagos pendientes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha pago</TableHead>
                <TableHead>Obligación</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatearFecha(p.fecha_pago)}</TableCell>
                  <TableCell>
                    {p.obligaciones?.tipo?.toLowerCase().replaceAll("_", " ")} - {p.obligaciones?.periodo ? new Date(p.obligaciones.periodo).toLocaleDateString("es-CL", { month: "long", year: "numeric" }) : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.metodo_pago || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.documentos?.archivo_url ? (
                      <a href={p.documentos.archivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        Ver comprobante
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatearMoneda(Number(p.monto))}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" onClick={() => handleValidar(p.id)} disabled={loading === p.id}>Validar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRechazar(p.id)} disabled={loading === p.id}>Rechazar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
