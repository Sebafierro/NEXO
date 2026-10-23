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
import { crearCuentaServicio, actualizarCuentaServicio } from "./actions";

type Row = {
  id: string;
  propiedad_id: string;
  tipo_servicio: string;
  empresa: string;
  numero_cliente: string;
  numero_cuenta: string | null;
  monto_mensual: number | null;
  activo: boolean;
};

type Props = {
  mode: "crear" | "editar";
  trigger: React.ReactNode;
  cuenta?: Row;
  options: { props: { id: string; nombre: string | null }[] };
};

export function CuentaServicioForm({ mode, trigger, cuenta, options }: Props) {
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    if (mode === "editar" && cuenta) await actualizarCuentaServicio(cuenta.id, fd);
    else await crearCuentaServicio(fd);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "crear"
              ? "Agregar cuenta de servicios"
              : "Editar cuenta de servicios"}
          </DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="propiedad_id">Propiedad</Label>
            <Select
              name="propiedad_id"
              defaultValue={cuenta?.propiedad_id ?? options.props[0]?.id ?? ""}
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
            <Label htmlFor="tipo_servicio">Tipo</Label>
            <Select
              name="tipo_servicio"
              defaultValue={cuenta?.tipo_servicio ?? "AGUA"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGUA">Agua</SelectItem>
                <SelectItem value="ELECTRICIDAD">Electricidad</SelectItem>
                <SelectItem value="GAS">Gas</SelectItem>
                <SelectItem value="GASTOS_COMUNES">Gastos comunes</SelectItem>
                <SelectItem value="INTERNET">Internet</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estado-activo">Estado</Label>
            <Select
              name="activo"
              defaultValue={cuenta ? String(cuenta.activo) : "true"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activa</SelectItem>
                <SelectItem value="false">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              name="empresa"
              defaultValue={cuenta?.empresa ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="numero_cliente">N° Cliente</Label>
            <Input
              id="numero_cliente"
              name="numero_cliente"
              defaultValue={cuenta?.numero_cliente ?? ""}
              required
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="numero_cuenta">N° Cuenta</Label>
            <Input
              id="numero_cuenta"
              name="numero_cuenta"
              defaultValue={cuenta?.numero_cuenta ?? ""}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="monto_mensual">Monto mensual esperado ($)</Label>
            <Input
              id="monto_mensual"
              name="monto_mensual"
              type="number"
              min="0"
              step="1"
              defaultValue={cuenta?.monto_mensual ?? ""}
              placeholder="Sin monto: no genera obligación"
            />
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
