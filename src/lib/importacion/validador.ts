import type { FilaError, FilaAdvertencia } from "./types";

export function validarFilas(filas: Record<string, unknown>[]): {
  errores: FilaError[];
  advertencias: FilaAdvertencia[];
} {
  const errores: FilaError[] = [];
  const advertencias: FilaAdvertencia[] = [];

  filas.forEach((fila, idx) => {
    const filaNum = idx + 2; // considerando cabecera
    const direccion = String(fila.DIRECCION || "").trim();
    const arriendo = fila.ARRIENDO;

    if (!direccion) {
      errores.push({ fila: filaNum, motivo: "Columna requerida faltante o vacía: DIRECCIÓN" });
      return;
    }

    if (arriendo !== undefined && arriendo !== null && arriendo !== "") {
      const str = String(arriendo).toString().replace(/\./g, "").replace(/,/g, ".");
      const num = Number(str);
      if (Number.isNaN(num) || num < 0) {
        errores.push({ fila: filaNum, motivo: "ARRIENDO debe ser un número válido mayor o igual a 0" });
        return;
      }
    }
  });

  return { errores, advertencias };
}
