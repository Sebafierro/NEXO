"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Algo salió mal
        </h1>
        <p className="mt-4 text-muted-foreground">
          Ocurrió un error inesperado. Puedes intentar nuevamente o volver a una página segura.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => reset()}>Intentar nuevamente</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
