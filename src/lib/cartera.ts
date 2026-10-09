import type { SupabaseClient } from "@supabase/supabase-js";

export type ResumenCartera = {
  totalPropiedades: number;
  arrendadas: number;
  disponibles: number;
  enMantenimiento: number;
  propietariosActivos: number;
  contratosVigentes: number;
  // Semáforo de cartera
  alDia: number;
  porVencer: number;
  enMora: number;
  moraMonto: number;
  // Recaudación
  ingresosMes: number;
};

// Métricas compartidas por los paneles de ADMINISTRADOR y EJECUTIVO.
// El cliente de Supabase debe venir de createClient() (@/lib/supabase/server),
// de modo que las consultas se ejecutan con el JWT del usuario y la RLS vigente.
export async function obtenerResumenCartera(supabase: SupabaseClient): Promise<ResumenCartera> {
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const finSemana = new Date(hoy);
  finSemana.setDate(finSemana.getDate() + 7);
  const finSemanaISO = finSemana.toISOString().slice(0, 10);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const [propiedadesRes, propietariosRes, contratosRes, moraRes, porVencerRes, pagosMesRes] =
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
  const mora = moraRes.data ?? [];
  const contratosVigentes = contratosRes.count ?? 0;
  const contratosConMora = new Set(mora.map((o) => o.contrato_id)).size;

  return {
    totalPropiedades: propiedades.length,
    arrendadas: propiedades.filter((p) => p.estado === "ARRENDADA").length,
    disponibles: propiedades.filter((p) => p.estado === "DISPONIBLE").length,
    enMantenimiento: propiedades.filter((p) => p.estado === "EN_MANTENIMIENTO").length,
    propietariosActivos: propietariosRes.count ?? 0,
    contratosVigentes,
    alDia: Math.max(0, contratosVigentes - contratosConMora),
    porVencer: porVencerRes.count ?? 0,
    enMora: mora.length,
    moraMonto: mora.reduce((acc, o) => acc + Number(o.monto), 0),
    ingresosMes: (pagosMesRes.data ?? []).reduce((acc, p) => acc + Number(p.monto), 0),
  };
}