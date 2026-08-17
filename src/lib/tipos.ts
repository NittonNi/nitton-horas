import type { Enums, Tables } from "@/lib/database.types"
import type { Rol } from "@/lib/roles"

export type Perfil = Tables<"profiles">
export type Espacio = Tables<"workspaces">

/** Un espacio al que pertenezco, con el rol que tengo alli. */
export type Pertenencia = { espacio: Espacio; rol: Rol }

export type Sesion = {
  perfil: Perfil
  espacio: Espacio
  rol: Rol
  /** Todos a los que pertenezco, para el selector de la cabecera. */
  espacios: Pertenencia[]
}

export type Cliente = Tables<"clients">
export type Proyecto = Tables<"projects">
export type Tarea = Tables<"tasks">
export type Etiqueta = Tables<"tags">
export type Entrada = Tables<"time_entries">
export type Tarifa = Tables<"rates">
export type Invitacion = Tables<"invitations">

/** Una persona dentro de un espacio concreto: su perfil mas su rol alli. */
export type Miembro = {
  id: string
  full_name: string
  email: string
  role: Enums<"user_role">
  active: boolean
}

/** Fila de la vista v_entries, con los campos ya no nulos donde el SQL lo garantiza. */
export type EntradaVista = {
  id: string
  workspace_id: string
  user_id: string
  user_name: string
  project_id: string | null
  project_name: string | null
  project_color: string | null
  client_id: string | null
  client_name: string | null
  task_id: string | null
  task_name: string | null
  description: string
  start_at: string
  end_at: string | null
  local_date: string
  duration_seconds: number | null
  hours: number | null
  billable: boolean
  locked: boolean
  tags: string[]
  amount: number | null
}

export type ProyectoConCliente = Proyecto & {
  clients: Pick<Cliente, "id" | "name"> | null
}

/** Catalogo que necesita el selector de proyecto/tarea/etiqueta. */
export type Catalogo = {
  clientes: Cliente[]
  proyectos: ProyectoConCliente[]
  tareas: Tarea[]
  etiquetas: Etiqueta[]
}

export type EntradaEnMarcha = {
  id: string
  workspace_id: string
  project_id: string | null
  task_id: string | null
  description: string
  start_at: string
  billable: boolean
  proyecto: { id: string; name: string; color: string; cliente: string | null } | null
  tarea: { id: string; name: string } | null
  tagIds: string[]
}

/** Lo que hace falta para arrancar o guardar una entrada. */
export type BorradorEntrada = {
  project_id: string | null
  task_id: string | null
  description: string
  billable: boolean
  tagIds: string[]
}

export const BORRADOR_VACIO: BorradorEntrada = {
  project_id: null,
  task_id: null,
  description: "",
  billable: false,
  tagIds: [],
}

/**
 * Colores de proyecto: una rueda completa pero toda a la misma saturacion y
 * luminosidad, para que ninguno grite mas que los demas y todos se lean igual
 * de bien sobre papel claro y sobre oscuro. Se evita el naranja de la senal.
 */
export const COLORES_PROYECTO = [
  "#3d6fb4",
  "#2f7fa6",
  "#2e8481",
  "#3f8558",
  "#6d8a34",
  "#9a7b22",
  "#9c5a2c",
  "#b24a3e",
  "#a34468",
  "#7b5aa6",
  "#566b85",
  "#7a6a5d",
] as const

/** Husos con los que trabaja la gente que va a usar esto. */
export const ZONAS_HORARIAS = [
  "Europe/Madrid",
  "Atlantic/Canary",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Mexico_City",
  "America/Bogota",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "UTC",
] as const
