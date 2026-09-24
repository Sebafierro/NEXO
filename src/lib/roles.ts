export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  PROPIETARIO: "PROPIETARIO",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ROLES_VALIDOS: Rol[] = [ROLES.ADMINISTRADOR, ROLES.PROPIETARIO];

export const DASHBOARD_POR_ROL: Record<Rol, string> = {
  [ROLES.ADMINISTRADOR]: "/admin",
  [ROLES.PROPIETARIO]: "/propietario",
};

// Rutas protegidas y qué roles pueden acceder a ellas.
export const RUTAS_PERMITIDAS: Record<string, Rol[]> = {
  "/admin": [ROLES.ADMINISTRADOR],
  "/propietario": [ROLES.ADMINISTRADOR, ROLES.PROPIETARIO],
};

export function normalizarRol(valor: unknown): Rol {
  if (typeof valor === "string" && valor in ROLES) return valor as Rol;
  return ROLES.PROPIETARIO;
}