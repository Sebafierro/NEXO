const formato = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
});

export function formatearMoneda(valor: number) {
  return formato.format(valor);
}

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const formatoFechaCorta = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

// Fechas que llegan como `date` de Postgres ("2026-10-01") o ISO completo.
export function formatearFecha(valor: string) {
  return formatoFecha.format(new Date(valor));
}

export function formatearFechaCorta(valor: string) {
  return formatoFechaCorta.format(new Date(valor));
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function nombreMes(fecha: Date) {
  return MESES[fecha.getMonth()];
}