"use client";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { formatearMoneda } from "@/lib/format";
import { CuentaServicioForm } from "./form";
import { eliminarCuentaServicio } from "./actions";

type Row = {
  id: string;
  propiedad_id: string;
  tipo_servicio: string;
  empresa: string;
  numero_cliente: string;
  numero_cuenta: string | null;
  monto_mensual: number | null;
  activo: boolean;
  propiedades?: { nombre: string | null } | null;
};

type Props = {
  data: Row[];
  options: { props: { id: string; nombre: string | null }[] };
};

const ETIQUETA_TIPO: Record<string, string> = {
  AGUA: "Agua",
  ELECTRICIDAD: "Electricidad",
  GAS: "Gas",
  GASTOS_COMUNES: "Gastos comunes",
  INTERNET: "Internet",
  OTRO: "Otro",
};

export function CuentasServiciosTable({ data, options }: Props) {
  const cols: ColumnDef<Row>[] = [
    {
      header: "Propiedad",
      accessor: (r) => r.propiedades?.nombre ?? r.propiedad_id,
    },
    {
      header: "Tipo",
      accessor: (r) => <Badge variant="outline">{ETIQUETA_TIPO[r.tipo_servicio] ?? r.tipo_servicio}</Badge>,
    },
    { header: "Empresa", accessor: (r) => r.empresa },
    { header: "N° Cliente", accessor: (r) => r.numero_cliente },
    { header: "N° Cuenta", accessor: (r) => r.numero_cuenta ?? "—" },
    {
      header: "Monto esperado",
      accessor: (r) => (r.monto_mensual == null ? "—" : formatearMoneda(Number(r.monto_mensual))),
    },
    {
      header: "Estado",
      accessor: (r) => (
        <Badge variant={r.activo ? "default" : "secondary"}>
          {r.activo ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      cellClassName: "text-right space-x-2",
      accessor: (r) => (
        <div className="flex justify-end gap-2">
          <CuentaServicioForm
            mode="editar"
            cuenta={r}
            options={options}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <form
            action={async () => {
              if (confirm("¿Eliminar cuenta de servicios?")) {
                await eliminarCuentaServicio(r.id);
              }
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
