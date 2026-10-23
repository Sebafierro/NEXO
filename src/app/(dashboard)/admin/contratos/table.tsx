"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { ContratoForm } from "./form";
import { eliminarContrato } from "./actions";
import { formatearMoneda } from "@/lib/format";

type Row = {
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
  propiedades?: { nombre: string | null } | null;
  arrendatarios?: { nombres: string; apellidos: string } | null;
};

type Props = {
  data: Row[];
  options: {
    props: { id: string; nombre: string | null }[];
    arr: { id: string; rut: string | null; nombres: string; apellidos: string }[];
  };
};

const ETIQUETA_ESTADO: Record<string, string> = {
  BORRADOR: "Borrador",
  VIGENTE: "Vigente",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
};

export function ContratosTable({ data, options }: Props) {
  const cols: ColumnDef<Row>[] = [
    { header: "Propiedad", accessor: (r) => r.propiedades?.nombre ?? r.propiedad_id },
    {
      header: "Arrendatario",
      accessor: (r) =>
        r.arrendatarios
          ? `${r.arrendatarios.nombres} ${r.arrendatarios.apellidos}`
          : r.arrendatario_id,
    },
    { header: "Inicio", accessor: (r) => r.fecha_inicio },
    { header: "Término", accessor: (r) => r.fecha_termino ?? "—" },
    { header: "Arriendo", accessor: (r) => formatearMoneda(Number(r.valor_arriendo)) },
    {
      header: "Estado",
      accessor: (r) => (
        <Badge variant="outline">{ETIQUETA_ESTADO[r.estado] ?? r.estado}</Badge>
      ),
    },
    {
      header: "Acciones",
      cellClassName: "text-right space-x-2",
      accessor: (r) => (
        <div className="flex justify-end gap-2">
          <ContratoForm
            mode="editar"
            contrato={r}
            options={options}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <form
            action={async () => {
              if (confirm("¿Eliminar contrato?")) await eliminarContrato(r.id);
            }}
            className="inline-flex"
          >
            <Button variant="ghost" size="icon" type="submit">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ),
    },
  ];
  return <DataTable columns={cols} data={data} />;
}
