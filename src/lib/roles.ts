export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  EJECUTIVO: "EJECUTIVO",
  PROPIETARIO: "PROPIETARIO",
  ARRENDATARIO: "ARRENDATARIO",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ROLES_VALIDOS: Rol[] = [
  ROLES.ADMINISTRADOR,
  ROLES.EJECUTIVO,
  ROLES.PROPIETARIO,
  ROLES.ARRENDATARIO,
];

// ROL_DEFAULT: usado cuando el JWT no trae rol válido (p. ej. invitaciones old).
export const ROL_DEFAULT: Rol = ROLES.PROPIETARIO;

// Texto legible para UI (sidebar, chips de perfil, etc).
export const ETIQUETA_ROL: Record<Rol, string> = {
  [ROLES.ADMINISTRADOR]: "Administrador",
  [ROLES.EJECUTIVO]: "Ejecutivo",
  [ROLES.PROPIETARIO]: "Propietario",
  [ROLES.ARRENDATARIO]: "Arrendatario",
};

export const DASHBOARD_POR_ROL: Record<Rol, string> = {
  [ROLES.ADMINISTRADOR]: "/admin",
  [ROLES.EJECUTIVO]: "/ejecutivo",
  [ROLES.PROPIETARIO]: "/propietario",
  [ROLES.ARRENDATARIO]: "/arrendatario",
};

// Rutas protegidas y qué roles pueden acceder a ellas.
// El Proxy (src/proxy.ts) bloquea la navegación por rol usando este mapa.
export const RUTAS_PERMITIDAS: Record<string, Rol[]> = {
  "/admin": [ROLES.ADMINISTRADOR],
  "/ejecutivo": [ROLES.EJECUTIVO, ROLES.ADMINISTRADOR],
  "/propietario": [ROLES.ADMINISTRADOR, ROLES.PROPIETARIO],
  "/arrendatario": [ROLES.ADMINISTRADOR, ROLES.ARRENDATARIO],
};

export function normalizarRol(valor: unknown): Rol {
  if (typeof valor === "string" && valor in ROLES) return valor as Rol;
  return ROL_DEFAULT;
}

export function esRol(valor: unknown, rol: Rol): boolean {
  return normalizarRol(valor) === rol;
}

// ADMINISTRADOR y EJECUTIVO operan la cartera; PROPIETARIO y ARRENDATARIO son usuarios finales.
export function esRolInterno(rol: Rol): boolean {
  return rol === ROLES.ADMINISTRADOR || rol === ROLES.EJECUTIVO;
}