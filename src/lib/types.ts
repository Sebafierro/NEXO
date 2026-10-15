// Tipos de filas de la base de datos (espejo de supabase/backend_setup.sql)
// TODO: en el futuro, generar con `supabase gen types typescript` para tener
// la tipificación completa del schema.

import type { Rol } from "./roles";

export type EstadoPropiedad = "DISPONIBLE" | "ARRENDADA" | "EN_MANTENIMIENTO" | "INACTIVA";

export type EstadoObligacion = "PENDIENTE" | "PAGADA" | "ATRASADA";

export type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  rol: Rol | string;
};

export type Propiedad = {
  id: string;
  propietario_id: string;
  nombre: string | null;
  direccion: string;
  comuna: string | null;
  tipo: string;
  estado: EstadoPropiedad;
  valor_arriendo: number;
};

export type Propietario = {
  id: string;
  user_id: string | null;
  rut: string | null;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  estado: "ACTIVO" | "INACTIVO";
};

// El vínculo user_id lo agrega supabase/02_roles_extension.sql y es lo que
// permite que el portal del ARRENDATARIO vea sus obligaciones y pagos vía RLS.
export type Arrendatario = {
  id: string;
  user_id: string | null;
  rut: string | null;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  estado: "ACTIVO" | "INACTIVO";
};
