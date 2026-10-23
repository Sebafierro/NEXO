import { Button } from "@/components/ui/button";

export function ReciboSaldado({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <Button asChild size="sm" variant="outline">
      <a href={url} target="_blank" rel="noopener noreferrer">Descargar recibo período saldado</a>
    </Button>
  );
}
