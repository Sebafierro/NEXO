"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { asignarBoleta, confirmarExtraccion } from "@/app/(dashboard)/ejecutivo/documentos/actions";
import {
  estaAsignada,
  estaConfirmada,
  estaListaParaConfirmar,
  type FilaExtraccion,
} from "./extracciones-ocr-data";

type Opcion = { id: string; etiqueta: string; contrato_id?: string };

type Props = {
  filas: FilaExtraccion[];
  contratos: Opcion[];
  obligaciones: (Opcion & { contrato_id: string })[];
  propiedades: Opcion[];
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  SOLICITADA: "Solicitada",
  EN_PROCESO: "En proceso",
  EXTRAIDA: "Extraída",
  RECHAZADA: "Rechazada",
};

function varianteEstado(estado: string) {
  if (estado === "EXTRAIDA") return "default" as const;
  if (estado === "RECHAZADA") return "destructive" as const;
  return "secondary" as const;
}

type Filtro = "PENDIENTES" | "ASIGNADAS" | "TODAS";

export function ExtraccionesOcr({ filas, contratos, obligaciones, propiedades }: Props) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("PENDIENTES");
  const [obligacionPorDocumento, setObligacionPorDocumento] = useState<Record<string, string>>({});
  const [propiedadPorDocumento, setPropiedadPorDocumento] = useState<Record<string, string>>({});
  const [contratoPorDocumento, setContratoPorDocumento] = useState<Record<string, string>>({});
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const lista = useMemo(() => {
    if (filtro === "PENDIENTES") return filas.filter((f) => !estaConfirmada(f));
    if (filtro === "ASIGNADAS") return filas.filter((f) => estaConfirmada(f));
    return filas;
  }, [filas, filtro]);

  // Filtra las obligaciones candidatas por contrato elegido (o por la
  // propiedad del documento/OCR). El contrato y la propiedad son SOLO filtros:
  // el destino de una boleta OCR siempre es una obligación.
  const obligacionesFiltradas = (fila: FilaExtraccion) => {
    const contratoId = contratoPorDocumento[fila.documento_id];
    if (contratoId) {
      const porContrato = obligaciones.filter((o) => o.contrato_id === contratoId);
      if (porContrato.length > 0) return porContrato;
    }
    const propiedadId = propiedadPorDocumento[fila.documento_id] ?? fila.propiedad_id;
    if (!propiedadId) return obligaciones;
    const contratosDePropiedad = new Set(
      contratos
        .filter((c) => (c as Opcion & { propiedad_id?: string }).propiedad_id === propiedadId)
        .map((c) => c.id),
    );
    const filtradas = obligaciones.filter((o) => contratosDePropiedad.has(o.contrato_id));
    return filtradas.length > 0 ? filtradas : obligaciones;
  };

  async function handleAsignar(fila: FilaExtraccion) {
    const obligacionId = obligacionPorDocumento[fila.documento_id] || "";

    if (!obligacionId) {
      setMensaje({
        tipo: "error",
        texto: "Elige la obligación de destino (los filtros de contrato/propiedad acotan la lista).",
      });
      return;
    }

    const fd = new FormData();
    fd.set("obligacion_id", obligacionId);
    const propiedadId = propiedadPorDocumento[fila.documento_id];
    if (propiedadId) fd.set("propiedad_id", propiedadId);

    setMensaje(null);
    setEnProceso(fila.documento_id);
    try {
      const resultado = await asignarBoleta(fila.documento_id, fd);
      if (!resultado.ok) {
        setMensaje({ tipo: "error", texto: resultado.mensaje });
      } else {
        setMensaje({ tipo: "ok", texto: `${fila.nombre}: ${resultado.mensaje}` });
        startTransition(() => router.refresh());
      }
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "Error al asignar",
      });
    } finally {
      setEnProceso(null);
    }
  }

  async function handleConfirmar(fila: FilaExtraccion) {
    setMensaje(null);
    setEnProceso(fila.documento_id);
    try {
      const resultado = await confirmarExtraccion(fila.documento_id);
      setMensaje({ tipo: resultado.ok ? "ok" : "error", texto: `${fila.nombre}: ${resultado.mensaje}` });
      if (resultado.ok) startTransition(() => router.refresh());
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "Error al confirmar",
      });
    } finally {
      setEnProceso(null);
    }
  }

  const ocupado = (id: string) => enProceso === id || pendiente;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracciones OCR</CardTitle>
        <CardDescription>
          Filtra por propiedad/contrato, elige la obligación de destino y confirma para actualizar el monto.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant={filtro === "PENDIENTES" ? "default" : "outline"} onClick={() => setFiltro("PENDIENTES")}>
            Pendientes
          </Button>
          <Button size="sm" variant={filtro === "ASIGNADAS" ? "default" : "outline"} onClick={() => setFiltro("ASIGNADAS")}>
            Confirmadas
          </Button>
          <Button size="sm" variant={filtro === "TODAS" ? "default" : "outline"} onClick={() => setFiltro("TODAS")}>
            Todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mensaje ? (
          <p
            className={`mb-3 rounded-md px-3 py-2 text-sm ${
              mensaje.tipo === "ok"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {mensaje.texto}
          </p>
        ) : null}

        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin extracciones para mostrar.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Datos OCR</TableHead>
                <TableHead>Asignar a obligación</TableHead>
                <TableHead>Confirmar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((fila) => {
                const ext = fila.extraccion;
                const confirmada = estaConfirmada(fila);
                const lista = estaListaParaConfirmar(fila);
                const asignada = estaAsignada(fila);
                const asignadaAObligacion = asignada && fila.entidad_tipo === "OBLIGACION";
                const asignadaAContrato = asignada && fila.entidad_tipo === "CONTRATO";
                return (
                  <TableRow key={fila.documento_id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{fila.nombre}</div>
                      <div className="text-xs text-muted-foreground">{fila.tipo_documento.replaceAll("_", " ").toLowerCase()}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      {ext ? (
                        <>
                          <Badge variant={varianteEstado(ext.estado)}>
                            {ETIQUETAS_ESTADO[ext.estado] ?? ext.estado}
                          </Badge>
                          {confirmada ? (
                            <div className="mt-1">
                              <Badge variant="outline">Confirmada</Badge>
                            </div>
                          ) : null}
                          {ext.error ? (
                            <p className="mt-1 max-w-[220px] text-xs text-destructive">{ext.error}</p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin extracción</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {ext ? (
                        <div className="space-y-0.5">
                          <div>Empresa: {ext.empresa_detectada || "—"}</div>
                          <div>N° cliente: {ext.numero_cliente || "—"}</div>
                          <div>
                            Monto: {ext.monto_detectado ? formatearMoneda(ext.monto_detectado) : "—"}
                          </div>
                          <div>
                            Confianza: {ext.confianza_ocr !== null ? `${ext.confianza_ocr}%` : "—"}
                          </div>
                          <div className="text-muted-foreground">
                            {ext.extraida_en ? formatearFecha(ext.extraida_en) : "sin procesar"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {confirmada ? (
                        <span className="text-xs text-muted-foreground">Confirmada</span>
                      ) : (
                        <div className="min-w-[240px] space-y-2">
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Filtros
                            </p>
                            <Select
                              value={propiedadPorDocumento[fila.documento_id] ?? fila.propiedad_id ?? ""}
                              onValueChange={(v) => setPropiedadPorDocumento((prev) => ({ ...prev, [fila.documento_id]: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Filtrar por propiedad (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {propiedades.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.etiqueta}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={contratoPorDocumento[fila.documento_id] ?? ""}
                              onValueChange={(v) => {
                                setContratoPorDocumento((prev) => ({ ...prev, [fila.documento_id]: v }));
                                // Al cambiar el contrato, se limpia la obligación elegida para evitar mezclar contextos.
                                setObligacionPorDocumento((prev) => ({ ...prev, [fila.documento_id]: "" }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Filtrar por contrato (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {contratos.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.etiqueta}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Obligación de destino <span className="text-destructive">*</span>
                            </p>
                            <Select
                              value={obligacionPorDocumento[fila.documento_id] ?? (asignadaAObligacion ? fila.entidad_id ?? "" : "")}
                              onValueChange={(v) => setObligacionPorDocumento((prev) => ({ ...prev, [fila.documento_id]: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Elige la obligación" />
                              </SelectTrigger>
                              <SelectContent>
                                {obligacionesFiltradas(fila).map((o) => (
                                  <SelectItem key={o.id} value={o.id}>
                                    {o.etiqueta}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {asignadaAContrato ? (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                Asignada a un contrato; elige la obligación para poder confirmar.
                              </p>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            type="button"
                            disabled={
                              ocupado(fila.documento_id) ||
                              !(obligacionPorDocumento[fila.documento_id] || (asignadaAObligacion && !contratoPorDocumento[fila.documento_id] && !propiedadPorDocumento[fila.documento_id]))
                            }
                            onClick={() => handleAsignar(fila)}
                          >
                            Asignar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        size="sm"
                        type="button"
                        disabled={ocupado(fila.documento_id) || !lista}
                        title={!lista ? "Requiere extracción exitosa y obligación asignada" : undefined}
                        onClick={() => handleConfirmar(fila)}
                      >
                        Confirmar → actualizar monto
                      </Button>
                      {confirmada ? (
                        <p className="mt-1 text-xs text-muted-foreground">Ya confirmada</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
