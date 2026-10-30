"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  propiedadesActivas: number;
  contratosVigentes: number;
  obligacionesVencidas: number;
  liquidacionesPendientes: number;
  documentosPendientes: number;
  porEstadoPropiedades?: Array<{ name: string; value: number }>;
};

const BAR_COLORS = [
  "#2563eb", // blue-600
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
];

const PIE_COLORS = [
  "#22c55e", // arrendadas
  "#94a3b8", // disponibles
  "#f59e0b", // en mantenimiento
  "#a855f7", // otros
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
        <p className="text-sm font-medium">{label || payload[0]?.name}</p>
        <p className="text-sm text-primary">{payload[0]?.value}</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
        <p className="text-sm font-medium">{data.name}</p>
        <p className="text-sm text-primary">{data.value} ({((data.payload?.percent || 0) * 100).toFixed(0)}%)</p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({
  propiedadesActivas,
  contratosVigentes,
  obligacionesVencidas,
  liquidacionesPendientes,
  documentosPendientes,
  porEstadoPropiedades = [],
}: Props) {
  const barData = useMemo(
    () => [
      { name: "Propiedades activas", value: propiedadesActivas, fill: BAR_COLORS[0] },
      { name: "Contratos vigentes", value: contratosVigentes, fill: BAR_COLORS[1] },
      { name: "Obligaciones vencidas", value: obligacionesVencidas, fill: BAR_COLORS[2] },
      { name: "Liquidaciones por aprobar", value: liquidacionesPendientes, fill: BAR_COLORS[3] },
      { name: "Docs. por procesar", value: documentosPendientes, fill: BAR_COLORS[4] },
    ],
    [propiedadesActivas, contratosVigentes, obligacionesVencidas, liquidacionesPendientes, documentosPendientes]
  );

  const pieData = porEstadoPropiedades.filter((d) => d.value > 0).map((d, idx) => ({ ...d, fill: PIE_COLORS[idx % PIE_COLORS.length] }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
          <CardDescription>Comparativa de indicadores clave</CardDescription>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 20, left: -10, bottom: 60 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="value" name="Cantidad" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {pieData.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Propiedades por estado</CardTitle>
            <CardDescription>Distribución real de la cartera</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
