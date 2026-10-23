"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { ArrendatarioForm } from "./form";
import { eliminarArrendatario } from "./actions";

type Row = { id: string; rut: string|null; nombres: string; apellidos: string; telefono: string|null; email: string|null; direccion: string|null; estado: string };
type Props = { data: Row[] };

export function ArrendatariosTable({ data }: Props) {
  const cols: ColumnDef<Row>[] = [
    { header: "RUT", accessor: (r)=>r.rut??"—" },
    { header: "Nombre", accessor: (r)=>`${r.nombres} ${r.apellidos}` },
    { header: "Teléfono", accessor: (r)=>r.telefono??"—" },
    { header: "Email", accessor: (r)=>r.email??"—" },
    { header: "Estado", accessor: (r)=>(<Badge variant="outline">{r.estado}</Badge>) },
    { header: "Acciones", cellClassName:"text-right space-x-2", accessor: (r)=>(
      <div className="flex justify-end gap-2">
        <ArrendatarioForm mode="editar" arrendatario={r} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4"/></Button>}/>
        <form action={async()=>{ if(confirm("¿Eliminar arrendatario?")) await eliminarArrendatario(r.id); }} className="inline-flex">
          <Button variant="ghost" size="icon" type="submit"><Trash2 className="h-4 w-4"/></Button>
        </form>
      </div>
    )},
  ];
  return <DataTable columns={cols} data={data}/>;
}
