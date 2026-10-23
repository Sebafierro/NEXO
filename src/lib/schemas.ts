import { z } from "zod";

// RUT chileno simple (no ceros, sin puntos, con guion opcional al final)
export const rutSchema = z.string().regex(/^[0-9]{1,8}-?[0-9kK]$/, "RUT inválido");

export const idUuid = z.string().uuid();

export const emailSchema = z.string().email("Email inválido");

export const montoSchema = z.coerce.number().min(0, "Monto debe ser mayor o igual a 0");

export const fechaSchema = z.string();

export const booleanSchema = z.boolean().default(true);

export const propiedadesSchema = z.object({
  propietario_id: idUuid,
  nombre: z.string().nullable().optional(),
  direccion: z.string().min(1, "Dirección requerida"),
  comuna: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  tipo: z.enum(["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "OTRO"]).default("DEPARTAMENTO"),
  estado: z.enum(["DISPONIBLE", "ARRENDADA", "EN_MANTENIMIENTO", "INACTIVA"]).default("DISPONIBLE"),
  superficie_m2: z.coerce.number().nullable().optional(),
  habitaciones: z.coerce.number().int().nullable().optional(),
  banos: z.coerce.number().int().nullable().optional(),
  estacionamientos: z.coerce.number().int().nullable().optional(),
  valor_arriendo: montoSchema.default(0),
});

export const propietariosSchema = z.object({
  user_id: idUuid.nullable().optional(),
  rut: rutSchema.nullable().optional(),
  nombres: z.string().min(1, "Nombres requeridos"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  telefono: z.string().nullable().optional(),
  email: emailSchema.nullable().optional(),
  direccion: z.string().nullable().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
});

export const arrendatariosSchema = z.object({
  user_id: idUuid.nullable().optional(),
  rut: rutSchema.nullable().optional(),
  nombres: z.string().min(1, "Nombres requeridos"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  telefono: z.string().nullable().optional(),
  email: emailSchema.nullable().optional(),
  direccion: z.string().nullable().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
});

export const contratosSchema = z.object({
  propiedad_id: idUuid,
  arrendatario_id: idUuid,
  fecha_inicio: fechaSchema,
  fecha_termino: fechaSchema.nullable().optional(),
  valor_arriendo: montoSchema,
  garantia_meses: z.coerce.number().int().min(0).default(1),
  // Dia del mes (1-28) de vencimiento mensual; ver 05_ciclo_financiero.sql.
  dia_vencimiento: z.coerce.number().int().min(1).max(28).default(5),
  comision_porcentaje: z.coerce.number().min(0).max(100).default(0),
  estado: z.enum(["BORRADOR", "VIGENTE", "FINALIZADO", "RESCINDIDO"]).default("BORRADOR"),
});

export const cuentasServiciosSchema = z.object({
  propiedad_id: idUuid,
  tipo_servicio: z.enum(["AGUA", "ELECTRICIDAD", "GAS", "GASTOS_COMUNES", "INTERNET", "OTRO"]).default("AGUA"),
  empresa: z.string().min(1, "Empresa requerida"),
  numero_cliente: z.string().min(1, "Número de cliente requerido"),
  numero_cuenta: z.string().nullable().optional(),
  // Monto mensual esperado; null => la cuenta no genera obligacion (ver
  // 05_ciclo_financiero.sql).
  monto_mensual: montoSchema.nullable().optional(),
  activo: booleanSchema,
});

export type PropiedadesInput = z.infer<typeof propiedadesSchema>;
export type PropietariosInput = z.infer<typeof propietariosSchema>;
export type ArrendatariosInput = z.infer<typeof arrendatariosSchema>;
export type ContratosInput = z.infer<typeof contratosSchema>;
export type CuentasServiciosInput = z.infer<typeof cuentasServiciosSchema>;

export const propietarioSchema = propietariosSchema;
export const arrendatarioSchema = arrendatariosSchema;
export const contratoSchema = contratosSchema;
export const cuentaServicioSchema = cuentasServiciosSchema;
