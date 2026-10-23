"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generarObligaciones } from "./actions";

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerarObligaciones() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(periodoActual());
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [, startTransition] = useTransition();

  async function handleGenerar() {
    setMensaje(null);
    setGenerando(true);
    try {
      const resultado = await generarObligaciones(periodo);
      setMensaje({ tipo: resultado.ok ? "ok" : "error", texto: resultado.mensaje });
      if (resultado.ok) startTransition(() => router.refresh());
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e instanceof Error ? e.message : "Error al generar obligaciones",
      });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="periodo-generar">Periodo</Label>
        <Input
          id="periodo-generar"
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-44"
        />
      </div>
      <Button type="button" onClick={handleGenerar} disabled={generando || !periodo}>
        {generando ? "Generando..." : "Generar obligaciones del periodo"}
      </Button>
      {mensaje ? (
        <p
          className={`text-sm ${mensaje.tipo === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
        >
          {mensaje.texto}
        </p>
      ) : null}
    </div>
  );
}
