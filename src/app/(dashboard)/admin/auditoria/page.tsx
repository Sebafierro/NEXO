import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogTable } from "./audit-table";

export const metadata: Metadata = {
  title: "Auditoría",
};

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string; accion?: string; usuario?: string; desde?: string; hasta?: string }>;
}) {
  await exigirRol(ROLES.ADMINISTRADOR);

  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vista_auditoria")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(200);

  if (params.entidad) {
    query = query.ilike("entidad", `%${params.entidad}%`);
  }
  if (params.accion) {
    query = query.eq("accion", params.accion);
  }
  if (params.usuario) {
    query = query.or(`usuario_email.ilike.%${params.usuario}%,usuario_nombre.ilike.%${params.usuario}%`);
  }
  if (params.desde) {
    query = query.gte("fecha", params.desde);
  }
  if (params.hasta) {
    query = query.lte("fecha", `${params.hasta}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de cambios en entidades sensibles. Filtrable por usuario, acción, entidad y fecha.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bitácora</CardTitle>
          <CardDescription>
            Vista con usuario, acción, entidad, fecha, valor anterior y valor nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-red-500">{error.message}</p>
          ) : (
            <AuditLogTable data={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
