"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearPropiedad, actualizarPropiedad } from "./actions";

export type PropiedadRow = {
  id: string;
  propietario_id: string;
  nombre: string | null;
  direccion: string;
  comuna: string | null;
  region: string | null;
  tipo: string;
  estado: string;
  superficie_m2: number | null;
  habitaciones: number | null;
  banos: number | null;
  estacionamientos: number | null;
  valor_arriendo: number;
};

type OpcionPropietario = { id: string; nombre: string };

type Props = {
  mode: "crear" | "editar";
  trigger: React.ReactNode;
  propietarios: OpcionPropietario[];
  propiedad?: PropiedadRow;
};

const TIPOS = ["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "OTRO"];
const ESTADOS = ["DISPONIBLE", "ARRENDADA", "EN_MANTENIMIENTO", "INACTIVA"];

export function PropiedadForm({ mode, trigger, propietarios, propiedad }: Props) {
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    if (mode === "editar" && propiedad) {
      await actualizarPropiedad(propiedad.id, formData);
    } else {
      await crearPropiedad(formData);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "crear" ? "Agregar propiedad" : "Editar propiedad"}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="propietario_id">Propietario</Label>
            <Select name="propietario_id" defaultValue={propiedad?.propietario_id ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar propietario" />
              </SelectTrigger>
              <SelectContent>
                {propietarios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={propiedad?.nombre ?? ""} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={propiedad?.direccion ?? ""} required />
          </div>
          <div>
            <Label htmlFor="comuna">Comuna</Label>
            <Input id="comuna" name="comuna" defaultValue={propiedad?.comuna ?? ""} />
          </div>
          <div>
            <Label htmlFor="region">Región</Label>
            <Input id="region" name="region" defaultValue={propiedad?.region ?? ""} />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select name="tipo" defaultValue={propiedad?.tipo ?? "DEPARTAMENTO"}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Select name="estado" defaultValue={propiedad?.estado ?? "DISPONIBLE"}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="superficie_m2">Superficie (m²)</Label>
            <Input
              id="superficie_m2"
              name="superficie_m2"
              type="number"
              step="0.01"
              min="0"
              defaultValue={propiedad?.superficie_m2 ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="valor_arriendo">Valor arriendo ($)</Label>
            <Input
              id="valor_arriendo"
              name="valor_arriendo"
              type="number"
              step="1"
              min="0"
              defaultValue={propiedad?.valor_arriendo ?? ""}
              required
            />
          </div>
          <div>
            <Label htmlFor="habitaciones">Habitaciones</Label>
            <Input
              id="habitaciones"
              name="habitaciones"
              type="number"
              min="0"
              defaultValue={propiedad?.habitaciones ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="banos">Baños</Label>
            <Input id="banos" name="banos" type="number" min="0" defaultValue={propiedad?.banos ?? ""} />
          </div>
          <div>
            <Label htmlFor="estacionamientos">Estacionamientos</Label>
            <Input
              id="estacionamientos"
              name="estacionamientos"
              type="number"
              min="0"
              defaultValue={propiedad?.estacionamientos ?? ""}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{mode === "crear" ? "Guardar" : "Actualizar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
