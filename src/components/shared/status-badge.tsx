import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

type Status = 
  | "PENDIENTE" | "GENERADA" | "APROBADA" | "RECHAZADA" | "PAGADA" | "PAGO_PARCIAL" | "VENCIDA" | "ATRASADA" | "VALIDADO" | "PENDIENTE_VALIDACION" | "RECHAZADO" 
  | "BORRADOR" | "VIGENTE" | "FINALIZADO" | "RESCINDIDO" 
  | "ACTIVO" | "INACTIVO" 
  | "DISPONIBLE" | "ARRENDADA" | "EN_MANTENIMIENTO" 
  | "CONCILIADO" | "CON_DIFERENCIA" | "SOLICITADA" | "EN_PROCESO" | "EXTRAIDO" | "CONFIRMADO" | "SIN_ASIGNAR";

const STATUS_STYLES: Record<string, string> = {
  APROBADA: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  PAGADA: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  VALIDADO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  CONFIRMADO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  VIGENTE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  ACTIVO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  ARRENDADA: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  CONCILIADO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  PENDIENTE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  GENERADA: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  PAGO_PARCIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  PENDIENTE_VALIDACION: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  SOLICITADA: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  EN_PROCESO: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  EXTRAIDO: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  RECHAZADA: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  RECHAZADO: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  VENCIDA: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  ATRASADA: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  BORRADOR: "bg-muted text-muted-foreground border-border",
  FINALIZADO: "bg-muted text-muted-foreground border-border",
  RESCINDIDO: "bg-muted text-muted-foreground border-border",
  INACTIVO: "bg-muted text-muted-foreground border-border",
  DISPONIBLE: "bg-muted text-muted-foreground border-border",
  EN_MANTENIMIENTO: "bg-muted text-muted-foreground border-border",
  CON_DIFERENCIA: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  SIN_ASIGNAR: "bg-muted text-muted-foreground border-border",
};

type StatusBadgeProps = {
  status: string | null | undefined;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const s = (status || "").toString();
  const style = STATUS_STYLES[s] || "bg-muted text-muted-foreground border-border";
  const text = label || s.replaceAll("_", " ");
  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-medium", style, className)}>
      {text}
    </Badge>
  );
}
