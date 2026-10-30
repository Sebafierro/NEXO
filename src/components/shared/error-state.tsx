import { cn } from "cn";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "No se pudo cargar la información",
  description = "Ocurrió un error al obtener los datos. Puedes intentar nuevamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p> : null}
      {onRetry ? (
        <div className="mt-6">
          <Button variant="outline" onClick={onRetry}>
            Intentar nuevamente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
