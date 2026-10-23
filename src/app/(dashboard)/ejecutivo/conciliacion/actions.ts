"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { aplicarPago, estadoConciliacion, calcularDiferencia, montoPagadoAplicable } from "@/lib/conciliacion";
import { calcularEstadoTrasPago } from "@/lib/obligaciones";

const METODOS_PAGO = ["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "OTRO"];

export type ResultadoGeneracionObligaciones = {
  ok: boolean;
  mensaje: string;
  creadas?: number;
  omitidas?: number;
  contratos?: number;
};

// M2-1: genera las obligaciones del periodo (arriendo + servicios) para los
// contratos VIGENTES invocando la funcion SQL idempotente. Solo ADMIN/EJECUTIVO.
export async function generarObligaciones(
  periodo: string,
): Promise<ResultadoGeneracionObligaciones> {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const periodoNormalizado = /^\d{4}-\d{2}$/.test(periodo)
    ? `${periodo}-01`
    : periodo;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodoNormalizado)) {
    return { ok: false, mensaje: "Periodo inválido (usa YYYY-MM)" };
  }

  const { data, error } = await supabase.rpc("generar_obligaciones_periodo", {
    p_periodo: periodoNormalizado,
  });
  if (error) return { ok: false, mensaje: error.message };

  const resultado = (data ?? {}) as {
    creadas?: number;
    omitidas?: number;
    contratos?: number;
  };

  revalidatePath("/ejecutivo/conciliacion");
  revalidatePath("/arrendatario");
  revalidatePath("/arrendatario/pagos");
  revalidatePath("/admin");

  return {
    ok: true,
    mensaje: `Obligaciones generadas: ${resultado.creadas ?? 0} creadas, ${resultado.omitidas ?? 0} omitidas`,
    creadas: resultado.creadas ?? 0,
    omitidas: resultado.omitidas ?? 0,
    contratos: resultado.contratos ?? 0,
  };
}


type ObligacionRow = {
  id: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  fecha_vencimiento: string;
};

async function cargarObligacion(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await supabase
    .from("obligaciones")
    .select("id, monto, monto_pagado, estado, fecha_vencimiento")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Obligación no encontrada");
  return data as unknown as ObligacionRow;
}

// M2-4: registra un pago, lo aplica a la obligacion y deja la conciliacion
// cuando el monto no calza exactamente. El saldo y el estado se recalculan con
// el motor de src/lib/conciliacion.ts (regla 3 de PLAN-MVP.md).
export async function registrarPago(obligacionId: string, formData: FormData) {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const monto = Number(formData.get("monto"));
  const metodo = formData.get("metodo_pago")?.toString() || "TRANSFERENCIA";
  const referencia = formData.get("referencia")?.toString() || null;
  const fechaPago = formData.get("fecha_pago")?.toString().trim();

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }
  if (!METODOS_PAGO.includes(metodo)) {
    throw new Error("Método de pago inválido");
  }

  const obligacion = await cargarObligacion(supabase, obligacionId);

  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .insert({
      obligacion_id: obligacionId,
      monto,
      metodo_pago: metodo,
      referencia,
      ...(fechaPago ? { fecha_pago: new Date(`${fechaPago}T12:00:00`).toISOString() } : {}),
      registrado_por: sesion.userId,
      estado_validacion: "VALIDADO",
    })
    .select("id")
    .single();
  if (errorPago) throw new Error(errorPago.message);

  const resultado = aplicarPago(
    {
      monto: Number(obligacion.monto),
      montoPagado: Number(obligacion.monto_pagado),
      estado: obligacion.estado as Parameters<typeof aplicarPago>[0]["estado"],
      fechaVencimiento: obligacion.fecha_vencimiento,
    },
    monto
  );

  const { error: errorObligacion } = await supabase
    .from("obligaciones")
    .update({ monto_pagado: resultado.montoPagado, estado: resultado.estado })
    .eq("id", obligacionId);
  if (errorObligacion) throw new Error(errorObligacion.message);

  // Solo se deja traza en conciliaciones cuando el monto no calza exactamente.
  const estadoConc = estadoConciliacion(monto, Number(obligacion.monto));
  if (estadoConc === "CON_DIFERENCIA") {
    const { error: errorConc } = await supabase.from("conciliaciones").insert({
      pago_id: pago.id,
      obligacion_id: obligacionId,
      monto_aplicado: monto,
      diferencia: calcularDiferencia(monto, Number(obligacion.monto)),
      estado: "CON_DIFERENCIA",
      resuelto_por: sesion.userId,
      observacion: `Pago por ${monto} no calza con la obligación de ${Number(obligacion.monto)}`,
    });
    if (errorConc) throw new Error(errorConc.message);
  }

  revalidatePath("/ejecutivo/conciliacion");
}

// M2-5: recalcula la obligacion desde sus pagos (excluye RECHAZADO), actualiza
// monto_pagado/saldo/estado y deja traza en conciliaciones. audit_log se
// escribe via trigger (trg_audit_obligaciones en 05_ciclo_financiero.sql).
export async function conciliarObligacion(obligacionId: string, formData: FormData) {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const observacion = formData.get("observacion")?.toString() || null;
  const obligacion = await cargarObligacion(supabase, obligacionId);

  // Regla: se suman los pagos no RECHAZADOS (un pago rechazado no reduce saldo).
  const { data: pagos, error: errorPagos } = await supabase
    .from("pagos")
    .select("id, monto, estado_validacion")
    .eq("obligacion_id", obligacionId)
    .neq("estado_validacion", "RECHAZADO");
  if (errorPagos) throw new Error(errorPagos.message);

  const filas = pagos ?? [];
  const sumaPagos = filas.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const monto = Number(obligacion.monto);
  const estado = calcularEstadoTrasPago(monto, sumaPagos);

  const { error: errorUpdate } = await supabase
    .from("obligaciones")
    .update({ monto_pagado: montoPagadoAplicable(monto, sumaPagos), estado })
    .eq("id", obligacionId);
  if (errorUpdate) throw new Error(errorUpdate.message);

  // Trazabilidad: una conciliacion por el ultimo pago aplicado (pago_id es NOT
  // NULL en el esquema); sin pagos no hay cruce que registrar.
  const ultimo = filas[filas.length - 1];
  if (ultimo) {
    const dif = sumaPagos - monto;
    const { error: errorConc } = await supabase.from("conciliaciones").insert({
      pago_id: ultimo.id,
      obligacion_id: obligacionId,
      monto_aplicado: sumaPagos,
      diferencia: dif,
      estado: dif === 0 ? "CONCILIADO" : "CON_DIFERENCIA",
      resuelto_por: sesion.userId,
      observacion,
    });
    if (errorConc) throw new Error(errorConc.message);
  }

  revalidatePath("/ejecutivo/conciliacion");
}


export async function validarPago(pagoId: string) {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pagos")
    .update({ estado_validacion: "VALIDADO" })
    .eq("id", pagoId);
  if (error) throw new Error(error.message);

  const { data: pago } = await supabase
    .from("pagos")
    .select("obligacion_id")
    .eq("id", pagoId)
    .single();
  if (pago?.obligacion_id) {
    const { data: obligacion } = await supabase
      .from("obligaciones")
      .select("id")
      .eq("id", pago.obligacion_id)
      .single();
    if (obligacion) {
      const { data: pagos } = await supabase
        .from("pagos")
        .select("monto, estado_validacion")
        .eq("obligacion_id", obligacion.id)
        .neq("estado_validacion", "RECHAZADO");
      const suma = (pagos ?? []).reduce((acc, p: any) => acc + Number(p.monto || 0), 0);
      const { data: ob } = await supabase
        .from("obligaciones")
        .select("monto")
        .eq("id", obligacion.id)
        .single();
      const nuevoEstado = calcularEstadoTrasPago(Number(ob?.monto || 0), suma);
      await supabase
        .from("obligaciones")
        .update({ monto_pagado: montoPagadoAplicable(Number(ob?.monto || 0), suma), estado: nuevoEstado })
        .eq("id", obligacion.id);
    }
  }

  revalidatePath("/ejecutivo/conciliacion");
}

export async function rechazarPago(pagoId: string, motivo: string | null) {
  const sesion = await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pagos")
    .update({ estado_validacion: "RECHAZADO", motivo_rechazo: motivo })
    .eq("id", pagoId);
  if (error) throw new Error(error.message);

  const { data: pago } = await supabase
    .from("pagos")
    .select("obligacion_id")
    .eq("id", pagoId)
    .single();
  if (pago?.obligacion_id) {
    const { data: obligacion } = await supabase
      .from("obligaciones")
      .select("id")
      .eq("id", pago.obligacion_id)
      .single();
    if (obligacion) {
      const { data: pagos } = await supabase
        .from("pagos")
        .select("monto, estado_validacion")
        .eq("obligacion_id", obligacion.id)
        .neq("estado_validacion", "RECHAZADO");
      const suma = (pagos ?? []).reduce((acc, p: any) => acc + Number(p.monto || 0), 0);
      const { data: ob } = await supabase
        .from("obligaciones")
        .select("monto")
        .eq("id", obligacion.id)
        .single();
      const nuevoEstado = calcularEstadoTrasPago(Number(ob?.monto || 0), suma);
      await supabase
        .from("obligaciones")
        .update({ monto_pagado: montoPagadoAplicable(Number(ob?.monto || 0), suma), estado: nuevoEstado })
        .eq("id", obligacion.id);
    }
  }

  revalidatePath("/ejecutivo/conciliacion");
}
