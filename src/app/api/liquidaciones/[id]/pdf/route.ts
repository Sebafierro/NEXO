import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { urlFirmada } from "@/lib/storage";

// Descarga del PDF de la liquidación. El bucket "respaldos" es privado, así que
// este handler firma una URL temporal y redirige a ella. Acepta tanto la ruta
// interna guardada por las acciones de aprobación como una URL legada.
//
// La lectura de la liquidación usa el cliente del usuario (RLS): un PROPIETARIO
// solo ve sus propias liquidaciones, por lo que si no es suya el SELECT no
// devuelve fila (404). La FIRMA en cambio usa el cliente admin porque la
// política de Storage solo permite rutas "{uid}/..." y los PDFs viven en
// "liquidaciones/..."; la autorización ya quedó validada por el SELECT.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO, ROLES.PROPIETARIO);
  const supabase = await createClient();
  const { id } = await params;

  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("id, pdf_url, estado")
    .eq("id", id)
    .single();

  if (!liquidacion) {
    return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const firmada = await urlFirmada(admin, liquidacion.pdf_url);
  if (firmada) {
    return NextResponse.redirect(firmada);
  }

  // Sin PDF generable todavía (o placeholder): se comunica al cliente.
  return NextResponse.json(
    { url: null, estado: liquidacion.estado, mensaje: "PDF no disponible todavía" },
    { status: 202 },
  );
}
