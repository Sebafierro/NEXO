"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { PropietarioForm } from "./form";
import { eliminarPropietario } from "./actions";

export type PropietarioRow = {
  id: string;
  rut: string | null;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: string;
};

type Props = {
  data: PropietarioRow[];
};

export function PropietariosTable({ data }: Props) {
  const columns: ColumnDef<PropietarioRow>[] = [
    { header: "RUT", accessor: (r) => r.rut ?? "—" },
    { header: "Nombre", accessor: (r) => `${r.nombres} ${r.apellidos}` },
    { header: "Teléfono", accessor: (r) => r.telefono ?? "—" },
    { header: "Email", accessor: (r) => r.email ?? "—" },
    {
      header: "Estado",
      accessor: (r) => (
        <Badge variant="outline">{r.estado}</Badge>
      ),
    },
    {
      header: "Acciones",
      cellClassName: "text-right space-x-2",
      accessor: (r) => (
        <div className="flex justify-end gap-2">
          <PropietarioForm
            mode="editar"
            propietario={r}
            trigger={
              <Button variant="ghost" size="icon" title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <form
            action={async () => {
              if (confirm("¿Eliminar propietario?")) {
                await eliminarPropietario(r.id);
              }
            }}
            className="inline-flex"
          >
            <Button variant="ghost" size="icon" type="submit" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
