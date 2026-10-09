import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { obtenerResumenCartera } from "@/lib/cartera";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { Semaforo } from "@/components/dashboard/semaforo";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Dashboard gerencial",
};

export const dynamic = "force-dynamic";

type ObligacionVencida = {
  id: string;
  monto: number;
  tipo: string;
  fecha_vencimiento: string;
  contratos: {
    propiedades: { nombre: string | null; direccion: string } | null;
  } | null;
};

type ExtraccionPendiente = {
  id: string;
  estado: string;
  documentos: {
    nombre: string;
    tipo_documento: string;
    entidad_tipo: string;
  } | null;
};

export default async function AdminDashboardPage() {
  // Defensa extra por si se accede directo a la URL (el Proxy ya lo bloquea).
  await requerirRol(ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  const [resumen, alertasRes, documentosRes] = await Promise.all([
    obtenerResumenCartera(supabase),
    // Alertas: obligaciones vencidas con su propiedad para contextualizar.
    supabase
      .from("obligaciones")
      .select(
        "id, monto, tipo, fecha_vencimiento, contratos(propiedades(nombre, direccion))",
      )
      .eq("estado", "ATRASADA")
      .order("fecha_vencimiento", { ascending: true })
      .limit(6),
    // Alertas: documentos cargados cuya extracción OCR sigue pendiente.
    supabase
      .from("extracciones_documento")
      .select("id, estado, documentos(nombre, tipo_documento, entidad_tipo)")
      .in("estado", ["SOLICITADA", "EN_PROCESO"])
      .order("creado_en", { ascending: true })
      .limit(6),
  ]);

  const {
    totalPropiedades,
    arrendadas,
    disponibles,
    enMantenimiento,
    propietariosActivos,
    contratosVigentes,
    alDia,
    porVencer,
    enMora,
    moraMonto,
    ingresosMes,
  } = resumen;

  const alertas = (alertasRes.data ?? []) as unknown as ObligacionVencida[];
  const documentosPendientes = (documentosRes.data ??
    []) as unknown as ExtraccionPendiente[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard Gerencial
        </h1>
        <p className="text-sm text-muted-foreground">
          Indicadores generales de las propiedades y su estado financiero.
        </p>
      </div>

      <Semaforo
        alDia={alDia}
        porVencer={porVencer}
        enMora={enMora}
        moraMonto={moraMonto}
        totalContratos={contratosVigentes}
      />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Propiedades totales"
          value={totalPropiedades}
          description={
            <span className="flex flex-wrap gap-2">
              <span>{arrendadas} arrendadas</span>
              <span>·</span>
              <span>{disponibles} disponibles</span>
              <span>·</span>
              <span>{enMantenimiento} en mantención</span>
            </span>
          }
        />
        <StatCard
          label="Propietarios activos"
          value={propietariosActivos}
          description="Cuentas con contratos vigentes y propiedades a cargo."
        />
        <StatCard
          label="Ingresos del mes (pagos registrados)"
          value={formatearMoneda(ingresosMes)}
          description="Suma de pagos aplicados entre mes."
          tone="positive"
        />
        <StatCard
          label="Mora acumulada"
          value={formatearMoneda(moraMonto)}
          description={`${enMora} obligaciones vencidas sin pagar.`}
          tone="negative"
        />
      </div>

      {/* TODO: reemplazar por liquidaciones reales una vez exista la tabla
          public.liquidaciones (ver bloque de TODOs en supabase/02_roles_extension.sql). */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones por aprobar</CardTitle>
          <CardDescription>
            Pendiente de implementación: la tabla de liquidaciones aún no
            existe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí irá el listado de liquidaciones generadas por el EJECUTIVO y
            pendientes de aprobación del administrador.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de cartera</CardTitle>
            <CardDescription>
              Obligaciones vencidas con mayor antigüedad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin obligaciones vencidas.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.map((o) => {
                    const propiedad = o.contratos?.propiedades;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          {propiedad?.nombre ??
                            propiedad?.direccion ??
                            "Sin nombre"}
                          <p className="text-xs font-normal text-muted-foreground">
                            {o.tipo.replaceAll("_", " ").toLowerCase()}
                          </p>
                        </TableCell>
                        <TableCell>
                          {formatearFecha(o.fecha_vencimiento)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatearMoneda(Number(o.monto))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos por procesar (OCR)</CardTitle>
            <CardDescription>
              Extracciones solicitadas o en proceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentosPendientes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay documentos pendientes de extracción.
              </p>
            ) : (
              <ul className="space-y-2">
                {documentosPendientes.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.documentos?.nombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.documentos?.entidad_tipo.toLowerCase()} ·{" "}
                        {e.documentos?.tipo_documento
                          .toLowerCase()
                          .replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        e.estado === "EN_PROCESO" ? "secondary" : "outline"
                      }
                    >
                      {e.estado === "EN_PROCESO" ? "En proceso" : "Solicitada"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {/* TODO: link a /ejecutivo/documentos y reprocesamiento con un clic. */}
              El EJECUTIVO gestiona la carga en &quot;Carga Documentos
              OCR&quot;.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
