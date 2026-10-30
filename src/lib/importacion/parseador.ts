import { parse as parseCsv } from "csv-parse/sync";

export type ParsedSheet = {
  columnas: string[];
  filas: Record<string, unknown>[];
};

function normalizarNombre(col: string): string {
  if (col === null || col === undefined) return "";
  return col
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function normalizarClave(col: string): string {
  const n = normalizarNombre(col);
  if (!n) return "COL_VACIA";
  // Mapear variantes comunes
  if (n === "DIRECCION" || n === "DIRECCIN" || n === "DOMICILIO" || n.includes("DIRECCION")) return "DIRECCION";
  if (n === "N°" || n === "NRO" || n === "NUMERO" || n === "N") return "NRO";
  if (n === "ESTADO") return "ESTADO";
  if (n === "ARRIENDO" || n === "MONTO_ARRIENDO" || n === "VALOR_ARRIENDO" || n === "RENTA") return "ARRIENDO";
  if (n === "GARANTIA" || n === "GARANTIA_MESES" || n === "DEPOSITO") return "GARANTIA";
  if (n === "PROPIETARIO" || n === "NOMBRE_PROPIETARIO" || n === "PROPIETARIO_NOMBRES") return "PROPIETARIO";
  if (n === "ARRENDATARIO" || n === "INQUILINO" || n === "NOMBRE_ARRENDATARIO" || n === "ARRIENDATARIO") return "ARRENDATARIO";
  if (n === "RUT_PROPIETARIO") return "RUT_PROPIETARIO";
  if (n === "RUT_ARRENDATARIO") return "RUT_ARRENDATARIO";
  if (n === "FECHA_INICIO") return "FECHA_INICIO";
  if (n === "FECHA_TERMINO") return "FECHA_TERMINO";
  if (n === "COMISION" || n === "COMISION_PORCENTAJE") return "COMISION_PORCENTAJE";
  if (n === "DIA_VENCIMIENTO") return "DIA_VENCIMIENTO";
  if (n === "CUENTA_SERVICIO" || n === "NUMERO_CLIENTE") return "NUMERO_CLIENTE";
  if (n === "TIPO_SERVICIO") return "TIPO_SERVICIO";
  if (n === "EMPRESA") return "EMPRESA";
  if (n === "LLF") return "LLF";
  if (n === "LUZ") return "LUZ";
  if (n === "AGUA") return "AGUA";
  if (n.includes("G.COMUNES") || n.includes("GGCC") || n.includes("GASTOS_COMUNES")) return "GASTOS_COMUNES";
  if (n === "OTROS") return "OTROS";
  if (n === "DESCUENTOS") return "DESCUENTOS";
  if (n.includes("RUT")) return "RUT";
  return n.replace(/[^A-Z0-9_]/g, "_");
}

export function parseCsvBuffer(buffer: Buffer | string): ParsedSheet {
  const content = typeof buffer === "string" ? buffer : buffer.toString("utf-8");
  const records = parseCsv(content, {
    columns: (header: string[]) => header.map((h) => normalizarClave(h)),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) {
    return { columnas: [], filas: [] };
  }
  // Filtrar filas completamente vacías o con columnas basura
  const filasFiltradas = records.filter((r) => {
    const valores = Object.values(r);
    const tieneValorReal = valores.some((v) => v !== null && v !== undefined && String(v).trim() !== "");
    // Si la única clave es COL_VACIA y no hay otros datos útiles
    const keys = Object.keys(r);
    if (keys.length === 1 && keys[0] === "COL_VACIA") return false;
    if (keys.length === 1 && keys[0] === "") return false;
    return tieneValorReal;
  });
  if (filasFiltradas.length === 0) {
    return { columnas: Object.keys(records[0] || {}), filas: [] };
  }
  const columnas = Object.keys(filasFiltradas[0]);
  return { columnas, filas: filasFiltradas };
}

export function parseExcelBuffer(buffer: Buffer): ParsedSheet {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { columnas: [], filas: [] };
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];
    if (json.length === 0) return { columnas: [], filas: [] };
    // Normalizar claves
    const filasNormalizadas = json.map((row) => {
      const nuevo: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        nuevo[normalizarClave(k)] = v;
      }
      return nuevo;
    }).filter((r) => {
      const valores = Object.values(r);
      const tieneValorReal = valores.some((v) => v !== null && v !== undefined && String(v).trim() !== "");
      const keys = Object.keys(r);
      if (keys.length === 1 && (keys[0] === "COL_VACIA" || keys[0] === "")) return false;
      return tieneValorReal;
    });
    if (filasNormalizadas.length === 0) return { columnas: [], filas: [] };
    const columnas = Object.keys(filasNormalizadas[0] || {});
    return { columnas, filas: filasNormalizadas };
  } catch (e) {
    throw new Error("No se pudo parsear archivo Excel (.xlsx). Verifique el paquete xlsx.");
  }
}

export function parsearArchivo(buffer: Buffer, nombreArchivo: string): ParsedSheet {
  const nombreLower = nombreArchivo.toLowerCase();
  if (nombreLower.endsWith(".csv")) {
    return parseCsvBuffer(buffer);
  }
  if (nombreLower.endsWith(".xlsx") || nombreLower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }
  // Intentar detectar por contenido
  const contenido = buffer.toString("utf-8", 0, Math.min(buffer.length, 400));
  if (contenido.includes(",") || contenido.includes(";")) {
    try {
      return parseCsvBuffer(buffer);
    } catch {
      // seguir
    }
  }
  throw new Error("Formato de archivo no soportado. Use .xlsx o .csv");
}
