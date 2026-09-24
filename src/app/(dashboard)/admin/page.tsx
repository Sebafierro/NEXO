import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarRol, ROLES } from "@/lib/roles";
import { formatearMoneda } from "@/lib/format";
import { Semaforo } from "./semaforo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Defensa extra: solo ADMINISTRADOR (el Proxy ya lo bloquea).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (normalizarRol(user?.app_metadata?.rol ?? user?.user_metadata?.rol) !== ROLES.ADMINISTRADOR) {
    redirect("/propietario");
  }

  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const finSemana = new Date(hoy);
  finSemana.setDate(finSemana.getDate() + 7);
  const finSemanaISO = finSemana.toISOString().slice(0, 10);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const [propiedadesRes, propietariosRes, contratosRes, enMoraRes, porVencerRes, pagosMesRes] =
    await Promise.all([
      supabase.from("propiedades").select("id, estado"),
      supabase
        .from("propietarios")
        .select("id", { count: "exact", head: true })
        .eq("estado", "ACTIVO"),
      supabase
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "VIGENTE"),
      supabase
        .from("obligaciones")
        .select("id, monto, contrato_id")
        .in("estado", ["PENDIENTE", "ATRASADA"])
        .lt("fecha_vencimiento", hoyISO),
      supabase
        .from("obligaciones")
        .select("id", { count: "exact", head: true })
        .eq("estado", "PENDIENTE")
        .gte("fecha_vencimiento", hoyISO)
        .lte("fecha_vencimiento", finSemanaISO),
      supabase.from("pagos").select("monto").gte("fecha_pago", inicioMes),
    ]);

  const propiedades = propiedadesRes.data ?? [];
  const totalPropiedades = propiedades.length;
  const arrendadas = propiedades.filter((p) => p.estado === "ARRENDADA").length;
  const disponibles = propiedades.filter((p) => p.estado === "DISPONIBLE").length;
  const enMantenimiento = propiedades.filter((p) => p.estado === "EN_MANTENIMIENTO").length;

  const propietariosActivos = propietariosRes.count ?? 0;
  const contratosVigentes = contratosRes.count ?? 0;

  const mora = enMoraRes.data ?? [];
  const enMora = mora.length;
  const moraMonto = mora.reduce((acc, o) => acc + Number(o.monto), 0);
  const contratosConMora = new Set(mora.map((o) => o.contrato_id)).size;
  const alDia = Math.max(0, contratosVigentes - contratosConMora);
  const porVencer = porVencerRes.count ?? 0;

  const ingresosMes = (pagosMesRes.data ?? []).reduce(
    (acc, p) => acc + Number(p.monto),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumen de la cartera</h1>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{totalPropiedades}</CardTitle>
            <CardDescription>Propiedades totales</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{arrendadas} arrendadas</span>
            <span>·</span>
            <span>{disponibles} disponibles</span>
            <span>·</span>
            <span>{enMantenimiento} en mantención</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{propietariosActivos}</CardTitle>
            <CardDescription>Propietarios activos</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cuentas con contratos vigentes y propiedades a cargo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {formatearMoneda(ingresosMes)}
            </CardTitle>
            <CardDescription>Ingresos del mes (pagos registrados)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Suma de pagos aplicados entre mes.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {formatearMoneda(moraMonto)}
            </CardTitle>
            <CardDescription>Mora acumulada</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {enMora} obligaciones vencidas sin pagar.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}