// Motor de conciliacion y semaforo (M2-3, PLAN-MVP.md seccion 5 reglas 3-4).
// Logica pura, sin acceso a la base de datos: las Server Actions de
// ejecutivo/conciliacion la usan para decidir saldo/estado y registrar la
// diferencia en public.conciliaciones.

import { hayMora } from "./obligaciones";
import type { EstadoObligacion } from "./types";

export type EstadoConciliacion = "CONCILIADO" | "CON_DIFERENCIA";

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

export type ObligacionConciliar = {
  monto: number;
  montoPagado: number;
  estado: EstadoObligacion;
  fechaVencimiento: string;
};

// Saldo pendiente de una obligacion (nunca negativo).
export function calcularSaldo(monto: number, montoPagado: number): number {
  return Math.max(0, monto - montoPagado);
}

// Monto a persistir en obligaciones.monto_pagado. La columna saldo es generada
// (monto - monto_pagado) SIN clamp, por lo que un sobrepago dejaria saldo
// negativo. Se topa el pagado acumulado al monto; el excedente real queda
// registrado en conciliaciones (monto_aplicado / diferencia).
export function montoPagadoAplicable(monto: number, sumaPagos: number): number {
  return Math.min(Math.max(0, monto), Math.max(0, sumaPagos));
}

// Aplica un pago sobre una obligacion: devuelve el nuevo acumulado, el saldo
// resultante y el estado (regla 3: PAGADA / PAGO_PARCIAL / PENDIENTE).
export function aplicarPago(
  obligacion: ObligacionConciliar,
  montoPago: number,
  hoy: Date = new Date()
): { montoPagado: number; saldo: number; estado: EstadoObligacion } {
  const montoPagadoAcumulado = obligacion.montoPagado + montoPago;
  const montoPagado = montoPagadoAplicable(obligacion.monto, montoPagadoAcumulado);
  const saldo = calcularSaldo(obligacion.monto, montoPagado);
  let estado: EstadoObligacion;
  if (saldo <= 0) estado = "PAGADA";
  else if (montoPagado > 0) estado = "PAGO_PARCIAL";
  else if (hayMora({ estado: obligacion.estado, fechaVencimiento: obligacion.fechaVencimiento, saldo }, hoy))
    estado = "VENCIDA";
  else estado = "PENDIENTE";
  return { montoPagado, saldo, estado };
}

// Estado que se registra en public.conciliaciones segun el pago vs lo esperado.
export function estadoConciliacion(montoPago: number, montoEsperado: number): EstadoConciliacion {
  return montoPago === montoEsperado ? "CONCILIADO" : "CON_DIFERENCIA";
}

// Diferencia registrada en conciliaciones.diferencia (positivo = sobra).
export function calcularDiferencia(montoPago: number, montoEsperado: number): number {
  return montoPago - montoEsperado;
}

// Semaforo por contrato/propiedad (regla 4):
//   ROJO     -> mora confirmada (saldo > 0 y fecha vencida);
//   AMARILLO -> falta comprobante o esta en revision (EN_REVISION / PAGO_PARCIAL);
//   VERDE    -> todo conciliado (sin saldo pendiente).
export function calcularSemaforo(
  obligaciones: ObligacionConciliar[],
  hoy: Date = new Date()
): Semaforo {
  const hayMoraConfirmada = obligaciones.some((o) =>
    hayMora({ ...o, saldo: calcularSaldo(o.monto, o.montoPagado) }, hoy)
  );
  if (hayMoraConfirmada) return "ROJO";

  const hayRevision = obligaciones.some(
    (o) => o.estado === "EN_REVISION" || (o.montoPagado > 0 && o.montoPagado < o.monto)
  );
  if (hayRevision) return "AMARILLO";

  return "VERDE";
}
