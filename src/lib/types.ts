// Tipos derivados de la base de datos (Database.types).
import type { Database } from "./supabase/database.types";
import type { Rol } from "./roles";

type TRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type EstadoPropiedad = "DISPONIBLE" | "ARRENDADA" | "EN_MANTENIMIENTO" | "INACTIVA";

// Estados del CHECK obligaciones_estado_check (03_mvp.sql).
// VENCIDA es el estado canonico de mora; ATRASADA es legado (se normaliza en
// 05_ciclo_financiero.sql) y solo se tolera en lecturas defensivas.
export type EstadoObligacion =
  | "PENDIENTE"
  | "PAGO_PARCIAL"
  | "PAGADA"
  | "VENCIDA"
  | "ATRASADA"
  | "EN_REVISION";

export type Usuario = Omit<TRow<"usuarios">, "rol"> & {
  rol: Rol | string;
};

export type Propiedad = TRow<"propiedades">;

export type Propietario = TRow<"propietarios">;

export type Arrendatario = TRow<"arrendatarios">;
