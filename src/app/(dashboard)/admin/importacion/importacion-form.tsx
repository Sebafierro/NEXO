"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmarImportacion, previsualizarImportacion } from "@/lib/importacion/procesador";
import type { ResultadoImportacion, ResultadoPrevisualizacion } from "@/lib/importacion/types";

export function ImportacionMasivaForm() {
  const [isPending, startTransition] = useTransition();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<ResultadoPrevisualizacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const handlePrevisualizar = () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    startTransition(async () => {
      const res = await previsualizarImportacion(formData);
      setPreview(res);
      setResultado(null);
    });
  };

  const handleConfirmar = () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    startTransition(async () => {
      const res = await confirmarImportacion(formData);
      setResultado(res);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="archivo">Archivo (.xlsx, .csv)</Label>
        <Input
          id="archivo"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setArchivo(file);
            setPreview(null);
            setResultado(null);
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handlePrevisualizar} disabled={!archivo || isPending}>
          Previsualizar
        </Button>
        {preview && preview.ok && (
          <Button type="button" variant="secondary" onClick={handleConfirmar} disabled={isPending}>
            Confirmar importación
          </Button>
        )}
      </div>

      {preview && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Previsualización</p>
            <p className="text-xs text-muted-foreground">
              Filas: {preview.totalFilas} | Columnas detectadas: {preview.columnasDetectadas.join(", ")}
            </p>
          </div>
          {preview.errores.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Errores por fila</p>
              <ul className="mt-2 text-xs text-red-700 space-y-1">
                {preview.errores.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.advertencias.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-700">Advertencias</p>
              <ul className="mt-2 text-xs text-amber-700 space-y-1">
                {preview.advertencias.slice(0, 50).map((a, i) => (
                  <li key={i}>
                    Fila {a.fila}: {a.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.filas.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columnasDetectadas.slice(0, 12).map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.filas.slice(0, 20).map((fila, idx) => (
                    <TableRow key={idx}>
                      {preview.columnasDetectadas.slice(0, 12).map((c) => (
                        <TableCell key={c} className="max-w-[200px] truncate">
                          {String((fila as any)[c] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {resultado && (
        <div className="space-y-3">
          <div className={`rounded-md border p-3 ${resultado.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-sm font-medium ${resultado.ok ? "text-green-700" : "text-red-700"}`}>{resultado.mensaje}</p>
            <div className="mt-2 text-xs space-y-1">
              <p>Propietarios: creados {resultado.propietariosCreados}, actualizados {resultado.propietariosActualizados}</p>
              <p>Propiedades: creadas {resultado.propiedadesCreadas}, actualizadas {resultado.propiedadesActualizadas}</p>
              <p>Arrendatarios: creados {resultado.arrendatariosCreados}, actualizados {resultado.arrendatariosActualizados}</p>
              <p>Contratos: creados {resultado.contratosCreados}, actualizados {resultado.contratosActualizados}</p>
              <p>Cuentas de servicio: creadas {resultado.cuentasServiciosCreadas}, actualizadas {resultado.cuentasServiciosActualizadas}</p>
            </div>
          </div>
          {resultado.errores.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Errores</p>
              <ul className="mt-2 text-xs text-red-700 space-y-1">
                {resultado.errores.map((e, i) => (
                  <li key={i}>
                    {e.fila > 0 ? `Fila ${e.fila}: ` : ""}{e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resultado.advertencias.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-700">Advertencias</p>
              <ul className="mt-2 text-xs text-amber-700 space-y-1">
                {resultado.advertencias.map((a, i) => (
                  <li key={i}>
                    Fila {a.fila}: {a.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
