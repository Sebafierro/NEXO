export type FilaError = {
  fila: number;
  motivo: string;
};

export type FilaAdvertencia = {
  fila: number;
  motivo: string;
};

export type ResultadoPrevisualizacion = {
  ok: boolean;
  totalFilas: number;
  errores: FilaError[];
  advertencias: FilaAdvertencia[];
  filas: Record<string, unknown>[];
  columnasDetectadas: string[];
  mensaje?: string;
};

export type ResultadoImportacion = {
  ok: boolean;
  mensaje: string;
  propietariosCreados: number;
  propietariosActualizados: number;
  propiedadesCreadas: number;
  propiedadesActualizadas: number;
  arrendatariosCreados: number;
  arrendatariosActualizados: number;
  contratosCreados: number;
  contratosActualizados: number;
  cuentasServiciosCreadas: number;
  cuentasServiciosActualizadas: number;
  errores: FilaError[];
  advertencias: FilaAdvertencia[];
};
