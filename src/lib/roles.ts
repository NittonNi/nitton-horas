import type { Enums } from "@/lib/database.types"

/**
 * Roles dentro de un espacio de trabajo. Vive aparte de `sesión.ts` a
 * proposito: eso es código de servidor (lee cookies) y esto lo necesitan
 * también los componentes de cliente.
 */
export type Rol = Enums<"user_role">

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Administrador",
  manager: "Responsable",
  member: "Miembro",
}

/** Admin o responsable: ven las horas de todo el equipo y los importes. */
export function veTodo(rol: Rol) {
  return rol === "admin" || rol === "manager"
}

export function esAdmin(rol: Rol) {
  return rol === "admin"
}
