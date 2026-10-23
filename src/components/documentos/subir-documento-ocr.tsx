"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subirDocumentoOcr } from "@/app/(dashboard)/ejecutivo/documentos/actions-carga";

type RespuestaProcesamiento = {
  procesadas?: number;
  rechazadas?: number;
  total?: number;
  errores?: string[];
  error?: string;
};

export function SubirDocumentoOcr() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setCargando(true);
    setMensaje(null);
    setError(null);
    try {
      await subirDocumentoOcr(formData);
      setMensaje("Documento subido. Procesando con OCR...");

      const response = await fetch("/api/ocr/procesar", { method: "POST" });
      const data = (await response
        .json()
        .catch(() => null)) as RespuestaProcesamiento | null;

      if (!response.ok) {
        throw new Error(
          data?.error ?? `El procesamiento OCR falló (${response.status})`,
        );
      }

      const procesadas = data?.procesadas ?? 0;
      const rechazadas = data?.rechazadas ?? 0;

      if (procesadas > 0) {
        setMensaje(`OCR procesado: ${procesadas} documento(s) extraído(s).`);
      } else if (rechazadas > 0) {
        const detalle = data?.errores?.length
          ? `: ${data.errores.join("; ")}`
          : "";
        setError(`OCR rechazó ${rechazadas} documento(s)${detalle}`);
      } else {
        setMensaje("Documento subido. No había extracciones pendientes.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar el documento",
      );
    } finally {
      router.refresh();
      setCargando(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Archivo (PDF, JPG, PNG)</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
      </div>
      <Button type="submit" disabled={cargando}>
        {cargando ? "Procesando..." : "Subir y procesar con OCR"}
      </Button>
      {mensaje && <p className="text-sm text-muted-foreground">{mensaje}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
