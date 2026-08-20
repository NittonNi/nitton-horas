import { createClient } from "@/lib/supabase/server"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"

/**
 * Todo lo de aquí va filtrado por espacio de trabajo. La RLS ya lo impide por
 * su cuenta, pero el filtro explicito evita traer de más y deja claro, leyendo
 * el código, que ninguna consulta se sale de su espacio.
 */

export async function cargarCatalogo(
  espacioId: string,
  incluirArchivados = false,
): Promise<Catalogo> {
  const supabase = await createClient()

  const [proyectos, tareas, etiquetas, categorias, ediciones] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", espacioId)
        .order("name"),
      supabase.from("tasks").select("*").eq("workspace_id", espacioId).order("name"),
      supabase.from("tags").select("*").eq("workspace_id", espacioId).order("name"),
      supabase
        .from("categories")
        .select("*")
        .eq("workspace_id", espacioId)
        .order("position")
        .order("name"),
      supabase
        .from("project_editions")
        .select("*")
        .eq("workspace_id", espacioId)
        .order("position")
        .order("name"),
    ])

  const vivo = <T extends { archived: boolean }>(filas: T[] | null) =>
    (filas ?? []).filter((f) => incluirArchivados || !f.archived)

  return {
    proyectos: vivo(proyectos.data),
    tareas: vivo(tareas.data),
    etiquetas: vivo(etiquetas.data),
    categorias: vivo(categorias.data),
    ediciones: vivo(ediciones.data),
  }
}

/** Entradas entre dos fechas (inclusive), de la más reciente a la más antigua. */
export async function cargarEntradas(opciones: {
  espacioId: string
  desde: string
  hasta: string
  userId?: string
  projectId?: string
  limite?: number
}): Promise<EntradaVista[]> {
  const supabase = await createClient()

  let consulta = supabase
    .from("v_entries")
    .select("*")
    .eq("workspace_id", opciones.espacioId)
    .gte("local_date", opciones.desde)
    .lte("local_date", opciones.hasta)
    .order("start_at", { ascending: false })

  if (opciones.userId) consulta = consulta.eq("user_id", opciones.userId)
  if (opciones.projectId) consulta = consulta.eq("project_id", opciones.projectId)
  if (opciones.limite) consulta = consulta.limit(opciones.limite)

  const { data, error } = await consulta
  if (error) throw error

  return (data ?? []) as EntradaVista[]
}

/** Horas que otra persona ha apuntado contando conmigo, sin contestar todavía. */
export async function cargarPropuestas(espacioId: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("mis_invitaciones", { p_workspace: espacioId })
  return data ?? []
}

/** El equipo de un espacio, con el rol que tiene cada uno allí. */
export async function cargarMiembros(espacioId: string): Promise<Miembro[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("workspace_members")
    .select("role, active, profiles(id, full_name, email)")
    .eq("workspace_id", espacioId)

  return (data ?? [])
    .flatMap((fila) =>
      fila.profiles
        ? [
            {
              id: fila.profiles.id,
              full_name: fila.profiles.full_name,
              email: fila.profiles.email,
              role: fila.role,
              active: fila.active,
            },
          ]
        : [],
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
}

/** Si esta persona ya trajo su Google Calendar. Es por persona, no por espacio. */
export async function estaConectadoGoogle(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("google_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()
  return data !== null
}
