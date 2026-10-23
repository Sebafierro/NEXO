"use client";

import { useState } from "react";
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
import { crearContrato, actualizarContrato } from "./actions";

type ContratoRow = {
  id: string;
  propiedad_id: string;
  arrendatario_id: string;
  fecha_inicio: string;
  fecha_termino: string | null;
  valor_arriendo: number;
  garantia_meses: number;
  dia_vencimiento: number;
  comision_porcentaje: number | null;
  estado: string;
};

type Props = {
  mode: "crear" | "editar";
  trigger: React.ReactNode;
  contrato?: ContratoRow;
  options: {
    props: { id: string; nombre: string | null }[];
    arr: { id: string; rut: string | null; nombres: string; apellidos: string }[];
  };
};

export function ContratoForm({ mode, trigger, contrato, options }: Props) {
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    if (mode === "editar" && contrato) await actualizarContrato(contrato.id, fd);
    else await crearContrato(fd);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "crear" ? "Agregar contrato" : "Editar contrato"}
          </DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="propiedad_id">Propiedad</Label>
            <Select
              name="propiedad_id"
              defaultValue={contrato?.propiedad_id ?? options.props[0]?.id ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {options.props.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="arrendatario_id">Arrendatario</Label>
            <Select
              name="arrendatario_id"
              defaultValue={contrato?.arrendatario_id ?? options.arr[0]?.id ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {options.arr.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.rut ? `${a.rut} - ` : ""}
                    {a.nombres} {a.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fecha_inicio">Fecha inicio</Label>
            <Input
              id="fecha_inicio"
              name="fecha_inicio"
              type="date"
              defaultValue={contrato?.fecha_inicio ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="fecha_termino">Fecha término</Label>
            <Input
              id="fecha_termino"
              name="fecha_termino"
              type="date"
              defaultValue={contrato?.fecha_termino ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="valor_arriendo">Valor arriendo</Label>
            <Input
              id="valor_arriendo"
              name="valor_arriendo"
              type="number"
              step="1"
              defaultValue={contrato?.valor_arriendo ?? 0}
              required
            />
          </div>
          <div>
            <Label htmlFor="garantia_meses">Garantía (meses)</Label>
            <Input
              id="garantia_meses"
              name="garantia_meses"
              type="number"
              step="1"
              defaultValue={contrato?.garantia_meses ?? 1}
            />
          </div>
          <div>
            <Label htmlFor="dia_vencimiento">Día de vencimiento (1-28)</Label>
            <Input
              id="dia_vencimiento"
              name="dia_vencimiento"
              type="number"
              min={1}
              max={28}
              step="1"
              defaultValue={contrato?.dia_vencimiento ?? 5}
              required
            />
          </div>
          <div>
            <Label htmlFor="comision_porcentaje">Comisión (%)</Label>
            <Input
              id="comision_porcentaje"
              name="comision_porcentaje"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={contrato?.comision_porcentaje ?? 0}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="estado">Estado</Label>
            <Select name="estado" defaultValue={contrato?.estado ?? "BORRADOR"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                <SelectItem value="RESCINDIDO">Rescindido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === "crear" ? "Guardar" : "Actualizar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
