"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearArrendatario, actualizarArrendatario } from "./actions";

type Row = { id: string; rut: string|null; nombres: string; apellidos: string; telefono: string|null; email: string|null; estado: string };
type Props = { mode: "crear"|"editar"; trigger: React.ReactNode; arrendatario?: Row };

export function ArrendatarioForm({ mode, trigger, arrendatario }: Props) {
  const [open, setOpen] = useState(false);
  async function onSubmit(fd: FormData) {
    if (mode==='editar' && arrendatario) await actualizarArrendatario(arrendatario.id, fd);
    else await crearArrendatario(fd);
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{mode==='crear'?'Agregar arrendatario':'Editar arrendatario'}</DialogTitle></DialogHeader>
        <form action={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label htmlFor="rut">RUT</Label><Input id="rut" name="rut" defaultValue={arrendatario?.rut??""} required/></div>
          <div><Label htmlFor="nombres">Nombres</Label><Input id="nombres" name="nombres" defaultValue={arrendatario?.nombres??""} required/></div>
          <div><Label htmlFor="apellidos">Apellidos</Label><Input id="apellidos" name="apellidos" defaultValue={arrendatario?.apellidos??""} required/></div>
          <div><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" name="telefono" defaultValue={arrendatario?.telefono??""}/></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={arrendatario?.email??""}/></div>
          <div className="col-span-2"><Label htmlFor="direccion">Dirección</Label><Input id="direccion" name="direccion" defaultValue={(arrendatario as any)?.direccion??""}/></div>
          <div className="col-span-2"><Label htmlFor="estado">Estado</Label><Select name="estado" defaultValue={arrendatario?.estado??"ACTIVO"}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ACTIVO">ACTIVO</SelectItem><SelectItem value="INACTIVO">INACTIVO</SelectItem></SelectContent></Select></div>
          <div className="col-span-2 flex justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit">{mode==='crear'?'Guardar':'Actualizar'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
