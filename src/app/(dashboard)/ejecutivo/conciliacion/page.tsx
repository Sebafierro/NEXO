import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { calcularSemaforo } from "@/lib/conciliacion";
import { hayMora } from "@/lib/obligaciones";
import type { EstadoObligacion } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConciliacionTabla, type FilaConciliacion } from "./conciliacion-tabla";
import { PagosPendientes } from "./pagos-pendientes";
import { GenerarObligaciones } from "./generar-obligaciones";
import { urlFirmada } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Conciliación de pagos",
};

export const dynamic = "force-dynamic";

type ObligacionCruda = {
  id: string;
  contrato_id: string;
  tipo: string;
  monto: number;
  monto_pagado: number;
  saldo: number;
  estado: string;
  fecha_vencimiento: string;
  contratos: { propiedades: { nombre: string | null } | null } | null;
};

export default async function EjecutivoConciliacionPage() {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();
  const hoy = new Date();

  const { data: pagosPendientes } = await supabase
    .from("pagos")
    .select("id, monto, fecha_pago, metodo_pago, referencia, estado_validacion, documento_id, documentos(archivo_url, nombre), obligaciones(id, tipo, periodo, contrato_id)")
    .eq("estado_validacion", "PENDIENTE")
    .order("fecha_pago", { ascending: false });

  // El bucket es privado: se firma una URL temporal para cada comprobante.
  const pagosPendientesConUrl = await Promise.all(
    (pagosPendientes ?? []).map(async (p) => {
      const doc = p.documentos as { archivo_url?: string | null; nombre?: string | null } | null;
      const url = await urlFirmada(supabase, doc?.archivo_url ?? null);
      return { ...p, documentos: doc ? { ...doc, archivo_url: url } : null };
    }),
  );

  // Obligaciones del mes en curso + cualquier saldo vencido de meses previos.
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from("obligaciones")
    .select(
      "id, contrato_id, tipo, monto, monto_pagado, saldo, estado, fecha_vencimiento, contratos(propiedades(nombre))"
    )
    .or(`fecha_vencimiento.gte.${inicioMes},and(saldo.gt.0,fecha_vencimiento.lt.${inicioMes})`)
    .order("fecha_vencimiento", { ascending: true })
    .limit(100);

  const crudas = (data ?? []) as unknown as ObligacionCruda[];

  // Semaforo por contrato (M2-7): se agrupan las obligaciones de cada contrato
  // y se calcula con el motor de src/lib/conciliacion.ts.
  const porContrato = new Map<string, ObligacionCruda[]>();
  for (const o of crudas) {
    const lista = porContrato.get(o.contrato_id) ?? [];
    lista.push(o);
    porContrato.set(o.contrato_id, lista);
  }
  const semaforoPorContrato = new Map(
    [...porContrato.entries()].map(([contratoId, obligaciones]) => [
      contratoId,
      calcularSemaforo(
        obligaciones.map((o) => ({
          monto: Number(o.monto),
          montoPagado: Number(o.monto_pagado),
          estado: o.estado as EstadoObligacion,
          fechaVencimiento: o.fecha_vencimiento,
        })),
        hoy
      ),
    ])
  );

  const filas: FilaConciliacion[] = crudas.map((o) => {
    const saldo = Number(o.saldo);
    const enMora = hayMora(
      {
        estado: o.estado as EstadoObligacion,
        fechaVencimiento: o.fecha_vencimiento,
        saldo,
      },
      hoy
    );
    return {
      id: o.id,
      tipo: o.tipo,
      monto: Number(o.monto),
      montoPagado: Number(o.monto_pagado),
      saldo,
      // Defensiva: si el cron no corrio, la mora se refleja al leer.
      estado: enMora && o.estado !== "VENCIDA" && o.estado !== "PAGADA" ? "VENCIDA" : o.estado,
      fechaVencimiento: o.fecha_vencimiento,
      propiedad: o.contratos?.propiedades?.nombre ?? null,
      semaforo: semaforoPorContrato.get(o.contrato_id) ?? "VERDE",
    };
  });

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
          <CardTitle>Generar obligaciones del mes</CardTitle>
          <CardDescription>
            Crea las obligaciones (arriendo + servicios) de los contratos vigentes para el
            periodo. Es idempotente: no duplica las existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerarObligaciones />
        </CardContent>
      </Card>

      <PagosPendientes pagos={pagosPendientesConUrl as Parameters<typeof PagosPendientes>[0]["pagos"]} />

      <Card>
        <CardHeader>
          <CardTitle>Pagos por conciliar</CardTitle>
          <CardDescription>
            Obligaciones del mes en curso y saldos vencidos. Registra pagos y concilia:
            el saldo y el estado se recalculan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-red-500">{error.message}</p>
          ) : filas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay obligaciones para conciliar en este periodo.
            </p>
          ) : (
            <ConciliacionTabla data={filas} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
