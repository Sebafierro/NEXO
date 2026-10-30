"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearFecha } from "@/lib/format";

type AuditRow = {
  id: string | null;
  fecha: string | null;
  accion: string | null;
  entidad: string | null;
  entidad_id: string | null;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  ip: string | null;
  valor_anterior: unknown;
  valor_nuevo: unknown;
};

export function AuditLogTable({ data }: { data: AuditRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entidad, setEntidad] = useState(searchParams.get("entidad") ?? "");
  const [accion, setAccion] = useState(searchParams.get("accion") ?? "");
  const [usuario, setUsuario] = useState(searchParams.get("usuario") ?? "");
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  const aplicarFiltros = () => {
    const params = new URLSearchParams();
    if (entidad) params.set("entidad", entidad);
    if (accion) params.set("accion", accion);
    if (usuario) params.set("usuario", usuario);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    router.push(`/admin/auditoria?${params.toString()}`);
  };

  const limpiar = () => {
    setEntidad("");
    setAccion("");
    setUsuario("");
    setDesde("");
    setHasta("");
    router.push("/admin/auditoria");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="entidad">Entidad</Label>
          <Input id="entidad" value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="usuarios, contratos..." />
        </div>
        <div className="space-y-1">
          <Label htmlFor="accion">Acción</Label>
          <Input id="accion" value={accion} onChange={(e) => setAccion(e.target.value)} placeholder="INSERT/UPDATE/DELETE" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="usuario">Usuario</Label>
          <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="email o nombre" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={aplicarFiltros}>Filtrar</Button>
        <Button variant="outline" onClick={limpiar}>Limpiar</Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Entidad ID</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Valor anterior</TableHead>
              <TableHead>Valor nuevo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Sin registros
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  <TableCell className="whitespace-nowrap">{row.fecha ? formatearFecha(row.fecha) : "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{row.usuario_nombre || "-"}</div>
                    <div className="text-xs text-muted-foreground">{row.usuario_email || "-"}</div>
                  </TableCell>
                  <TableCell>{row.accion}</TableCell>
                  <TableCell>{row.entidad}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{row.entidad_id || "-"}</TableCell>
                  <TableCell>{row.ip || "-"}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs">{row.valor_anterior ? JSON.stringify(row.valor_anterior) : "-"}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs">{row.valor_nuevo ? JSON.stringify(row.valor_nuevo) : "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
