"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generarLiquidaciones,
  type ResultadoGenerarLiquidaciones,
} from "./actions";

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerarLiquidaciones() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(periodoActual());
  const [resultado, setResultado] = useState<ResultadoGenerarLiquidaciones | null>(null);
  const [generando, setGenerando] = useState(false);
  const [, startTransition] = useTransition();

  async function handleGenerar() {
    setResultado(null);
    setGenerando(true);
    try {
      const r = await generarLiquidaciones(periodo);
      setResultado(r);
      if (r.ok) startTransition(() => router.refresh());
    } catch (e) {
      setResultado({
        ok: false,
        mensaje: e instanceof Error ? e.message : "Error al generar liquidaciones",
        creadas: 0,
        omitidas: 0,
        detalle: [],
      });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="periodo-liquidar">Periodo</Label>
          <Input
            id="periodo-liquidar"
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-44"
          />
        </div>
        <Button type="button" onClick={handleGenerar} disabled={generando || !periodo}>
          {generando ? "Generando..." : "Generar liquidaciones"}
        </Button>
      </div>

      {resultado ? (
        <div className="space-y-2">
          <p
            className={`text-sm ${resultado.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
          >
            {resultado.mensaje}
          </p>
          {resultado.detalle.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {resultado.detalle.map((d) => (
                <li key={d.contratoId}>
                  Contrato {d.contratoId.slice(0, 8)}…: {d.motivo}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
