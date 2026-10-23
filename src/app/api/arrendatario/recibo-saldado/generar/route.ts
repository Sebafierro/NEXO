import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { generarPDFReciboSaldado } from "@/lib/pdf/liquidacion";
import { urlFirmada } from "@/lib/storage";

export async function GET() {
  await exigirRol(ROLES.ARRENDATARIO);
  const supabase = await createClient();

  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;

  const { data: arrendatario } = await supabase
    .from("arrendatarios")
    .select("id, nombres, apellidos")
    .eq("user_id", userId || "")
    .maybeSingle() as { data: { id?: string; nombres?: string | null; apellidos?: string | null } | null };

  // El recibo Cubre los contratos del propio arrendatario autenticado.
  let contratoIds: string[] = [];
  if (arrendatario?.id) {
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id")
      .eq("arrendatario_id", arrendatario.id);
    contratoIds = (contratos || []).map((c) => c.id);
  }

  const contratoId: string | undefined = contratoIds[0];

  if (contratoIds.length > 0) {
    const { data: obligaciones } = await supabase
      .from("obligaciones")
      .select("id, estado, saldo")
      .in("contrato_id", contratoIds)
      .limit(500);

    const tienePendientes = (obligaciones || []).some((o) => {
      const obligacion = o as { estado?: string | null; saldo?: number | null };
      const saldo = Number(obligacion.saldo || 0);
      return !(obligacion.estado === "PAGADA" || saldo <= 0);
    });

    if (tienePendientes) {
      return NextResponse.json({ error: "Existen obligaciones pendientes. Solo disponible cuando el período está saldado sin deuda." }, { status: 400 });
    }
  } else {
    // Sin contratos asociados no hay estado de cuenta que certificar.
    return NextResponse.json(
      { error: "No tienes contratos asociados para emitir un recibo de saldo." },
      { status: 400 },
    );
  }

  try {
    const pdfBuffer = generarPDFReciboSaldado({
      arrendatarioNombre: arrendatario ? `${arrendatario.nombres || ""} ${arrendatario.apellidos || ""}`.trim() : undefined,
      contratoId: contratoId,
      fecha: new Date().toLocaleDateString("es-CL"),
    });

    // El bucket es privado y la política de Storage del ARRENDATARIO solo permite
    // rutas "{uid}/...", así que la carga/firma del recibo (path "recibos/...")
    // usa el cliente admin. La autorización ya se validó arriba con el cliente
    // del usuario (RLS): solo llega aquí quien tiene contratos y sin deuda.
    const admin = createAdminClient();

    const filename = `recibos/recibo-saldado-${Date.now()}-${contratoId || "sin-contrato"}.pdf`;
    const { error } = await admin.storage.from("respaldos").upload(filename, new Uint8Array(pdfBuffer), {
      contentType: "application/pdf",
      upsert: true,
    });

    if (error) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.redirect(new URL("/placeholder-recibo-saldado.pdf", baseUrl));
    }

    // Bucket privado: se firma una URL temporal para el redirect de descarga.
    const firmada = await urlFirmada(admin, filename, "respaldos", 120);
    if (!firmada) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.redirect(new URL("/placeholder-recibo-saldado.pdf", baseUrl));
    }
    return NextResponse.redirect(firmada);
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/placeholder-recibo-saldado.pdf", baseUrl));
  }
}

export async function POST() {
  return GET();
}
