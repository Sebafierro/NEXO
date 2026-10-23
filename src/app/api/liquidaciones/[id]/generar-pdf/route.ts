import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { generarPDFLiquidacion } from "@/lib/pdf/liquidacion";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await exigirRol(ROLES.ADMINISTRADOR, ROLES.EJECUTIVO);
  const supabase = await createClient();
  const { id } = await params;

  const { data: liquidacion } = await supabase
    .from("liquidaciones")
    .select("*, propietarios(nombres, apellidos), contratos(id)")
    .eq("id", id)
    .single();

  if (!liquidacion) {
    return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("liquidacion_items")
    .select("*")
    .eq("liquidacion_id", id);

  try {
    const liq = liquidacion as { periodo: string; propietarios?: { nombres?: string | null; apellidos?: string | null } | null; contrato_id: string; arriendo_bruto: number; comision: number; gastos: number; neto: number };
    const pdfBuffer = generarPDFLiquidacion({
      periodo: liq.periodo,
      propietario: `${liq.propietarios?.nombres || ""} ${liq.propietarios?.apellidos || ""}`.trim() || "Propietario",
      contratoId: liq.contrato_id,
      arriendoBruto: Number(liq.arriendo_bruto || 0),
      comision: Number(liq.comision || 0),
      gastos: Number(liq.gastos || 0),
      neto: Number(liq.neto || 0),
      items: (items || []).map((i) => {
        const item = i as { concepto: string; monto: number; tipo: string; signo?: number };
        return { concepto: item.concepto, monto: Number(item.monto || 0), tipo: item.tipo, signo: item.signo };
      }),
    });

    const filename = `liquidaciones/${id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("respaldos")
      .upload(filename, new Uint8Array(pdfBuffer), { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      const pdfUrl = "/placeholder-liquidacion.pdf";
      await supabase.from("liquidaciones").update({ pdf_url: pdfUrl }).eq("id", id);
      return NextResponse.json({ url: pdfUrl });
    }

    // El bucket es privado: se guarda la RUTA interna; la descarga se firma.
    await supabase.from("liquidaciones").update({ pdf_url: filename }).eq("id", id);
    return NextResponse.json({ url: `/api/liquidaciones/${id}/pdf`, storage_path: filename });
  } catch {
    const pdfUrl = "/placeholder-liquidacion.pdf";
    await supabase.from("liquidaciones").update({ pdf_url: pdfUrl }).eq("id", id);
    return NextResponse.json({ url: pdfUrl });
  }
}
