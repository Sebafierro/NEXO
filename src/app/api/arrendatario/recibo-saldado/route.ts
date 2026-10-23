import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET() {
  await exigirRol(ROLES.ARRENDATARIO);
  const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/placeholder-recibo-saldado.pdf`;
  return NextResponse.json({ url: pdfUrl });
}
