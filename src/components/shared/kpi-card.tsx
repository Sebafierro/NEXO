import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import { LucideIcon } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { label: string; value?: string };
  className?: string;
};

export function KpiCard({ title, value, description, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("shadow-sm transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          {trend ? <p className="text-xs text-muted-foreground">{trend.value ? `${trend.value} · ` : ""}{trend.label}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
