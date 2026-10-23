import { describe, it, expect } from "vitest";
import {
  mapearTipoServicioATipoObligacion,
  normalizarPeriodo,
  calcularFechaVencimiento,
  debeGenerarseEnPeriodo,
  generaObligacionServicio,
  hayMora,
  calcularEstadoTrasPago,
} from "@/lib/obligaciones";

describe("mapearTipoServicioATipoObligacion", () => {
  it("mapea AGUA a AGUA", () => {
    expect(mapearTipoServicioATipoObligacion("AGUA")).toBe("AGUA");
  });
  it("mapea GASTOS_COMUNES a GASTO_COMUN", () => {
    expect(mapearTipoServicioATipoObligacion("GASTOS_COMUNES")).toBe("GASTO_COMUN");
  });
  it("mapea GAS e INTERNET a SERVICIO", () => {
    expect(mapearTipoServicioATipoObligacion("GAS")).toBe("SERVICIO");
    expect(mapearTipoServicioATipoObligacion("INTERNET")).toBe("SERVICIO");
  });
  it("desconocidos caen en OTRO", () => {
    expect(mapearTipoServicioATipoObligacion("CUALQUIERA")).toBe("OTRO");
  });
});

describe("normalizarPeriodo", () => {
  it("normaliza al primer dia del mes", () => {
    const p = normalizarPeriodo(new Date(2026, 9, 17));
    expect(p.getFullYear()).toBe(2026);
    expect(p.getMonth()).toBe(9);
    expect(p.getDate()).toBe(1);
  });
});

describe("calcularFechaVencimiento", () => {
  it("usa el dia del contrato dentro del mes", () => {
    const f = calcularFechaVencimiento(new Date(2026, 0, 1), 5);
    expect(f.getDate()).toBe(5);
    expect(f.getMonth()).toBe(0);
  });
  it("el dia 28 existe en febrero bisiesto (dia limitado a 28 por CHECK)", () => {
    const f = calcularFechaVencimiento(new Date(2024, 1, 1), 28);
    expect(f.getDate()).toBe(28);
    expect(f.getMonth()).toBe(1);
  });
  it("clampa dias fuera de rango a 1..28", () => {
    expect(calcularFechaVencimiento(new Date(2026, 0, 1), 0).getDate()).toBe(1);
    expect(calcularFechaVencimiento(new Date(2026, 0, 1), 99).getDate()).toBe(28);
  });
});

describe("debeGenerarseEnPeriodo", () => {
  const periodo = new Date(2026, 9, 1);
  it("contrato VIGENTE sin termino se genera", () => {
    expect(
      debeGenerarseEnPeriodo(
        { estado: "VIGENTE", fechaInicio: "2026-01-15", fechaTermino: null },
        periodo
      )
    ).toBe(true);
  });
  it("contrato FINALIZADO no se genera", () => {
    expect(
      debeGenerarseEnPeriodo(
        { estado: "FINALIZADO", fechaInicio: "2026-01-15", fechaTermino: null },
        periodo
      )
    ).toBe(false);
  });
  it("contrato terminado antes del periodo no se genera", () => {
    expect(
      debeGenerarseEnPeriodo(
        { estado: "VIGENTE", fechaInicio: "2026-01-01", fechaTermino: "2026-09-30" },
        periodo
      )
    ).toBe(false);
  });
  it("contrato iniciado dentro del periodo si se genera", () => {
    expect(
      debeGenerarseEnPeriodo(
        { estado: "VIGENTE", fechaInicio: "2026-10-15", fechaTermino: null },
        periodo
      )
    ).toBe(true);
  });
});

describe("generaObligacionServicio", () => {
  it("activa con monto genera", () => {
    expect(generaObligacionServicio({ activo: true, montoMensual: 50000 })).toBe(true);
  });
  it("inactiva no genera", () => {
    expect(generaObligacionServicio({ activo: false, montoMensual: 50000 })).toBe(false);
  });
  it("sin monto no genera", () => {
    expect(generaObligacionServicio({ activo: true, montoMensual: null })).toBe(false);
    expect(generaObligacionServicio({ activo: true, montoMensual: 0 })).toBe(false);
  });
});

describe("hayMora", () => {
  const hoy = new Date(2026, 9, 20);
  it("VENCIDA con saldo es mora", () => {
    expect(
      hayMora({ estado: "VENCIDA", fechaVencimiento: "2026-10-05", saldo: 100 }, hoy)
    ).toBe(true);
  });
  it("PENDIENTE con fecha pasada es mora (defensiva)", () => {
    expect(
      hayMora({ estado: "PENDIENTE", fechaVencimiento: "2026-10-05", saldo: 100 }, hoy)
    ).toBe(true);
  });
  it("PENDIENTE con fecha futura no es mora", () => {
    expect(
      hayMora({ estado: "PENDIENTE", fechaVencimiento: "2026-10-25", saldo: 100 }, hoy)
    ).toBe(false);
  });
  it("sin saldo nunca es mora", () => {
    expect(
      hayMora({ estado: "VENCIDA", fechaVencimiento: "2026-10-05", saldo: 0 }, hoy)
    ).toBe(false);
  });
  it("PAGADA no es mora aunque la fecha este pasada", () => {
    expect(
      hayMora({ estado: "PAGADA", fechaVencimiento: "2026-10-05", saldo: 0 }, hoy)
    ).toBe(false);
  });
});

describe("calcularEstadoTrasPago", () => {
  it("pago total => PAGADA", () => {
    expect(calcularEstadoTrasPago(100, 100)).toBe("PAGADA");
    expect(calcularEstadoTrasPago(100, 150)).toBe("PAGADA");
  });
  it("pago parcial => PAGO_PARCIAL", () => {
    expect(calcularEstadoTrasPago(100, 40)).toBe("PAGO_PARCIAL");
  });
  it("sin pagos => PENDIENTE", () => {
    expect(calcularEstadoTrasPago(100, 0)).toBe("PENDIENTE");
  });
});
