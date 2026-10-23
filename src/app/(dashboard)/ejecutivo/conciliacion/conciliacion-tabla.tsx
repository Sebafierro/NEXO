"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha, formatearMoneda } from "@/lib/format";
import { registrarPago, conciliarObligacion } from "./actions";

export type FilaConciliacion = {
  id: string;
  tipo: string;
  monto: number;
  montoPagado: number;
  saldo: number;
  estado: string;
  fechaVencimiento: string;
  propiedad: string | null;
  semaforo: "VERDE" | "AMARILLO" | "ROJO";
};

const CLASE_SEMAFORO = {
  VERDE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  AMARILLO: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ROJO: "bg-destructive/10 text-destructive",
} as const;

const ETIQUETA_SEMAFORO = { VERDE: "Verde", AMARILLO: "Ámbar", ROJO: "Rojo" } as const;

const CLASE_ESTADO: Record<string, string> = {
  PAGADA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PENDIENTE: "",
  PAGO_PARCIAL: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  VENCIDA: "bg-destructive/10 text-destructive",
  ATRASADA: "bg-destructive/10 text-destructive",
};

function PagoDialog({ obligacion }: { obligacion: FilaConciliacion }) {
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    await registrarPago(obligacion.id, formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 text-sm text-muted-foreground">
            {obligacion.tipo.toLowerCase().replaceAll("_", " ")} ·{" "}
            {obligacion.propiedad ?? "Sin propiedad"} · saldo{" "}
            {formatearMoneda(obligacion.saldo)}
          </div>
          <div className="col-span-2">
            <Label htmlFor={`monto-${obligacion.id}`}>Monto ($)</Label>
            <Input
              id={`monto-${obligacion.id}`}
              name="monto"
              type="number"
              min="1"
              step="1"
              defaultValue={obligacion.saldo}
              required
            />
          </div>
          <div>
            <Label htmlFor={`metodo-${obligacion.id}`}>Método</Label>
            <Select name="metodo_pago" defaultValue="TRANSFERENCIA">
              <SelectTrigger id={`metodo-${obligacion.id}`}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`fecha-${obligacion.id}`}>Fecha de pago</Label>
            <Input id={`fecha-${obligacion.id}`} name="fecha_pago" type="date" />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`ref-${obligacion.id}`}>Referencia</Label>
            <Input id={`ref-${obligacion.id}`} name="referencia" placeholder="N.º operación, comprobante…" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConciliacionTabla({ data }: { data: FilaConciliacion[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Propiedad</TableHead>
            <TableHead>Obligación</TableHead>
            <TableHead>Semáforo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Pagado</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.propiedad ?? "—"}</TableCell>
              <TableCell>
                {o.tipo.toLowerCase().replaceAll("_", " ")}
                <p className="text-xs font-normal text-muted-foreground">
                  Vence {formatearFecha(o.fechaVencimiento)}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={CLASE_SEMAFORO[o.semaforo]}>
                  {ETIQUETA_SEMAFORO[o.semaforo]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={CLASE_ESTADO[o.estado]}>
                  {o.estado.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatearMoneda(o.monto)}</TableCell>
              <TableCell className="text-right">{formatearMoneda(o.montoPagado)}</TableCell>
              <TableCell className="text-right">{formatearMoneda(o.saldo)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <PagoDialog obligacion={o} />
                  <form
                    action={async (formData) => {
                      if (confirm("¿Conciliar esta obligación con sus pagos registrados?")) {
                        await conciliarObligacion(o.id, formData);
                      }
                    }}
                    className="inline-flex"
                  >
                    <Button variant="ghost" size="sm" type="submit">
                      Conciliar
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
