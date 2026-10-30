import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ChartCard({ title, description, children, className, contentClassName }: ChartCardProps) {
  return (
    <Card className={cn("shadow-sm transition-shadow hover:shadow-md", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("h-[320px] w-full", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
