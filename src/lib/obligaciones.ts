// Reglas de negocio del ciclo financiero mensual (M2-1 / M2-2).
// Espejo en TypeScript de las funciones SQL generadas en
// supabase/05_ciclo_financiero.sql (generar_obligaciones_periodo y
// marcar_obligaciones_vencidas), para poder probarlas con Vitest sin BD.

import type { EstadoObligacion } from "./types";

// Mapeo tipo_servicio (cuentas_servicios) -> tipo de obligacion.
const MAPEO_SERVICIO: Record<string, string> = {
  AGUA: "AGUA",
  ELECTRICIDAD: "ELECTRICIDAD",
  GASTOS_COMUNES: "GASTO_COMUN",
  GAS: "SERVICIO",
  INTERNET: "SERVICIO",
  OTRO: "OTRO",
};

export function mapearTipoServicioATipoObligacion(tipoServicio: string): string {
  return MAPEO_SERVICIO[tipoServicio] ?? "OTRO";
}

// Normaliza cualquier fecha al primer dia del mes (el periodo en la BD).
export function normalizarPeriodo(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

// Fecha de vencimiento mensual: dia del contrato limitado al ultimo dia del mes.
// Equivalente a least(periodo + (dia_vencimiento - 1), fin del mes) en SQL.
export function calcularFechaVencimiento(periodo: Date, diaVencimiento: number): Date {
  const dia = Math.min(Math.max(diaVencimiento, 1), 28);
  const primerDia = normalizarPeriodo(periodo);
  const ultimoDia = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0);
  const candidata = new Date(primerDia.getFullYear(), primerDia.getMonth(), dia);
  return candidata > ultimoDia ? ultimoDia : candidata;
}

// ¿Se debe generar la obligacion para este periodo? Contrato VIGENTE cuya
// vigencia cubre el mes completo (parcial o total).
export function debeGenerarseEnPeriodo(
  contrato: { estado: string; fechaInicio: string; fechaTermino: string | null },
  periodo: Date
): boolean {
  if (contrato.estado !== "VIGENTE") return false;
  const primerDia = normalizarPeriodo(periodo);
  const finMes = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0);
  const inicio = new Date(contrato.fechaInicio + "T00:00:00");
  const termino = contrato.fechaTermino ? new Date(contrato.fechaTermino + "T00:00:00") : null;
  return inicio <= finMes && (termino === null || termino >= primerDia);
}

// ¿La cuenta de servicio genera obligacion? Solo si esta activa y tiene monto.
export function generaObligacionServicio(cuenta: { activo: boolean; montoMensual: number | null }): boolean {
  return cuenta.activo && cuenta.montoMensual !== null && cuenta.montoMensual > 0;
}

// ¿Hay mora? Regla defensiva (si el cron falla): ademas del estado VENCIDA,
// toda obligacion no pagada con saldo > 0 y fecha ya vencida se considera mora.
export function hayMora(
  obligacion: { estado: EstadoObligacion; fechaVencimiento: string; saldo: number },
  hoy: Date
): boolean {
  if (obligacion.saldo <= 0) return false;
  if (obligacion.estado === "VENCIDA") return true;
  const vencimiento = new Date(obligacion.fechaVencimiento + "T00:00:00");
  const soloFechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return (
    (obligacion.estado === "PENDIENTE" || obligacion.estado === "PAGO_PARCIAL") &&
    vencimiento < soloFechaHoy
  );
}

// Estado de la obligacion tras acumular pagos (usado por M2-4/M2-5).
// montoPagado es el nuevo total acumulado de pagos sobre la obligacion.
export function calcularEstadoTrasPago(monto: number, montoPagado: number): EstadoObligacion {
  if (montoPagado <= 0) return "PENDIENTE";
  if (montoPagado >= monto) return "PAGADA";
  return "PAGO_PARCIAL";
}
