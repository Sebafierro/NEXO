import type { Metadata } from "next";
import Link from "next/link";
import { FileScan, Receipt, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { obtenerResumenCartera } from "@/lib/cartera";
import { formatearMoneda } from "@/lib/format";
import { Semaforo } from "@/components/dashboard/semaforo";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Panel operativo",
};

export const dynamic = "force-dynamic";

const ACCESOS_RAPIDOS = [
  {
    href: "/ejecutivo/documentos",
    label: "Carga Documentos OCR",
    descripcion: "Sube contratos y comprobantes para extraer datos automáticamente.",
    icon: FileScan,
  },
  {
    href: "/ejecutivo/conciliacion",
    label: "Conciliación",
    descripcion: "Cruza pagos registrados contra las obligaciones de cada contrato.",
    icon: Scale,
  },
  {
    href: "/ejecutivo/liquidaciones",
    label: "Generar Liquidaciones",
    descripcion: "Cierra el periodo y envía las liquidaciones a aprobación.",
    icon: Receipt,
  },
];

export default async function EjecutivoDashboardPage() {
  await requerirRol(ROLES.EJECUTIVO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();
  const resumen = await obtenerResumenCartera(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Operativo</h1>
        <p className="text-sm text-muted-foreground">
          Estado de la cartera y accesos rápidos a tus tareas del día.
        </p>
      </div>

      <Semaforo
        alDia={resumen.alDia}
        porVencer={resumen.porVencer}
        enMora={resumen.enMora}
        moraMonto={resumen.moraMonto}
        totalContratos={resumen.contratosVigentes}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{resumen.contratosVigentes}</CardTitle>
            <CardDescription>Contratos vigentes</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{resumen.totalPropiedades}</CardTitle>
            <CardDescription>Propiedades en cartera</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {formatearMoneda(resumen.ingresosMes)}
            </CardTitle>
            <CardDescription>Recaudación del mes</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ACCESOS_RAPIDOS.map((acceso) => (
          <Card key={acceso.href} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <acceso.icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{acceso.label}</CardTitle>
              </div>
              <CardDescription>{acceso.descripcion}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={acceso.href}>Abrir</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {/* TODO: cola de trabajo del día (documentos por extraer, pagos sin conciliar,
            liquidaciones del periodo por enviar a aprobación). */}
      </p>
    </div>
  );
}