import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatearMoneda } from "@/lib/format";

type Props = {
  alDia: number;
  porVencer: number;
  enMora: number;
  moraMonto: number;
  totalContratos: number;
};

// Componente compartido por los paneles de ADMINISTRADOR y EJECUTIVO.
// "Semáforo de estado de la cartera":
//  - Verde : contratos vigentes que no acumulan mora.
//  - Ámbar : obligaciones por vencer en los próximos 7 días.
//  - Rojo  : obligaciones vencidas sin pagar.
export function Semaforo({ alDia, porVencer, enMora, moraMonto, totalContratos }: Props) {
  const porcentaje = (n: number) =>
    totalContratos > 0 ? Math.min(100, Math.round((n / totalContratos) * 100)) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Al día</CardTitle>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Sin mora
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold">{alDia}</p>
          <Progress value={porcentaje(alDia)} className="bg-emerald-500/20" />
          <CardDescription>
            {porcentaje(alDia)}% de los contratos vigentes
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Por vencer</CardTitle>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Próximos 7 días
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold">{porVencer}</p>
          <Progress value={porcentaje(porVencer)} className="bg-amber-500/20" />
          <CardDescription>Obligaciones por vencer</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">En mora</CardTitle>
          <Badge variant="destructive">Atrasadas</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold">{enMora}</p>
          <Progress value={porcentaje(enMora)} className="bg-destructive/20" />
          <CardDescription>Total adeudado: {formatearMoneda(moraMonto)}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}