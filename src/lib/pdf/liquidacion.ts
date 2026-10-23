import { jsPDF } from "jspdf";

export function generarPDFLiquidacion(data: {
  periodo: string;
  propietario: string;
  contratoId: string;
  arriendoBruto: number;
  comision: number;
  gastos: number;
  neto: number;
  items: Array<{ concepto: string; monto: number; tipo: string; signo?: number }>;
}) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text("NEXO", 20, 20);
  doc.setFontSize(12);
  doc.text("LIQUIDACIÓN DE ARRIENDO", 20, 28);
  
  // Info
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-CL")}`, 150, 20);
  doc.text(`Periodo: ${data.periodo?.slice(0, 7)}`, 20, 45);
  doc.text(`Propietario: ${data.propietario}`, 20, 52);
  doc.text(`Contrato ID: ${data.contratoId}`, 20, 59);
  
  // Line separator
  doc.line(20, 65, 190, 65);
  
  // Detail
  let y = 75;
  doc.setFontSize(11);
  doc.text("DETALLE DE LIQUIDACIÓN", 20, y);
  y += 10;
  doc.setFontSize(9);
  
  for (const item of data.items || []) {
    const concepto = item.concepto.substring(0, 70);
    const monto = Number(item.monto || 0);
    const signo = item.signo !== undefined ? item.signo : (monto >= 0 ? 1 : -1);
    const valor = signo >= 0 ? monto : -monto;
    doc.text(concepto, 20, y);
    if (signo >= 0) {
      doc.text(`$${valor.toLocaleString("es-CL")}`, 170, y, { align: "right" });
    } else {
      doc.text(`-$${valor.toLocaleString("es-CL")}`, 170, y, { align: "right" });
    }
    y += 6;
    if (y > 250) {
      doc.addPage();
      y = 30;
    }
  }
  
  doc.line(20, y + 2, 190, y + 2);
  y += 12;
  
  // Totals
  doc.setFontSize(10);
  doc.text("Arriendo bruto:", 20, y);
  doc.text(`$${Number(data.arriendoBruto).toLocaleString("es-CL")}`, 170, y, { align: "right" });
  y += 7;
  
  doc.text("Comisión:", 20, y);
  doc.text(`-$${Number(data.comision).toLocaleString("es-CL")}`, 170, y, { align: "right" });
  y += 7;
  
  doc.text("Gastos / Reparaciones:", 20, y);
  doc.text(`-$${Number(data.gastos).toLocaleString("es-CL")}`, 170, y, { align: "right" });
  y += 12;
  
  doc.line(20, y - 2, 190, y - 2);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NETO A PAGAR:", 20, y + 4);
  doc.text(`$${Number(data.neto).toLocaleString("es-CL")}`, 170, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  
  // Footer
  doc.setFontSize(8);
  doc.text("NEXO - Gestión Inmobiliaria", 20, 280);
  doc.text("Este documento es una liquidación generada por el sistema.", 20, 285);
  
  return doc.output("arraybuffer");
}

export function generarPDFReciboSaldado(data: {
  arrendatarioNombre?: string;
  contratoId?: string;
  fecha?: string;
}) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("NEXO", 20, 20);
  doc.setFontSize(14);
  doc.text("COMPROBANTE DE PERÍODO SALDADO SIN DEUDA", 20, 30);
  
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${data.fecha || new Date().toLocaleDateString("es-CL")}`, 20, 50);
  if (data.arrendatarioNombre) {
    doc.text(`Arrendatario: ${data.arrendatarioNombre}`, 20, 57);
  }
  if (data.contratoId) {
    doc.text(`Contrato: ${data.contratoId}`, 20, 64);
  }
  
  doc.line(20, 75, 190, 75);
  
  let y = 90;
  doc.setFontSize(11);
  doc.text("CONSTANCIA", 20, y);
  y += 12;
  doc.setFontSize(10);
  const texto = [
    "Se deja constancia que a la fecha de emisión, el arrendatario",
    "se encuentra al día con todas sus obligaciones de arriendo,",
    "sin deuda pendiente ni saldos vencidos.",
    "",
    "El presente comprobante se emite a solicitud del interesado",
    "para los fines que estime convenientes."
  ];
  for (const linea of texto) {
    doc.text(linea, 20, y);
    y += 7;
  }
  
  doc.line(20, 200, 80, 200);
  doc.text("Firma y Timbre NEXO", 20, 210);
  
  doc.setFontSize(8);
  doc.text("NEXO - Gestión Inmobiliaria", 20, 280);
  
  return doc.output("arraybuffer");
}
