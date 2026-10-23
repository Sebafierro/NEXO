"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Ban } from "lucide-react";
import { formatearMoneda } from "@/lib/format";
import { PropiedadForm, type PropiedadRow } from "./form";
import { darDeBajaPropiedad } from "./actions";

export type FilaPropiedad = PropiedadRow & { propietario_nombre: string | null };

type OpcionPropietario = { id: string; nombre: string };

type Props = {
  data: FilaPropiedad[];
  propietarios: OpcionPropietario[];
};

export function PropiedadesTable({ data, propietarios }: Props) {
  const columns: ColumnDef<FilaPropiedad>[] = [
    { header: "Propiedad", accessor: (r) => r.nombre ?? r.direccion },
    { header: "Ubicación", accessor: (r) => `${r.direccion}${r.comuna ? `, ${r.comuna}` : ""}` },
    { header: "Propietario", accessor: (r) => r.propietario_nombre ?? "—" },
    { header: "Tipo", accessor: (r) => r.tipo },
    {
      header: "Estado",
      accessor: (r) => <Badge variant="outline">{r.estado}</Badge>,
    },
    { header: "Arriendo", accessor: (r) => formatearMoneda(r.valor_arriendo) },
    {
      header: "Acciones",
      cellClassName: "text-right space-x-2",
      accessor: (r) => (
        <div className="flex justify-end gap-2">
          <PropiedadForm
            mode="editar"
            propiedad={r}
            propietarios={propietarios}
            trigger={
              <Button variant="ghost" size="icon" title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <form
            action={async () => {
              if (confirm("¿Dar de baja la propiedad (INACTIVA)?")) {
                await darDeBajaPropiedad(r.id);
              }
            }}
            className="inline-flex"
          >
            <Button variant="ghost" size="icon" type="submit" title="Dar de baja">
              <Ban className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
