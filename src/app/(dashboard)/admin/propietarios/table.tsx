"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { PropietarioForm } from "./form";
import { eliminarPropietario } from "./actions";
import { toast } from "sonner";

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
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            onClick={async () => {
              if (confirm("¿Eliminar propietario?")) {
                try {
                  await eliminarPropietario(r.id);
                  toast.success("Propietario eliminado correctamente");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo eliminar el propietario");
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
