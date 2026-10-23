// Acceso a objetos del bucket privado "respaldos".
//
// El bucket es privado (ver supabase/backend_setup.sql), por lo que las URLs
// públicas de Supabase Storage no son accesibles. En la columna archivo_url se
// guarda la RUTA interna del objeto ("liquidaciones/x.pdf", "userId/ts.pdf",
// "ocr/...") y las descargas se resuelven con URLs firmadas temporales.

export const BUCKET_RESPALDOS = "respaldos";

type ClienteStorage = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
};

// Extrae la ruta interna del objeto desde una URL de Supabase Storage o una
// ruta ya normalizada. Devuelve null si no se puede determinar.
export function rutaDesdeUrl(url: string | null | undefined, bucket = BUCKET_RESPALDOS): string | null {
  if (!url) return null;
  const texto = url.trim();
  if (!texto) return null;
  if (!/^https?:\/\//i.test(texto)) return texto.replace(/^\/+/, "");

  try {
    const pathname = new URL(texto).pathname;
    const marcadores = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
    ];
    for (const marcador of marcadores) {
      const pos = pathname.indexOf(marcador);
      if (pos >= 0) {
        const ruta = pathname.slice(pos + marcador.length);
        return ruta ? decodeURIComponent(ruta) : null;
      }
    }
    const match = pathname.match(new RegExp(`/${bucket}/(.+)$`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// Genera una URL firmada (válida por defecto 10 min) para un objeto del bucket
// privado. Acepta tanto una ruta interna como una URL antigua de Supabase.
export async function urlFirmada(
  cliente: ClienteStorage,
  valor: string | null | undefined,
  bucket = BUCKET_RESPALDOS,
  expiresIn = 600,
): Promise<string | null> {
  const ruta = rutaDesdeUrl(valor, bucket);
  if (!ruta) return null;
  const { data, error } = await cliente.storage.from(bucket).createSignedUrl(ruta, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}
