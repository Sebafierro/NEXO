import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Página no encontrada
        </h1>
        <p className="mt-4 text-muted-foreground">
          La página que buscas no existe o ya no está disponible.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
