import { describe, it, expect } from "vitest";
import {
  calcularSaldo,
  aplicarPago,
  estadoConciliacion,
  calcularDiferencia,
  calcularSemaforo,
  montoPagadoAplicable,
  type ObligacionConciliar,
} from "@/lib/conciliacion";

const hoy = new Date(2026, 9, 20);

const base: ObligacionConciliar = {
  monto: 500000,
  montoPagado: 0,
  estado: "PENDIENTE",
  fechaVencimiento: "2026-10-05",
};

describe("calcularSaldo", () => {
  it("monto menos pagado", () => {
    expect(calcularSaldo(500000, 200000)).toBe(300000);
  });
  it("nunca negativo", () => {
    expect(calcularSaldo(100, 200)).toBe(0);
  });
});

describe("aplicarPago", () => {
  it("pago total deja PAGADA con saldo 0", () => {
    const r = aplicarPago(base, 500000, hoy);
    expect(r).toEqual({ montoPagado: 500000, saldo: 0, estado: "PAGADA" });
  });
  it("pago parcial deja PAGO_PARCIAL", () => {
    const r = aplicarPago(base, 200000, hoy);
    expect(r).toEqual({ montoPagado: 200000, saldo: 300000, estado: "PAGO_PARCIAL" });
  });
  it("acumula sobre pagos previos", () => {
    const r = aplicarPago({ ...base, montoPagado: 200000, estado: "PAGO_PARCIAL" }, 300000, hoy);
    expect(r.estado).toBe("PAGADA");
    expect(r.saldo).toBe(0);
  });
  it("pago vencido sin saldo marca VENCIDA (defensiva)", () => {
    const vencida = { ...base, fechaVencimiento: "2026-10-05" };
    const r = aplicarPago(vencida, 0, hoy);
    expect(r.estado).toBe("VENCIDA");
  });
});

describe("estadoConciliacion / calcularDiferencia", () => {
  it("monto exacto => CONCILIADO y diferencia 0", () => {
    expect(estadoConciliacion(500000, 500000)).toBe("CONCILIADO");
    expect(calcularDiferencia(500000, 500000)).toBe(0);
  });
  it("monto distinto => CON_DIFERENCIA con signo", () => {
    expect(estadoConciliacion(480000, 500000)).toBe("CON_DIFERENCIA");
    expect(calcularDiferencia(480000, 500000)).toBe(-20000);
    expect(calcularDiferencia(510000, 500000)).toBe(10000);
  });
});

describe("montoPagadoAplicable (sobrepago)", () => {
  it("pago exacto se conserva", () => {
    expect(montoPagadoAplicable(500000, 500000)).toBe(500000);
  });
  it("sobrepago se topa al monto (saldo generado no negativo)", () => {
    expect(montoPagadoAplicable(500000, 600000)).toBe(500000);
  });
  it("pago parcial se conserva", () => {
    expect(montoPagadoAplicable(500000, 200000)).toBe(200000);
  });
  it("nunca negativo", () => {
    expect(montoPagadoAplicable(500000, -10)).toBe(0);
  });
});

describe("calcularSemaforo", () => {
  it("todo pagado => VERDE", () => {
    const obs = [{ ...base, montoPagado: 500000, estado: "PAGADA" as const }];
    expect(calcularSemaforo(obs, hoy)).toBe("VERDE");
  });
  it("sin obligaciones => VERDE", () => {
    expect(calcularSemaforo([], hoy)).toBe("VERDE");
  });
  it("mora confirmada => ROJO", () => {
    const obs = [{ ...base, estado: "VENCIDA" as const }];
    expect(calcularSemaforo(obs, hoy)).toBe("ROJO");
  });
  it("fecha vencida con estado PENDIENTE tambien => ROJO (defensiva)", () => {
    const obs = [{ ...base, estado: "PENDIENTE" as const, fechaVencimiento: "2026-10-01" }];
    expect(calcularSemaforo(obs, hoy)).toBe("ROJO");
  });
  it("en revision => AMARILLO", () => {
    const obs = [{ ...base, estado: "EN_REVISION" as const }];
    expect(calcularSemaforo(obs, hoy)).toBe("AMARILLO");
  });
  it("pago parcial sin mora => AMARILLO", () => {
    const obs = [{ ...base, montoPagado: 100000, estado: "PAGO_PARCIAL" as const, fechaVencimiento: "2026-10-25" }];
    expect(calcularSemaforo(obs, hoy)).toBe("AMARILLO");
  });
  it("pendiente con fecha futura => VERDE", () => {
    const obs = [{ ...base, fechaVencimiento: "2026-10-25" }];
    expect(calcularSemaforo(obs, hoy)).toBe("VERDE");
  });
});
