import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("CSV de prueba data-1/data-2/data-3", () => {
  const dataDir = path.join(process.cwd(), "data");

  it("existen los tres archivos", () => {
    expect(fs.existsSync(path.join(dataDir, "data-1.csv"))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "data-2.csv"))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "data-3.csv"))).toBe(true);
  });

  it("data-1 tiene cabeceras esperadas", () => {
    const content = fs.readFileSync(path.join(dataDir, "data-1.csv"), "utf8");
    expect(content).toMatch(/DIRECCIÓN/i);
    expect(content).toMatch(/ESTADO/i);
    expect(content).toMatch(/ARRIENDO/i);
  });

  it("data-2 tiene liquidación", () => {
    const content = fs.readFileSync(path.join(dataDir, "data-2.csv"), "utf8");
    expect(content).toMatch(/VALESCA BARRERA/i);
    expect(content).toMatch(/LIQUIDACIÓN/i);
  });

  it("data-3 tiene propietario y arrendatarios", () => {
    const content = fs.readFileSync(path.join(dataDir, "data-3.csv"), "utf8");
    expect(content).toMatch(/CRISTIAN FERNANDEZ OTO/i);
    expect(content).toMatch(/GRACIELA ARCHILA MIGUEL/i);
    expect(content).toMatch(/AVENIDA PORTUGAL/i);
  });
});
