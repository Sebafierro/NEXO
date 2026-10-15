import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { formatearFecha } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Carga de documentos OCR",
};

export const dynamic = "force-dynamic";

type DocumentoCargado = {
  id: string;
  nombre: string;
  tipo_documento: string;
  entidad_tipo: string;
  creado_en: string;
};

export default async function EjecutivoDocumentosPage() {
  await requerirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  // RLS: el EJECUTIVO ve todos los documentos de la cartera.
  const { data, error } = await supabase
    .from("documentos")
    .select("id, nombre, tipo_documento, entidad_tipo, creado_en")
    .order("creado_en", { ascending: false })
    .limit(20);

  const documentos = (data ?? []) as DocumentoCargado[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carga Documentos OCR</h1>
        <p className="text-sm text-muted-foreground">
          Sube contratos, comprobantes y respaldos para extraer sus datos automáticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zona de carga</CardTitle>
          <CardDescription>
            Los archivos se guardan en el bucket privado{" "}
            <code className="text-xs">respaldos</code> con la ruta{" "}
            <code className="text-xs">
              {`{user_id}/{entidad_tipo}/{archivo}`}
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TODO: selector de entidad (PROPIEDAD / CONTRATO / OBLIGACION / ARRENDATARIO)
              + input[type=file] con drag & drop, subida con
              supabase.storage.from("respaldos").upload() e inserción en
              public.documentos. */}
          {/* TODO: solicitar extracción (insert en public.extracciones_documento) y
              consultar el estado hasta "EXTRAIDA". */}
          {/* TODO: previsualizar los campos extraídos y permitir corregirlos antes de
              guardar (apuntando a contrato, obligación o pago). */}
          <p className="py-8 text-center text-sm text-muted-foreground">
            El formulario de carga se habilitará con el cliente de Supabase Storage.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos documentos cargados</CardTitle>
          <CardDescription>Los 20 más recientes del bucket.</CardDescription>
        </CardHeader>
        <CardContent>
          {error || documentos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error?.message ?? "Aún no hay documentos cargados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Carga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {d.tipo_documento.toLowerCase().replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.entidad_tipo.toLowerCase()}</TableCell>
                    <TableCell>{formatearFecha(d.creado_en)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}