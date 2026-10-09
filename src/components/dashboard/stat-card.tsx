import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "warning" | "negative";

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  description?: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "flat";
    positive?: boolean;
  };
  href?: string;
  tone?: Tone;
  className?: string;
  valueClassName?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  href,
  tone = "default",
  className,
  valueClassName,
}: StatCardProps) {
  const toneCls = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    negative: "text-destructive",
  }[tone];

  const content = (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
        <CardTitle className={cn("text-3xl font-bold", toneCls, valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
