import { describe, it, expect } from "vitest";
import {
  calcularNetoLiquidacion,
  construirItemsLiquidacion,
  documentosListosParaLiquidar,
  esPeriodoEnVerde,
  resolverRangoPeriodo,
  type DocumentoPeriodo,
  type ObligacionPeriodo,
} from "@/lib/liquidaciones";

describe("calcularNetoLiquidacion (M4)", () => {
  it("aplica neto = arriendo_bruto - comision - reparaciones + reembolsos", () => {
    const r = calcularNetoLiquidacion({
      arriendoBruto: 500000,
      comisionPorcentaje: 10,
      gastos: 30000,
      reembolsos: 5000,
    });
    expect(r.comision).toBe(50000);
    expect(r.neto).toBe(500000 - 50000 - 30000 + 5000);
  });

  it("sin gastos ni reembolsos deja neto = bruto - comision", () => {
    const r = calcularNetoLiquidacion({ arriendoBruto: 400000, comisionPorcentaje: 8 });
    expect(r.neto).toBe(400000 - 32000);
  });
});

describe("esPeriodoEnVerde (M4 readiness)", () => {
  const pagada = (saldo = 0): ObligacionPeriodo => ({ estado: "PAGADA", saldo });

  it("verdadero cuando todas están PAGADA o con saldo <= 0", () => {
    expect(esPeriodoEnVerde([pagada(), { estado: "PENDIENTE", saldo: 0 }])).toBe(true);
  });

  it("falso cuando hay una obligación con saldo > 0", () => {
    expect(esPeriodoEnVerde([pagada(), { estado: "PENDIENTE", saldo: 1000 }])).toBe(false);
  });

  it("falso cuando no hay obligaciones", () => {
    expect(esPeriodoEnVerde([])).toBe(false);
  });

  it("deriva el saldo desde monto - monto_pagado si falta la columna", () => {
    expect(esPeriodoEnVerde([{ monto: 1000, monto_pagado: 1000, estado: "PENDIENTE" }])).toBe(true);
    expect(esPeriodoEnVerde([{ monto: 1000, monto_pagado: 400, estado: "PENDIENTE" }])).toBe(false);
  });
});

describe("documentosListosParaLiquidar (M4 readiness documental)", () => {
  it("listo cuando no hay boletas", () => {
    expect(documentosListosParaLiquidar([])).toEqual({ listo: true, pendientes: 0 });
  });

  it("listo cuando todas las boletas están VALIDADO", () => {
    const docs: DocumentoPeriodo[] = [
      { id: "1", tipo_documento: "BOLETA_SERVICIO", estado: "VALIDADO" },
    ];
    expect(documentosListosParaLiquidar(docs)).toEqual({ listo: true, pendientes: 0 });
  });

  it("bloquea con boletas PENDIENTE/EXTRAIDO/RECHAZADO", () => {
    const docs: DocumentoPeriodo[] = [
      { id: "1", tipo_documento: "BOLETA_SERVICIO", estado: "VALIDADO" },
      { id: "2", tipo_documento: "BOLETA_SERVICIO", estado: "PENDIENTE" },
      { id: "3", tipo_documento: "BOLETA_SERVICIO", estado: "RECHAZADO" },
    ];
    expect(documentosListosParaLiquidar(docs)).toEqual({ listo: false, pendientes: 2 });
  });

  it("ignora documentos que no son boletas de servicio", () => {
    const docs: DocumentoPeriodo[] = [
      { id: "1", tipo_documento: "COMPROBANTE_PAGO", estado: "PENDIENTE" },
    ];
    expect(documentosListosParaLiquidar(docs).listo).toBe(true);
  });
});

describe("resolverRangoPeriodo", () => {
  it("devuelve primer y último día del mes", () => {
    expect(resolverRangoPeriodo("2026-02")).toEqual({ inicio: "2026-02-01", fin: "2026-02-28" });
  });
});

describe("construirItemsLiquidacion", () => {
  it("incluye arriendo (+), comisión (-) y solo los conceptos con monto", () => {
    const items = construirItemsLiquidacion(
      "liq-1",
      { arriendoBruto: 500000, comision: 50000, gastos: 0, reembolsos: 0, neto: 450000 },
      10,
    );
    const tipos = items.map((i) => i.tipo);
    expect(tipos).toEqual(["ARRIENDO", "COMISION"]);
    expect(items[0].signo).toBe(1);
    expect(items[1].signo).toBe(-1);
  });

  it("agrega reparaciones (-) y reembolsos (+) cuando existen", () => {
    const items = construirItemsLiquidacion(
      "liq-2",
      { arriendoBruto: 500000, comision: 50000, gastos: 20000, reembolsos: 3000, neto: 433000 },
      10,
    );
    const porTipo = Object.fromEntries(items.map((i) => [i.tipo, i]));
    expect(porTipo.REPARACION.signo).toBe(-1);
    expect(porTipo.REEMBOLSO.signo).toBe(1);
  });
});
