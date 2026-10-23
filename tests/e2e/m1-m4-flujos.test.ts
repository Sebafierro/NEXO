import { describe, it, expect } from "vitest";

describe("M1-M4 Flujos E2E (Validación estructural)", () => {
  it("existen rutas principales M1", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routes = [
      "src/app/(dashboard)/admin/propiedades/page.tsx",
      "src/app/(dashboard)/admin/propietarios/page.tsx",
      "src/app/(dashboard)/admin/arrendatarios/page.tsx",
      "src/app/(dashboard)/admin/contratos/page.tsx",
      "src/app/(dashboard)/admin/cuentas-servicios/page.tsx",
    ];
    for (const r of routes) {
      expect(fs.existsSync(path.join(process.cwd(), r))).toBe(true);
    }
  });

  it("existen rutas M2", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routes = [
      "src/app/(dashboard)/arrendatario/pagos/page.tsx",
      "src/app/(dashboard)/arrendatario/pagos/actions.ts",
      "src/app/(dashboard)/ejecutivo/conciliacion/page.tsx",
      "src/app/(dashboard)/ejecutivo/conciliacion/actions.ts",
      "src/app/(dashboard)/ejecutivo/conciliacion/generar-obligaciones.tsx",
      "src/app/(dashboard)/ejecutivo/conciliacion/pagos-pendientes.tsx",
    ];
    for (const r of routes) {
      expect(fs.existsSync(path.join(process.cwd(), r))).toBe(true);
    }
  });

  it("existen rutas M3", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routes = [
      "src/app/(dashboard)/ejecutivo/documentos/page.tsx",
      "src/app/(dashboard)/ejecutivo/documentos/actions.ts",
      "src/app/(dashboard)/ejecutivo/documentos/actions-carga.ts",
      "src/app/api/ocr/procesar/route.ts",
      "src/components/documentos/extracciones-ocr.tsx",
      "src/components/documentos/extracciones-ocr-data.ts",
      "src/lib/ocr.ts",
      "ocr-service",
    ];
    for (const r of routes) {
      expect(fs.existsSync(path.join(process.cwd(), r))).toBe(true);
    }
  });

  it("existen rutas y lógica M4", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routes = [
      "src/app/(dashboard)/ejecutivo/liquidaciones/page.tsx",
      "src/app/(dashboard)/ejecutivo/liquidaciones/actions.ts",
      "src/app/(dashboard)/ejecutivo/liquidaciones/generar-liquidaciones.tsx",
      "src/app/(dashboard)/admin/liquidaciones/page.tsx",
      "src/app/(dashboard)/propietario/liquidaciones/page.tsx",
      "src/lib/liquidaciones.ts",
      "src/lib/pdf/liquidacion.ts",
      "src/lib/storage.ts",
      "src/app/api/liquidaciones/[id]/generar-pdf/route.ts",
      "src/app/api/liquidaciones/[id]/pdf/route.ts",
      "src/app/api/arrendatario/recibo-saldado/generar/route.ts",
    ];
    for (const r of routes) {
      expect(fs.existsSync(path.join(process.cwd(), r))).toBe(true);
    }
  });

  it("migraciones clave existen", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const migrations = [
      "supabase/03_mvp.sql",
      "supabase/05_ciclo_financiero.sql",
      "supabase/06_mvp_respuestas.sql",
      "supabase/07_m3_documentos.sql",
      "supabase/08_m3_confirmacion_ocr.sql",
      "supabase/09_m2_comprobantes_arrendatario.sql",
      "supabase/10_documentos_entidad_sin_asignar.sql",
      "supabase/11_seed_demo.sql",
    ];
    for (const m of migrations) {
      expect(fs.existsSync(path.join(process.cwd(), m))).toBe(true);
    }
  });

  it("seed demo cubre los 4 roles, obligaciones y documento SIN_ASIGNAR", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/11_seed_demo.sql"),
      "utf8",
    );
    for (const rol of ["ADMINISTRADOR", "EJECUTIVO", "PROPIETARIO", "ARRENDATARIO"]) {
      expect(sql).toContain(rol);
    }
    expect(sql).toContain("insert into auth.users");
    expect(sql).toContain("SIN_ASIGNAR");
    expect(sql).toContain("public.obligaciones");
    expect(sql).toContain("monto_mensual");
  });

  it("seed demo neutraliza el trigger de arrendatarios antes de crear el auth user", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/11_seed_demo.sql"),
      "utf8",
    );
    const neutraliza = sql.indexOf("set email = v_sentinel");
    const insertAuth = sql.indexOf("insert into auth.users");
    expect(neutraliza).toBeGreaterThan(-1);
    expect(insertAuth).toBeGreaterThan(-1);
    expect(neutraliza).toBeLessThan(insertAuth);
  });
});
