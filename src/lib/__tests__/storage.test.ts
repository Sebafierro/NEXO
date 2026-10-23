import { describe, it, expect } from "vitest";
import { BUCKET_RESPALDOS, rutaDesdeUrl, urlFirmada } from "@/lib/storage";

describe("rutaDesdeUrl (bucket privado)", () => {
  it("acepta una ruta interna ya normalizada", () => {
    expect(rutaDesdeUrl("liquidaciones/abc.pdf")).toBe("liquidaciones/abc.pdf");
  });

  it("quita barras iniciales", () => {
    expect(rutaDesdeUrl("/recibos/x.pdf")).toBe("recibos/x.pdf");
  });

  it("extrae la ruta de una URL publica de Supabase", () => {
    const url = `${BUCKET_RESPALDOS}/abc/123.pdf`;
    const completa = `https://proj.supabase.co/storage/v1/object/public/${url}`;
    expect(rutaDesdeUrl(completa)).toBe("abc/123.pdf");
  });

  it("extrae la ruta de una URL firmada", () => {
    const completa = `https://proj.supabase.co/storage/v1/object/sign/respaldos/ocr/f1.pdf?token=xyz`;
    expect(rutaDesdeUrl(completa)).toBe("ocr/f1.pdf");
  });

  it("devuelve null para vacíos o nulos", () => {
    expect(rutaDesdeUrl(null)).toBeNull();
    expect(rutaDesdeUrl("")).toBeNull();
    expect(rutaDesdeUrl("   ")).toBeNull();
  });
});

describe("urlFirmada", () => {
  it("firma la ruta y devuelve la url temporal", async () => {
    const llamadas: Array<{ bucket: string; path: string; expiresIn: number }> = [];
    const cliente = {
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (path: string, expiresIn: number) => {
            llamadas.push({ bucket, path, expiresIn });
            return { data: { signedUrl: `https://signed/${path}?t=${expiresIn}` }, error: null };
          },
        }),
      },
    };
    const url = await urlFirmada(cliente, "liquidaciones/abc.pdf", BUCKET_RESPALDOS, 300);
    expect(url).toBe("https://signed/liquidaciones/abc.pdf?t=300");
    expect(llamadas[0]).toEqual({ bucket: "respaldos", path: "liquidaciones/abc.pdf", expiresIn: 300 });
  });

  it("devuelve null si no hay ruta", async () => {
    const cliente = {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: "x" }, error: null }),
        }),
      },
    };
    expect(await urlFirmada(cliente, null)).toBeNull();
  });

  it("devuelve null si Supabase responde con error", async () => {
    const cliente = {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: null, error: { message: "not found" } }),
        }),
      },
    };
    expect(await urlFirmada(cliente, "no/existe.pdf")).toBeNull();
  });
});
