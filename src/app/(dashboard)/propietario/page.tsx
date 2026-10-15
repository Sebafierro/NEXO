import { StatCard } from "@/components/dashboard/stat-card";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { formatearMoneda } from "@/lib/format";


export const metadata: Metadata = {
  title: "Mis activos",
};

export const dynamic = "force-dynamic";

export default async function PropietarioDashboardPage() {
  await requerirRol(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR);

  const supabase = await createClient();

  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  // RLS filtra automáticamente: solo propiedades vinculadas al usuario autenticado.
  const [propiedadesRes, obligacionesRes, pagosRes] = await Promise.all([
    supabase.from("propiedades").select("id, estado, valor_arriendo"),
    supabase
      .from("obligaciones")
      .select("id, monto, estado, fecha_vencimiento")
      .gte("fecha_vencimiento", inicioMes),
    supabase.from("pagos").select("monto").gte("fecha_pago", inicioMes),
  ]);

  const propiedades = propiedadesRes.data ?? [];
  const total = propiedades.length;
  const arrendadas = propiedades.filter((p) => p.estado === "ARRENDADA").length;
  const disponibles = propiedades.filter((p) => p.estado === "DISPONIBLE").length;
  const flujoEsperado = propiedades.reduce((acc, p) => acc + Number(p.valor_arriendo), 0);

  const obligaciones = obligacionesRes.data ?? [];
  const alDia = obligaciones.filter((o) => o.estado === "PAGADA").length;
  const pendientes = obligaciones.filter((o) => o.estado === "PENDIENTE").length;
  const atrasadas = obligaciones.filter((o) => o.estado === "ATRASADA").length;
  const cobradoMes = (pagosRes.data ?? []).reduce((acc, p) => acc + Number(p.monto), 0);

  // TODO: Comentarios de los locales y KPI de rentabilidad neta (arriendo - gastos
  //       comunes - comisión NEXO) por propiedad.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Activos</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tus propiedades. El resto de la cartera no es visible para ti.
        </p>
      </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inmuebles a tu nombre" value={total} />
        <StatCard label="Arrendados" value={arrendadas} tone="positive" />
        <StatCard label="Disponibles" value={disponibles} />
        <StatCard label="Rentabilidad esperada / mes" value={formatearMoneda(flujoEsperado)} tone="positive" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Inmuebles al día (obligaciones pagadas este mes)" value={alDia} tone="positive" valueClassName="text-2xl" />
        <StatCard label="Pendientes de pago" value={pendientes} tone="warning" valueClassName="text-2xl" />
        <StatCard label={`Atrasadas al ${hoyISO}`} value={atrasadas} tone="negative" valueClassName="text-2xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Cobrado este mes" value={formatearMoneda(cobradoMes)} tone="positive" valueClassName="text-2xl" />
        <StatCard label="Por cobrar del mes en curso" value={formatearMoneda(flujoEsperado - cobradoMes)} tone="negative" valueClassName="text-2xl" />
      </div>

      <p className="text-sm text-muted-foreground">
        {/* TODO: mostrar contratos vigentes, documentos y liquidaciones por propiedad */}
        Próximamente: detalle de contratos, obligaciones y respaldos.
      </p>
    </div>
  );
}