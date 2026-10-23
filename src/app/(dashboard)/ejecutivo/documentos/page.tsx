import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { SubirDocumentoOcr } from "@/components/documentos/subir-documento-ocr";
import { ExtraccionesOcr } from "@/components/documentos/extracciones-ocr";
import {
  aFilaExtraccion,
  type DocumentoRow,
  type ExtraccionRow,
} from "@/components/documentos/extracciones-ocr-data";

type ContratoRow = {
  id: string;
  valor_arriendo: number;
  propiedad_id: string;
  propiedades: { nombre: string | null; direccion: string | null } | null;
};

type ObligacionRow = {
  id: string;
  tipo: string;
  periodo: string | null;
  monto: number;
  saldo: number | null;
  contrato_id: string;
};

type PropiedadRow = {
  id: string;
  nombre: string | null;
  direccion: string | null;
};

export const metadata: Metadata = {
  title: "Carga de documentos OCR",
};

export const dynamic = "force-dynamic";

export default async function EjecutivoDocumentosPage() {
  await exigirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  const [documentosRes, extraccionesRes, contratosRes, obligacionesRes, propiedadesRes] =
    await Promise.all([
      supabase
        .from("documentos")
        .select("id, nombre, tipo_documento, entidad_tipo, entidad_id, estado, creado_en, propiedad_id")
        .order("creado_en", { ascending: false })
        .limit(50),
      supabase
        .from("extracciones_documento")
        .select(
          "id, documento_id, estado, empresa_detectada, numero_cliente, monto_detectado, confianza_ocr, extraida_en, confirmado_en, datos_crudos",
        )
        .order("creado_en", { ascending: false })
        .limit(50),
      supabase
        .from("contratos")
        .select("id, estado, valor_arriendo, propiedad_id, propiedades(nombre, direccion)")
        .order("creado_en", { ascending: false })
        .limit(200),
      supabase
        .from("obligaciones")
        .select("id, tipo, periodo, monto, saldo, estado, contrato_id")
        .in("estado", ["PENDIENTE", "PAGO_PARCIAL", "VENCIDA", "ATRASADA"])
        .order("fecha_vencimiento", { ascending: true })
        .limit(300),
      supabase.from("propiedades").select("id, nombre, direccion").limit(200),
    ]);

  const documentos = (documentosRes.data ?? []) as DocumentoRow[];
  const extracciones = (extraccionesRes.data ?? []) as ExtraccionRow[];

  const filas = documentos
    .map((d) => {
      const ext = extracciones.find((e) => e.documento_id === d.id) ?? null;
      return aFilaExtraccion(d, ext);
    })
    .filter((f) => f.tipo_documento === "BOLETA_SERVICIO" || f.tipo_documento === "COMPROBANTE_PAGO" || f.extraccion !== null);

  const contratos = ((contratosRes.data ?? []) as unknown as ContratoRow[]).map((c) => ({
    id: c.id,
    etiqueta: c.propiedades?.nombre || c.propiedades?.direccion || `Contrato ${c.id.slice(0, 8)}`,
    valor_arriendo: c.valor_arriendo,
    propiedad_id: c.propiedad_id,
  }));

  const obligaciones = ((obligacionesRes.data ?? []) as unknown as ObligacionRow[]).map((o) => ({
    id: o.id,
    tipo: o.tipo,
    periodo: o.periodo,
    monto: Number(o.monto),
    saldo: o.saldo === null ? null : Number(o.saldo),
    contrato_id: o.contrato_id,
    etiqueta: `${o.tipo.replaceAll("_", " ")} · ${o.periodo ? new Date(o.periodo).toLocaleDateString("es-CL", { month: "short", year: "numeric", timeZone: "UTC" }) : "s/periodo"}`,
  }));

  const propiedades = ((propiedadesRes.data ?? []) as unknown as PropiedadRow[]).map((p) => ({
    id: p.id,
    etiqueta: p.nombre || p.direccion || `Propiedad ${p.id.slice(0, 8)}`,
  }));

  const errorCarga =
    documentosRes.error ?? extraccionesRes.error ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carga Documentos OCR</h1>
        <p className="text-sm text-muted-foreground">
          Sube boletas/comprobantes para extraer sus datos automáticamente con OCR.
        </p>
      </div>

      {errorCarga ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No se pudieron cargar los documentos: {errorCarga.message}
        </p>
      ) : null}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Los archivos se guardan en el bucket <code className="text-xs">respaldos</code> y se
        procesan con el servicio OCR.
      </div>

      <SubirDocumentoOcr />

      <ExtraccionesOcr
        filas={filas}
        contratos={contratos}
        obligaciones={obligaciones}
        propiedades={propiedades}
      />
    </div>
  );
}
