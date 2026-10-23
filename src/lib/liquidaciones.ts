import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export const ESTADO_LIQUIDACION_GENERADA = "GENERADA";
export const ESTADO_LIQUIDACION_APROBADA = "APROBADA";
export const ESTADO_LIQUIDACION_RECHAZADA = "RECHAZADA";
export const ESTADO_LIQUIDACION_PAGADA = "PAGADA";

export const TIPO_ITEM_ARRIENDO = "ARRIENDO";
export const TIPO_ITEM_COMISION = "COMISION";
export const TIPO_ITEM_REPARACION = "REPARACION";
export const TIPO_ITEM_REEMBOLSO = "REEMBOLSO";
export const TIPO_ITEM_GASTO_COMUN = "GASTO_COMUN";
export const TIPO_ITEM_SERVICIO = "SERVICIO";
export const TIPO_ITEM_OTRO = "OTRO";

type ContratoLiquidable = {
  id: string;
  valor_arriendo?: number | null;
  comision_porcentaje?: number | null;
  propietario_id?: { propietario_id?: string | null } | null;
};

export type ObligacionPeriodo = {
  monto?: number | null;
  monto_pagado?: number | null;
  estado?: string | null;
  saldo?: number | null;
};

type GastoPeriodo = {
  monto?: number | null;
  tipo?: string | null;
};

export type ResultadoCalculoNeto = {
  arriendoBruto: number;
  comision: number;
  gastos: number;
  reembolsos: number;
  neto: number;
};

/**
 * Regla de cierre (M4, issue 2):
 *   neto = arriendo_bruto - comision - reparaciones + reembolsos
 * La comisión se deriva del porcentaje fijo pactado en el contrato.
 */
export function calcularNetoLiquidacion(input: {
  arriendoBruto: number;
  comisionPorcentaje: number;
  gastos?: number;
  reembolsos?: number;
}): ResultadoCalculoNeto {
  const arriendoBruto = Number(input.arriendoBruto || 0);
  const comisionPorcentaje = Number(input.comisionPorcentaje || 0);
  const comision = (arriendoBruto * comisionPorcentaje) / 100;
  const gastos = Number(input.gastos || 0);
  const reembolsos = Number(input.reembolsos || 0);

  return {
    arriendoBruto,
    comision,
    gastos,
    reembolsos,
    neto: arriendoBruto - comision - gastos + reembolsos,
  };
}

/**
 * Readiness (M4, issue 2): una obligación del periodo se considera cerrada
 * cuando está PAGADA o su saldo es <= 0. Cualquier otra obligación bloquea
 * la generación (el periodo no está en "estado verde").
 */
export function esPeriodoEnVerde(obligaciones: ObligacionPeriodo[]): boolean {
  if (!obligaciones || obligaciones.length === 0) return false;
  return obligaciones.every((o) => {
    const saldo = Number(o.saldo ?? (Number(o.monto || 0) - Number(o.monto_pagado || 0)));
    return o.estado === "PAGADA" || saldo <= 0;
  });
}

// Documento asociado al contrato/periodo que debe estar validado para cerrar.
export type DocumentoPeriodo = {
  id: string;
  estado?: string | null;
  tipo_documento?: string | null;
};

/**
 * Readiness documental (M4, PROJECT_SCOPE §10.5): las boletas de servicio del
 * periodo deben estar VALIDADAS antes de liquidar. Un documento en estado
 * PENDIENTE/EXTRAIDO/RECHAZADO bloquea el cierre. Si no existen boletas para el
 * contrato, no se bloquea (no aplica exigir validación de lo que no existe).
 */
export function documentosListosParaLiquidar(documentos: DocumentoPeriodo[]): {
  listo: boolean;
  pendientes: number;
} {
  const boletas = (documentos || []).filter(
    (d) => d.tipo_documento === "BOLETA_SERVICIO",
  );
  const pendientes = boletas.filter((d) => d.estado !== "VALIDADO").length;
  return { listo: pendientes === 0, pendientes };
}


/**
 * Normaliza el período "YYYY-MM" al rango de fechas que usa la tabla
 * liquidaciones (primer día del mes) y al intervalo de vencimiento de las
 * obligaciones del mes.
 */
export function resolverRangoPeriodo(periodo: string): { inicio: string; fin: string } {
  const [anio, mes] = periodo.split("-").map((n) => Number(n));
  const base = new Date(anio, mes - 1, 1);
  const inicio = new Date(Date.UTC(base.getFullYear(), base.getMonth(), 1)).toISOString().slice(0, 10);
  const fin = new Date(Date.UTC(base.getFullYear(), base.getMonth() + 1, 0)).toISOString().slice(0, 10);
  return { inicio, fin };
}

export type ResultadoGeneracion = {
  creadas: number;
  omitidas: number;
  detalle: Array<{ contratoId: string; motivo: string }>;
};

export async function generarLiquidacionesPeriodo(periodo: string): Promise<ResultadoGeneracion> {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { inicio, fin } = resolverRangoPeriodo(periodo);

  const { data: contratos } = await supabase
    .from("contratos")
    .select("id, valor_arriendo, comision_porcentaje, estado, propiedad_id, propietario_id:propiedades(propietario_id)")
    .eq("estado", "VIGENTE");

  const creadas: unknown[] = [];
  const detalle: ResultadoGeneracion["detalle"] = [];
  let omitidas = 0;

  for (const fila of contratos || []) {
    const contrato = fila as unknown as ContratoLiquidable;
    const contratoId = contrato.id;

    // Idempotencia: no duplicar liquidaciones ya generadas o aprobadas.
    const { data: existente } = await supabase
      .from("liquidaciones")
      .select("id, estado")
      .eq("contrato_id", contratoId)
      .gte("periodo", inicio)
      .lte("periodo", fin)
      .in("estado", [ESTADO_LIQUIDACION_GENERADA, ESTADO_LIQUIDACION_APROBADA])
      .limit(1);

    if (existente && existente.length > 0) {
      omitidas++;
      detalle.push({ contratoId, motivo: "Ya existe liquidación para el periodo" });
      continue;
    }

    const { data: obligaciones } = await supabase
      .from("obligaciones")
      .select("id, monto, monto_pagado, estado, saldo, fecha_vencimiento")
      .eq("contrato_id", contratoId)
      .gte("fecha_vencimiento", inicio)
      .lte("fecha_vencimiento", fin);

    if (!obligaciones || obligaciones.length === 0) {
      omitidas++;
      detalle.push({ contratoId, motivo: "Sin obligaciones en el periodo" });
      continue;
    }

    if (!esPeriodoEnVerde(obligaciones as ObligacionPeriodo[])) {
      omitidas++;
      detalle.push({ contratoId, motivo: "Periodo no está en estado verde (obligaciones pendientes)" });
      continue;
    }

    // Readiness documental: las boletas del periodo deben estar VALIDADAS.
    const obligacionIds = (obligaciones as Array<{ id: string }>).map((o) => o.id);
    const { data: documentosPeriodo } = await supabase
      .from("documentos")
      .select("id, estado, tipo_documento")
      .eq("entidad_tipo", "OBLIGACION")
      .in("entidad_id", obligacionIds);

    const readinessDocs = documentosListosParaLiquidar(
      (documentosPeriodo || []) as DocumentoPeriodo[],
    );
    if (!readinessDocs.listo) {
      omitidas++;
      detalle.push({
        contratoId,
        motivo: `Boletas del periodo sin validar (${readinessDocs.pendientes} pendiente(s))`,
      });
      continue;
    }

    const { gastos, reembolsos } = await obtenerGastosDelPeriodo(contratoId, inicio, fin);

    const calculo = calcularNetoLiquidacion({
      arriendoBruto: Number(contrato.valor_arriendo || 0),
      comisionPorcentaje: Number(contrato.comision_porcentaje || 0),
      gastos,
      reembolsos,
    });

    const propietarioId = contrato.propietario_id?.propietario_id;
    if (!propietarioId) {
      omitidas++;
      detalle.push({ contratoId, motivo: "Propiedad sin propietario asociado" });
      continue;
    }

    const { data: liquidacion, error } = await supabase
      .from("liquidaciones")
      .insert({
        periodo: inicio,
        contrato_id: contratoId,
        propietario_id: propietarioId,
        arriendo_bruto: calculo.arriendoBruto,
        gastos: calculo.gastos,
        comision: calculo.comision,
        neto: calculo.neto,
        estado: ESTADO_LIQUIDACION_GENERADA,
        generado_por: sesion.userId,
      })
      .select()
      .single();

    if (error || !liquidacion) {
      omitidas++;
      detalle.push({ contratoId, motivo: error?.message ?? "No se pudo insertar la liquidación" });
      continue;
    }

    const liquidacionId = (liquidacion as { id: string }).id;
    const items = construirItemsLiquidacion(liquidacionId, calculo, Number(contrato.comision_porcentaje || 0));

    const { error: errorItems } = await supabase.from("liquidacion_items").insert(items);
    if (errorItems) {
      // Atomicidad: si falla el detalle, la liquidación quedaría sin items y
      // el neto no sería trazable. Se revierte la liquidación para no dejar
      // un registro inconsistente.
      await supabase.from("liquidaciones").delete().eq("id", liquidacionId);
      omitidas++;
      detalle.push({ contratoId, motivo: `Error al crear el detalle: ${errorItems.message}` });
      continue;
    }

    creadas.push(liquidacion);
  }

  revalidatePath("/ejecutivo/liquidaciones");
  revalidatePath("/admin/liquidaciones");
  revalidatePath("/propietario/liquidaciones");

  return { creadas: creadas.length, omitidas, detalle };
}

export function construirItemsLiquidacion(
  liquidacionId: string,
  calculo: ResultadoCalculoNeto,
  comisionPorcentaje: number,
): Array<{ liquidacion_id: string; tipo: string; concepto: string; monto: number; signo: number }> {
  const items: Array<{ liquidacion_id: string; tipo: string; concepto: string; monto: number; signo: number }> = [
    {
      liquidacion_id: liquidacionId,
      tipo: TIPO_ITEM_ARRIENDO,
      concepto: "Arriendo bruto",
      monto: calculo.arriendoBruto,
      signo: 1,
    },
    {
      liquidacion_id: liquidacionId,
      tipo: TIPO_ITEM_COMISION,
      concepto: `Comisión ${comisionPorcentaje}%`,
      monto: calculo.comision,
      signo: -1,
    },
  ];

  if (calculo.gastos > 0) {
    items.push({
      liquidacion_id: liquidacionId,
      tipo: TIPO_ITEM_REPARACION,
      concepto: "Reparaciones/Gastos",
      monto: calculo.gastos,
      signo: -1,
    });
  }

  if (calculo.reembolsos > 0) {
    items.push({
      liquidacion_id: liquidacionId,
      tipo: TIPO_ITEM_REEMBOLSO,
      concepto: "Reembolsos",
      monto: calculo.reembolsos,
      signo: 1,
    });
  }

  return items;
}

/**
 * Los gastos/reparaciones/reembolsos son conceptos opcionales: solo se suman
 * si la tabla correspondiente existe en la base de datos. Si no existe, el
 * cierre se calcula con arriendo y comisión.
 */
async function obtenerGastosDelPeriodo(
  contratoId: string,
  inicio: string,
  fin: string,
): Promise<{ gastos: number; reembolsos: number }> {
  let gastos = 0;
  let reembolsos = 0;

  const consultar = async (tabla: string): Promise<GastoPeriodo[]> => {
    try {
      const cliente = (await import("@/lib/supabase/server")).createClient();
      const { data } = await (cliente as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              gte: (col: string, val: string) => {
                lte: (col: string, val: string) => Promise<{ data: unknown[] | null }>;
              };
            };
          };
        };
      })
        .from(tabla)
        .select("monto, tipo")
        .eq("contrato_id", contratoId)
        .gte("fecha", inicio)
        .lte("fecha", fin);
      return (data || []) as GastoPeriodo[];
    } catch {
      return [];
    }
  };

  for (const fila of await consultar("reparaciones")) {
    const monto = Number(fila.monto || 0);
    if (monto !== 0) gastos += monto;
  }

  for (const fila of await consultar("gastos")) {
    const monto = Number(fila.monto || 0);
    if (monto === 0) continue;
    if (fila.tipo === TIPO_ITEM_REEMBOLSO) reembolsos += monto;
    else gastos += monto;
  }

  return { gastos, reembolsos };
}
