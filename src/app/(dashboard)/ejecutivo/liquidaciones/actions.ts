"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { generarLiquidacionesPeriodo } from "@/lib/liquidaciones";

export type ResultadoGenerarLiquidaciones = {
  ok: boolean;
  mensaje: string;
  creadas: number;
  omitidas: number;
  detalle: Array<{ contratoId: string; motivo: string }>;
};

export async function generarLiquidaciones(
  periodo: string,
): Promise<ResultadoGenerarLiquidaciones> {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  if (!periodo) {
    return { ok: false, mensaje: "Periodo requerido", creadas: 0, omitidas: 0, detalle: [] };
  }

  const resultado = await generarLiquidacionesPeriodo(periodo);

  revalidatePath("/ejecutivo/liquidaciones");
  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");

  const mensaje =
    resultado.creadas > 0
      ? `Se generaron ${resultado.creadas} liquidación(es)${resultado.omitidas > 0 ? `; ${resultado.omitidas} omitida(s)` : ""}.`
      : resultado.omitidas > 0
        ? `No se generó ninguna liquidación. ${resultado.omitidas} contrato(s) omitido(s).`
        : "No hay contratos vigentes para liquidar en el periodo.";

  return {
    ok: resultado.creadas > 0,
    mensaje,
    creadas: resultado.creadas,
    omitidas: resultado.omitidas,
    detalle: resultado.detalle,
  };
}
